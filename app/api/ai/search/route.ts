import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { supabase } from "@/lib/supabase"

// Initialize the Google Generative AI model with the API key
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
const geminiModel = genAI.models.get("gemini-2.0-flash")

export async function POST(request: Request) {
  try {
    const { query, userId } = await request.json()

    if (!query || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user's projects
    const { data: ownedProjects } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("owner_id", userId)

    const { data: memberProjects } = await supabase
      .from("project_members")
      .select("project_id, projects:project_id(id, name, description)")
      .eq("user_id", userId)

    // Combine projects
    const projects = [...(ownedProjects || []), ...(memberProjects?.map((mp) => mp.projects) || [])]

    // Get project IDs
    const projectIds = projects.map((p) => p.id)

    // Get tasks for these projects
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, project_id")
      .in("project_id", projectIds)

    // Get comments
    const { data: comments } = await supabase
      .from("task_comments")
      .select("id, content, task_id, created_by, created_at")
      .in("task_id", tasks?.map((t) => t.id) || [])

    // Get integrations
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("id, integration_type, metadata, user_id, created_at")
      .eq("user_id", userId)

    // Get integration data (GitHub repos, Slack channels, etc.)
    const { data: integrationData } = await supabase
      .from("integration_data")
      .select("id, integration_id, data_type, data")
      .in("integration_id", integrations?.map((i) => i.id) || [])

    // Use AI to search across all data
    const prompt = `
      Search across the following data for: "${query}"
      
      Projects:
      ${projects.map((p) => `ID: ${p.id}, Name: ${p.name}, Description: ${p.description || "No description"}`).join("\n")}
      
      Tasks:
      ${tasks?.map((t) => `ID: ${t.id}, Title: ${t.title}, Description: ${t.description || "No description"}, Status: ${t.status}, Priority: ${t.priority}, Project ID: ${t.project_id}`).join("\n") || "No tasks"}
      
      Comments:
      ${comments?.map((c) => `ID: ${c.id}, Content: ${c.content}, Task ID: ${c.task_id}, Created by: ${c.created_by}, Created at: ${c.created_at}`).join("\n") || "No comments"}
      
      Integrations:
      ${integrations?.map((i) => `ID: ${i.id}, Type: ${i.integration_type}, Created at: ${i.created_at}`).join("\n") || "No integrations"}
      
      Integration Data:
      ${integrationData?.map((d) => `ID: ${d.id}, Integration ID: ${d.integration_id}, Type: ${d.data_type}, Data: ${JSON.stringify(d.data)}`).join("\n") || "No integration data"}
      
      Return the top 5-10 most relevant results as a JSON array with the following structure:
      [
        {
          "type": "task|project|comment|integration|integration_data",
          "id": "item_id",
          "title": "Item title or name",
          "description": "Brief description or excerpt",
          "url": "URL path to navigate to this item (optional)",
          "metadata": {
            // Additional relevant information like project_id, task_id, etc.
          }
        }
      ]
      
      Only include results that are relevant to the search query. If no results are found, return an empty array.
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the results
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const searchResults = JSON.parse(jsonMatch[0])

        // Process results to add proper URLs
        const processedResults = searchResults.map((result: any) => {
          let url

          switch (result.type) {
            case "project":
              url = `/projects/${result.id}`
              break
            case "task":
              url = `/tasks/${result.id}`
              break
            case "comment":
              url = `/tasks/${result.metadata?.taskId || result.metadata?.task_id}`
              break
            case "integration":
              url = `/settings/integrations`
              break
            case "integration_data":
              url = `/settings/integrations`
              break
            default:
              url = null
          }

          return {
            ...result,
            url,
          }
        })

        return NextResponse.json({ results: processedResults })
      }

      return NextResponse.json({ results: [] })
    } catch (error) {
      console.error("Error parsing AI search results:", error)
      return NextResponse.json({ results: [] })
    }
  } catch (error) {
    console.error("Error in AI search:", error)
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 })
  }
}

