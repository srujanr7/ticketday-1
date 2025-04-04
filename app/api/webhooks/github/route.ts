import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { analyzeTaskContent } from "@/lib/ai-service"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const githubEvent = request.headers.get("X-GitHub-Event")

    // Get repository information from the payload
    const repository = payload.repository?.full_name

    if (!repository) {
      return NextResponse.json({ error: "Repository information missing" }, { status: 400 })
    }

    // Find the integration for this repository
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("user_id, config, project_id")
      .eq("type", "github")
      .eq("connected", true)
      .filter("config->repositories", "ilike", `%${repository}%`)
      .single()

    if (integrationError || !integration) {
      console.error("No matching GitHub integration found for repository:", repository)
      return NextResponse.json({ error: "No matching GitHub integration found" }, { status: 404 })
    }

    // Get the webhook secret from the integration config
    const webhookSecret = integration.config.webhookSecret

    // Verify webhook signature if a secret is configured
    if (webhookSecret) {
      const signature = request.headers.get("X-Hub-Signature-256")
      if (!verifySignature(signature, JSON.stringify(payload), webhookSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Process different GitHub events
    switch (githubEvent) {
      case "issues":
        return handleIssueEvent(payload, integration)
      case "pull_request":
        return handlePullRequestEvent(payload, integration)
      case "push":
        return handlePushEvent(payload, integration)
      default:
        return NextResponse.json({ message: "Event not handled" }, { status: 200 })
    }
  } catch (error) {
    console.error("Error processing GitHub webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Verify the webhook signature
function verifySignature(signature: string | null, payload: string, secret: string): boolean {
  if (!signature) return false

  const hmac = crypto.createHmac("sha256", secret)
  const computedSignature = `sha256=${hmac.update(payload).digest("hex")}`

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))
}

async function handleIssueEvent(payload: any, integration: any) {
  const { action, issue, repository } = payload
  const userId = integration.user_id
  const projectId = integration.project_id

  switch (action) {
    case "opened":
      // Create a new task for the issue
      const taskTitle = `[GitHub] ${issue.title}`
      const taskDescription = `${issue.body || "No description"}\n\nGitHub Issue: ${issue.html_url}`

      // Use AI to analyze the issue content
      const analysis = await analyzeTaskContent(taskTitle, taskDescription, projectId)

      // Create the task with AI-suggested attributes
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskTitle,
          description: taskDescription,
          status: "To Do",
          priority: analysis?.priority || "Medium",
          due_date: analysis?.suggestedDueDate || null,
          estimated_hours: analysis?.estimatedHours || null,
          project_id: projectId,
          created_by: userId,
          created_at: new Date().toISOString(),
          github_issue_id: issue.id,
          github_issue_number: issue.number,
          github_issue_url: issue.html_url,
          tags: analysis?.tags || [],
        })
        .select()

      if (taskError) {
        console.error("Error creating task:", taskError)
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
      }

      // If there's a suggested assignee, assign the task
      if (analysis?.suggestedAssigneeId) {
        await supabase.from("task_assignments").insert({
          task_id: task[0].id,
          user_id: analysis.suggestedAssigneeId,
          assigned_by: userId,
          assigned_at: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        message: "Task created from GitHub issue",
        taskId: task[0].id,
      })

    case "closed":
      // Update the task status to "Done"
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "Done" })
        .eq("github_issue_id", issue.id)
        .eq("project_id", projectId)

      if (updateError) {
        console.error("Error updating task:", updateError)
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
      }

      return NextResponse.json({ message: "Task marked as done" })

    case "reopened":
      // Update the task status back to "To Do"
      const { error: reopenError } = await supabase
        .from("tasks")
        .update({ status: "To Do" })
        .eq("github_issue_id", issue.id)
        .eq("project_id", projectId)

      if (reopenError) {
        console.error("Error updating task:", reopenError)
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
      }

      return NextResponse.json({ message: "Task reopened" })

    default:
      return NextResponse.json({ message: "Issue action not handled" }, { status: 200 })
  }
}

async function handlePullRequestEvent(payload: any, integration: any) {
  const { action, pull_request, repository } = payload
  const userId = integration.user_id
  const projectId = integration.project_id

  // Check if the PR title or description mentions an issue number
  const issueRegex = /#(\d+)/g
  const prText = `${pull_request.title} ${pull_request.body || ""}`
  const issueMatches = [...prText.matchAll(issueRegex)]

  if (issueMatches.length > 0) {
    // Update the related tasks
    for (const match of issueMatches) {
      const issueNumber = Number.parseInt(match[1], 10)

      // Find the task associated with this issue number
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("github_issue_number", issueNumber)
        .eq("project_id", projectId)

      if (tasksError || !tasks || tasks.length === 0) {
        continue
      }

      // Update the task with PR information
      for (const task of tasks) {
        await supabase
          .from("tasks")
          .update({
            github_pr_url: pull_request.html_url,
            status: action === "opened" ? "Review" : task.status,
          })
          .eq("id", task.id)
      }
    }
  }

  // If PR is merged, update related tasks to "Done"
  if (action === "closed" && pull_request.merged) {
    for (const match of issueMatches) {
      const issueNumber = Number.parseInt(match[1], 10)

      await supabase
        .from("tasks")
        .update({ status: "Done" })
        .eq("github_issue_number", issueNumber)
        .eq("project_id", projectId)
    }
  }

  return NextResponse.json({ message: "Pull request processed" }, { status: 200 })
}

async function handlePushEvent(payload: any, integration: any) {
  const { commits, repository, ref } = payload
  const projectId = integration.project_id

  // Only process pushes to the main branch
  if (!ref.includes("main") && !ref.includes("master")) {
    return NextResponse.json({ message: "Not a push to main branch" }, { status: 200 })
  }

  // Process commit messages for issue references
  const issueRegex = /(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi

  for (const commit of commits) {
    const message = commit.message
    const matches = [...message.matchAll(issueRegex)]

    for (const match of matches) {
      const issueNumber = Number.parseInt(match[2], 10)

      // Update the task status to "Done"
      await supabase
        .from("tasks")
        .update({ status: "Done" })
        .eq("github_issue_number", issueNumber)
        .eq("project_id", projectId)
    }
  }

  return NextResponse.json({ message: "Push event processed" }, { status: 200 })
}

