import { NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { supabase } from "@/lib/supabase"

// Initialize the Google Generative AI model
const gemini = google("gemini-1.5-flash")

export async function POST(request: Request) {
  try {
    const { projectId, projectName, projectDescription, recentTasks, userId } = await request.json()

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get team members for this project
    const { data: projectMembers, error: membersError } = await supabase
      .from("project_members")
      .select(`
        user_id,
        users:user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq("project_id", projectId)

    if (membersError) {
      console.error("Error fetching project members:", membersError)
      return NextResponse.json({ error: "Failed to fetch project members" }, { status: 500 })
    }

    // Format team members for AI analysis
    const teamMembers =
      projectMembers?.map((member) => ({
        id: member.user_id,
        name: member.users?.user_metadata?.name || member.users?.email?.split("@")[0],
        email: member.users?.email,
      })) || []

    // Use AI to generate meeting details
    const prompt = `
      Generate a meeting for this project:
      
      Project Name: ${projectName || "Unknown"}
      Project Description: ${projectDescription || "No description provided"}
      
      Recent Tasks:
      ${
        recentTasks?.map((task: any) => `- ${task.title} (${task.status}, ${task.priority} priority)`).join("\n") ||
        "No recent tasks"
      }
      
      Team Members:
      ${teamMembers.map((member) => `- ${member.name} (${member.email})`).join("\n")}
      
      Based on this information, suggest:
      1. A clear, specific meeting title
      2. A detailed meeting description/agenda
      3. The type of meeting (planning, review, retrospective, standup, demo, etc.)
      4. Suggested duration in minutes (15, 30, 45, 60, 90, or 120)
      5. Key team members who should attend (list their emails)
      
      Format your response as JSON with the following structure:
      {
        "title": "Meeting title",
        "description": "Meeting description and agenda",
        "type": "meeting_type",
        "duration": number_of_minutes,
        "suggestedAttendees": ["email1", "email2", ...]
      }
    `

    const { text } = await generateText({
      model: gemini,
      prompt: prompt,
      temperature: 0.7,
    })

    // Parse the AI response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const meeting = JSON.parse(jsonMatch[0])

        return NextResponse.json({ meeting })
      }

      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in meeting generation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

