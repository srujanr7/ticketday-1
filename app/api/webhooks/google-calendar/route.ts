import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Get the calendar ID from the payload
    const calendarId = payload.calendarId || payload.calendar?.id

    if (!calendarId) {
      return new Response("Calendar ID missing from payload", { status: 400 })
    }

    // Find the integration for this calendar
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("user_id, config, project_id")
      .eq("type", "googleCalendar")
      .eq("connected", true)
      .filter("config->calendarId", "eq", calendarId)
      .single()

    if (integrationError || !integration) {
      return new Response("No matching Google Calendar integration found", { status: 404 })
    }

    // Use the user's Google Calendar credentials
    const apiKey = integration.config.apiKey
    const accessToken = integration.config.accessToken

    if (!apiKey && !accessToken) {
      return new Response("Google Calendar credentials not configured for this integration", { status: 500 })
    }

    // Process the calendar event
    const event = payload.event || payload
    await processCalendarEvent(event, integration)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Google Calendar webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processCalendarEvent(event: any, integration: any) {
  const userId = integration.user_id
  const projectId = integration.project_id

  // Check if this is a new event or an update
  const { data: existingEvent } = await supabase
    .from("events")
    .select("id")
    .eq("external_id", `gcal-${event.id}`)
    .single()

  const eventData = {
    title: event.summary,
    description: event.description || "",
    date: event.start.date || event.start.dateTime.split("T")[0],
    time: event.start.dateTime ? event.start.dateTime.split("T")[1].substring(0, 5) : null,
    duration: calculateDuration(event.start, event.end),
    location: event.location,
    project_id: projectId,
    external_id: `gcal-${event.id}`,
    external_url: event.htmlLink,
    type: determineEventType(event),
    attendees: event.attendees?.map((a: any) => a.email) || [],
    updated_at: new Date().toISOString(),
  }

  if (existingEvent) {
    // Update existing event
    await supabase.from("events").update(eventData).eq("id", existingEvent.id)
  } else {
    // Create new event
    await supabase.from("events").insert({
      ...eventData,
      created_by: userId,
      created_at: new Date().toISOString(),
    })

    // If this is a meeting, check if we need to create tasks
    if (eventData.type === "meeting") {
      await createTasksFromMeeting(eventData, userId, projectId)
    }
  }
}

function calculateDuration(start: any, end: any): number {
  if (!start || !end) return 60 // Default to 60 minutes

  const startTime = start.dateTime ? new Date(start.dateTime) : new Date(`${start.date}T00:00:00`)
  const endTime = end.dateTime ? new Date(end.dateTime) : new Date(`${end.date}T23:59:59`)

  return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
}

function determineEventType(event: any): string {
  const title = (event.summary || "").toLowerCase()

  if (title.includes("meeting") || title.includes("sync") || title.includes("call")) {
    return "meeting"
  } else if (title.includes("deadline") || title.includes("due")) {
    return "deadline"
  } else if (title.includes("reminder")) {
    return "reminder"
  } else {
    return "other"
  }
}

async function createTasksFromMeeting(event: any, userId: string, projectId: string) {
  // Check if the meeting title or description contains task-related keywords
  const text = `${event.title} ${event.description}`
  const taskKeywords = ["action item", "todo", "to-do", "task", "follow up", "followup"]

  if (taskKeywords.some((keyword) => text.toLowerCase().includes(keyword))) {
    // Create a task for this meeting
    await supabase.from("tasks").insert({
      title: `Follow-up: ${event.title}`,
      description: `Follow-up task created from meeting: ${event.title}\n\n${event.description || ""}`,
      status: "To Do",
      priority: "Medium",
      due_date: calculateFollowUpDate(event.date),
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
    })
  }
}

function calculateFollowUpDate(eventDate: string): string {
  const date = new Date(eventDate)
  date.setDate(date.getDate() + 1) // Set follow-up for the next day
  return date.toISOString().split("T")[0]
}

