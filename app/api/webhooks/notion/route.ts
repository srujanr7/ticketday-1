import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Get the database_id from the payload
    const databaseId = payload.database?.id || payload.page?.parent?.database_id

    if (!databaseId) {
      return new Response("Database ID missing from payload", { status: 400 })
    }

    // Find the integration for this Notion database
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("user_id, config")
      .eq("type", "notion")
      .eq("connected", true)
      .filter("config->database_id", "eq", databaseId)
      .single()

    if (integrationError || !integration) {
      return new Response("No matching Notion integration found", { status: 404 })
    }

    // Use the user's Notion token
    const notionToken = integration.config.apiKey

    if (!notionToken) {
      return new Response("Notion token not configured for this integration", { status: 500 })
    }

    // Verify the Notion request (in a real app)
    // const signature = request.headers.get('notion-signature')
    // if (!verifyNotionRequest(signature, payload, integration.config.signingSecret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Handle different Notion event types
    if (payload.type === "database.updated") {
      await handleDatabaseUpdate(payload)
    } else if (payload.type === "page.created") {
      await handlePageCreated(payload)
    } else if (payload.type === "page.updated") {
      await handlePageUpdated(payload)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Notion webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleDatabaseUpdate(payload: any) {
  // This is called when a database is updated
  // We don't need to do anything specific here
}

async function handlePageCreated(payload: any) {
  const { page } = payload

  // Check if this page is from a database we're tracking
  const { data: integrations, error: integrationError } = await supabase
    .from("integrations")
    .select("project_id, config")
    .eq("type", "notion")
    .eq("config->database_id", page.parent.database_id)

  if (integrationError || !integrations || integrations.length === 0) {
    console.error("No integration found for this Notion database:", page.parent.database_id)
    return
  }

  const projectId = integrations[0].project_id

  // Fetch the page properties from Notion API (in a real app)
  // For this example, we'll assume we have the properties
  const properties = page.properties

  // Create a new task
  await supabase.from("tasks").insert({
    title: properties.Name?.title?.[0]?.plain_text || "Untitled Task",
    description: properties.Description?.rich_text?.[0]?.plain_text || "",
    status: mapNotionStatusToTaskflow(properties.Status?.select?.name),
    priority: mapNotionPriorityToTaskflow(properties.Priority?.select?.name),
    project_id: projectId,
    external_id: `notion-page-${page.id}`,
    external_url: `https://notion.so/${page.id.replace(/-/g, "")}`,
    created_at: new Date().toISOString(),
  })
}

async function handlePageUpdated(payload: any) {
  const { page } = payload

  // Find the task associated with this Notion page
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("external_id", `notion-page-${page.id}`)

  if (taskError || !tasks || tasks.length === 0) {
    console.error("No task found for this Notion page:", page.id)
    return
  }

  const taskId = tasks[0].id

  // Fetch the page properties from Notion API (in a real app)
  // For this example, we'll assume we have the properties
  const properties = page.properties

  // Update the task
  await supabase
    .from("tasks")
    .update({
      title: properties.Name?.title?.[0]?.plain_text || "Untitled Task",
      description: properties.Description?.rich_text?.[0]?.plain_text || "",
      status: mapNotionStatusToTaskflow(properties.Status?.select?.name),
      priority: mapNotionPriorityToTaskflow(properties.Priority?.select?.name),
    })
    .eq("id", taskId)
}

function mapNotionStatusToTaskflow(notionStatus: string | undefined): string {
  if (!notionStatus) return "To Do"

  const status = notionStatus.toLowerCase()

  if (status.includes("done") || status.includes("complete")) {
    return "Done"
  } else if (status.includes("progress") || status.includes("doing")) {
    return "In Progress"
  } else if (status.includes("review")) {
    return "Review"
  }

  return "To Do"
}

function mapNotionPriorityToTaskflow(notionPriority: string | undefined): string {
  if (!notionPriority) return "Medium"

  const priority = notionPriority.toLowerCase()

  if (priority.includes("high") || priority.includes("urgent")) {
    return "High"
  } else if (priority.includes("low")) {
    return "Low"
  }

  return "Medium"
}

