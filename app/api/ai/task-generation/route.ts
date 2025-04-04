import { NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

// Initialize the Google Generative AI model with Flash
const gemini = google("gemini-1.5-flash")

export async function POST(request: Request) {
  try {
    const { prompt, projectId, userId } = await request.json()

    if (!prompt || !projectId || !userId) {
      return NextResponse.json(
        {
          error: "Prompt, projectId, and userId are required",
        },
        { status: 400 },
      )
    }

    // Create a system prompt that instructs the model how to format the response
    const systemPrompt = `You are an AI task generator for a project management system. 
    Based on the user's project description, generate a list of tasks that would be needed to complete the project.
    
    For each task:
    1. Provide a clear, concise title
    2. Add a brief description
    3. Assign a priority (High, Medium, or Low)
    4. Suggest a status (To Do, In Progress, Review, or Done)
    5. Estimate a due date relative to project start (e.g., "Day 1", "Week 2", etc.)
    6. Suggest dependencies between tasks where appropriate
    
    Format your response as a JSON array of task objects with the following structure:
    [
      {
        "title": "Task title",
        "description": "Task description",
        "priority": "High|Medium|Low",
        "status": "To Do|In Progress|Review|Done",
        "dueDate": "Relative time estimate",
        "dependencies": ["Title of dependent task 1", "Title of dependent task 2"]
      }
    ]
    
    Generate between 5-10 tasks that cover different aspects of the project.`

    // Generate tasks using the AI SDK
    const { text } = await generateText({
      model: gemini,
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 1500,
    })

    // Parse the response as JSON
    let tasks
    try {
      // Find JSON array in the response (in case the model adds extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0])
      } else {
        tasks = JSON.parse(text)
      }
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error)
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: text,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error generating tasks:", error)
    return NextResponse.json({ error: "Failed to generate tasks" }, { status: 500 })
  }
}

