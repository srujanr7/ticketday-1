import { NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { supabase } from "@/lib/supabase"

// Initialize the Google Generative AI model
const gemini = google("gemini-pro")

export async function POST(request: Request) {
  try {
    const { transcript, projectId, userId } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: "Meeting transcript is required" }, { status: 400 })
    }

    // Create a system prompt that instructs the model how to format the response
    const systemPrompt = `You are an AI meeting summarizer for TaskFlow, an AI-powered project management system.
    
    Your task is to analyze the meeting transcript and:
    1. Create a concise summary of the key points discussed
    2. Extract all action items and tasks mentioned
    3. Identify who is responsible for each action item (if mentioned)
    4. Suggest deadlines for each action item (if not explicitly mentioned)
    
    Format your response as a JSON object with the following structure:
    {
      "summary": "Brief summary of the meeting",
      "actionItems": [
        {
          "task": "Description of the task",
          "assignee": "Person responsible (or null if not specified)",
          "dueDate": "Suggested deadline (or null if not specified)",
          "priority": "High|Medium|Low"
        }
      ]
    }`

    // Generate meeting summary using the AI SDK
    const { text } = await generateText({
      model: gemini,
      system: systemPrompt,
      prompt: transcript,
      temperature: 0.3,
      maxTokens: 1500,
    })

    // Parse the response as JSON
    let summary
    try {
      // Find JSON object in the response (in case the model adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0])
      } else {
        summary = JSON.parse(text)
      }
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error)
      return NextResponse.json(
        {
          error: "Failed to parse meeting summary",
          rawResponse: text,
        },
        { status: 500 },
      )
    }

    // If projectId is provided, create tasks from action items
    if (projectId && userId) {
      const actionItems = summary.actionItems || []

      for (const item of actionItems) {
        // Create task in Supabase
        await supabase.from("tasks").insert({
          title: item.task,
          description: `Action item from meeting: ${item.task}`,
          status: "To Do",
          priority: item.priority || "Medium",
          project_id: projectId,
          assignee_id: null, // Would need to map assignee name to user ID
          due_date: item.dueDate || null,
          created_by: userId,
        })
      }
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error generating meeting summary:", error)
    return NextResponse.json({ error: "Failed to generate meeting summary" }, { status: 500 })
  }
}

