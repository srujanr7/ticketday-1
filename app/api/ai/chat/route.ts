import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { supabase } from "@/lib/supabase"

// Initialize the Google Generative AI model with the API key
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
const geminiModel = genAI.models.get("gemini-2.0-flash")

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json()

    // Get user information from the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's projects and tasks for context
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description")
      .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date")
      .in("project_id", projects?.map((p) => p.id) || [])
      .order("created_at", { ascending: false })
      .limit(10)

    // Get user's integrations for context
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("integration_type, status")
      .eq("user_id", userId)

    // Format the conversation history for the AI
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }))

    // Create a system prompt with context about the user's projects, tasks, and integrations
    const systemPrompt = {
      role: "system",
      parts: [
        {
          text: `
        You are an AI assistant for the TaskFlow project management application.
        
        User Information:
        - User ID: ${userId}
        
        Projects (${projects?.length || 0}):
        ${projects?.map((p) => `- ${p.name}: ${p.description || "No description"}`).join("\n") || "No projects found"}
        
        Recent Tasks (${tasks?.length || 0}):
        ${tasks?.map((t) => `- ${t.title} (${t.status}, ${t.priority}${t.due_date ? `, due: ${t.due_date}` : ""})`).join("\n") || "No tasks found"}
        
        Integrations:
        ${integrations?.map((i) => `- ${i.integration_type}: ${i.status}`).join("\n") || "No integrations found"}
        
        You can help with:
        1. Answering questions about projects and tasks
        2. Providing productivity tips
        3. Explaining TaskFlow features
        4. Suggesting workflow improvements
        5. Searching across projects, tasks, and integrations
        
        Be concise, helpful, and friendly in your responses.
      `,
        },
      ],
    }

    // Add the user's new message
    const userMessage = {
      role: "user",
      parts: [{ text: message }],
    }

    // Combine system prompt, history, and new message
    const chatHistory = [systemPrompt, ...formattedHistory, userMessage]

    // Generate a response from the AI
    const result = await geminiModel.generateContent({
      contents: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    })

    const response = result.response
    const text = response.text()

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 })
  }
}

