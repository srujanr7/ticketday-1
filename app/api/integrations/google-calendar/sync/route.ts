import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { userId, calendarId } = await request.json()

    if (!userId || !calendarId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get the user's Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("type", "googleCalendar")
      .eq("user_id", userId)
      .eq("connected", true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: "Google Calendar integration not found" }, { status: 404 })
    }

    // Use the user's Google Calendar credentials
    const googleCalendarApiKey = integration.config.apiKey
    const googleCalendarId = integration.config.calendarId || calendarId

    if (!googleCalendarApiKey || !googleCalendarId) {
      return new Response("Google Calendar credentials not configured", { status: 500 })
    }

    // Get access token from the request or from stored credentials
    const accessToken = integration.config.accessToken

    // In a real app, you would use the accessToken to fetch events from Google Calendar API
    // For this example, we'll simulate the sync process

    // 1. Get the user's Google Calendar integration
    // const { data: integration, error: integrationError } = await supabase
    //   .from("integrations")
    //   .select("id, project_id, config")
    //   .eq("type", "google_calendar")
    //   .eq("user_id", userId)
    //   .single()

    // if (integrationError) {
    //   return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    // }

    // 2. Fetch events from Google Calendar (simulated)
    const events = await fetchGoogleCalendarEvents(accessToken)

    // 3. Sync events to our database
    for (const event of events) {
      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("external_id", `gcal-${event.id}`)
        .single()

      if (existingEvent) {
        // Update existing event
        await supabase
          .from("events")
          .update({
            title: event.summary,
            description: event.description || "",
            date: event.start.date || event.start.dateTime.split("T")[0],
            time: event.start.dateTime ? event.start.dateTime.split("T")[1].substring(0, 5) : "",
            project_id: integration.id,
            type: determineEventType(event),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEvent.id)
      } else {
        // Create new event
        await supabase.from("events").insert({
          title: event.summary,
          description: event.description || "",
          date: event.start.date || event.start.dateTime.split("T")[0],
          time: event.start.dateTime ? event.start.dateTime.split("T")[1].substring(0, 5) : "",
          project_id: integration.id,
          type: determineEventType(event),
          external_id: `gcal-${event.id}`,
          external_url: event.htmlLink,
          created_by: userId,
          created_at: new Date().toISOString(),
        })
      }
    }

    // 4. Update last sync time
    await supabase
      .from("integrations")
      .update({
        config: {
          ...integration.config,
          last_sync: new Date().toISOString(),
        },
      })
      .eq("id", integration.id)

    return NextResponse.json({ success: true, synced_events: events.length })
  } catch (error) {
    console.error("Error syncing Google Calendar:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Simulated function to fetch events from Google Calendar
async function fetchGoogleCalendarEvents(accessToken: string) {
  // In a real app, you would use the Google Calendar API
  // For this example, we'll return mock data
  return [
    {
      id: "event1",
      summary: "Team Meeting",
      description: "Weekly team sync",
      start: {
        dateTime: "2024-04-10T10:00:00",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2024-04-10T11:00:00",
        timeZone: "UTC",
      },
      htmlLink: "https://calendar.google.com/event?id=event1",
    },
    {
      id: "event2",
      summary: "Client Presentation",
      description: "Present project progress to the client",
      start: {
        dateTime: "2024-04-15T14:00:00",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2024-04-15T15:30:00",
        timeZone: "UTC",
      },
      htmlLink: "https://calendar.google.com/event?id=event2",
    },
    {
      id: "event3",
      summary: "Project Deadline",
      description: "Final submission deadline",
      start: {
        date: "2024-04-30",
        timeZone: "UTC",
      },
      end: {
        date: "2024-04-30",
        timeZone: "UTC",
      },
      htmlLink: "https://calendar.google.com/event?id=event3",
    },
  ]
}

function determineEventType(event: any) {
  const title = event.summary.toLowerCase()

  if (title.includes("meeting") || title.includes("sync")) {
    return "meeting"
  } else if (title.includes("review") || title.includes("feedback")) {
    return "review"
  } else if (title.includes("presentation") || title.includes("demo")) {
    return "presentation"
  } else if (title.includes("planning") || title.includes("sprint")) {
    return "planning"
  } else {
    return "meeting" // Default type
  }
}

