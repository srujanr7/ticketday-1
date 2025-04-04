import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Get the team_id from the payload
    const teamId = payload.team_id

    if (!teamId) {
      return new Response("Team ID missing from payload", { status: 400 })
    }

    // Find the integration for this Slack team
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("user_id, config, project_id")
      .eq("type", "slack")
      .eq("connected", true)
      .filter("config->team_id", "eq", teamId)
      .single()

    if (integrationError || !integration) {
      return new Response("No matching Slack integration found", { status: 404 })
    }

    // Use the user's Slack credentials
    const slackToken = integration.config.apiKey
    const slackSigningSecret = integration.config.signingSecret

    if (!slackToken) {
      return new Response("Slack credentials not configured for this integration", { status: 500 })
    }

    // Verify the Slack request if signing secret is available
    if (slackSigningSecret) {
      const signature = request.headers.get("x-slack-signature")
      const timestamp = request.headers.get("x-slack-request-timestamp")
      const requestBody = await request.text()

      if (!verifySlackRequest(signature, timestamp, requestBody, slackSigningSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Handle different Slack event types
    if (payload.type === "url_verification") {
      // Respond to Slack's verification challenge
      return NextResponse.json({ challenge: payload.challenge })
    } else if (payload.type === "event_callback") {
      await handleSlackEvent(payload.event, integration)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Slack webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Verify Slack request signature
function verifySlackRequest(
  signature: string | null,
  timestamp: string | null,
  body: string,
  signingSecret: string,
): boolean {
  if (!signature || !timestamp) return false

  // Check if the timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - Number.parseInt(timestamp, 10)) > 300) {
    return false
  }

  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac("sha256", signingSecret)
  const computedSignature = `v0=${hmac.update(baseString).digest("hex")}`

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))
}

async function handleSlackEvent(event: any, integration: any) {
  const userId = integration.user_id
  const projectId = integration.project_id

  // Handle message events with task creation syntax
  if (event.type === "message" && event.text) {
    // Check if the message is a task creation request
    // Format: !task Project Name: Task title | Description
    const taskMatch = event.text.match(/!task\s+([^:]+):\s*([^|]+)(?:\|\s*(.+))?/)

    if (taskMatch) {
      const projectName = taskMatch[1].trim()
      const taskTitle = taskMatch[2].trim()
      const taskDescription = taskMatch[3] ? taskMatch[3].trim() : ""

      // Find the project by name
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .ilike("name", `%${projectName}%`)
        .limit(1)

      if (projectError || !projects || projects.length === 0) {
        console.error("No project found matching name:", projectName)
        return
      }

      const taskProjectId = projects[0].id

      // Create a new task
      await supabase.from("tasks").insert({
        title: taskTitle,
        description: taskDescription,
        status: "To Do",
        priority: "Medium",
        project_id: taskProjectId,
        external_id: `slack-msg-${event.ts}`,
        external_url: `https://slack.com/archives/${event.channel}/${event.ts}`,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
    }
  } else if (event.type === "reaction_added" && event.item.type === "message") {
    // Handle reactions that might indicate task status changes
    const { item, reaction } = event

    // Find any task associated with this message
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("external_id", `slack-msg-${item.ts}`)

    if (taskError || !tasks || tasks.length === 0) {
      return // No associated task found
    }

    const taskId = tasks[0].id

    // Update task status based on reaction
    let newStatus = null

    if (reaction === "white_check_mark" || reaction === "heavy_check_mark") {
      newStatus = "Done"
    } else if (reaction === "eyes" || reaction === "mag") {
      newStatus = "Review"
    } else if (reaction === "rocket" || reaction === "arrow_forward") {
      newStatus = "In Progress"
    }

    if (newStatus) {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
    }
  }
}

