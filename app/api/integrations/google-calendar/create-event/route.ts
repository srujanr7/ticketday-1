import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { eventId, userId } = await request.json()

    if (!eventId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        projects:project_id(name),
        event_attendees(user_id, users:user_id(email))
      `)
      .eq("id", eventId)
      .single()

    if (eventError) {
      console.error("Error fetching event:", eventError)
      return NextResponse.json({ error: "Failed to fetch event details" }, { status: 500 })
    }

    // Get Google Calendar integration details
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "googleCalendar")
      .eq("status", "connected")
      .single()

    if (integrationError) {
      console.error("Error fetching Google Calendar integration:", integrationError)
      return NextResponse.json({ error: "Google Calendar integration not found" }, { status: 404 })
    }

    // Format attendees
    const attendees =
      event.event_attendees?.map((attendee: any) => ({
        email: attendee.users?.email,
      })) || []

    // Format event for Google Calendar
    const startDateTime = new Date(`${event.date}T${event.time}`)
    const endDateTime = new Date(startDateTime.getTime() + (event.duration || 60) * 60000)

    const calendarEvent = {
      summary: event.title,
      description: `${event.description || ""}\n\nProject: ${event.projects?.name || ""}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "UTC",
      },
      attendees,
    }

    // In a real implementation, you would use the Google Calendar API to create the event
    // For this example, we'll simulate a successful creation

    // Update the event with Google Calendar ID
    const fakeGoogleCalendarId = `google_${Math.random().toString(36).substring(2, 15)}`

    const { error: updateError } = await supabase
      .from("events")
      .update({
        google_calendar_id: fakeGoogleCalendarId,
        synced_to_google: true,
      })
      .eq("id", eventId)

    if (updateError) {
      console.error("Error updating event with Google Calendar ID:", updateError)
      return NextResponse.json({ error: "Failed to update event with Google Calendar ID" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Event created in Google Calendar",
      googleCalendarId: fakeGoogleCalendarId,
    })
  } catch (error) {
    console.error("Error creating Google Calendar event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

