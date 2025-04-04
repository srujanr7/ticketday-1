import { GoogleGenAI } from "@google/genai"
import { supabase } from "./supabase"

// Initialize the Google Generative AI model with the API key from environment variables
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
const geminiModel = genAI.models.get("gemini-2.0-flash")

// Analyze task content and suggest priority, assignee, and due date
export async function analyzeTaskContent(
  taskTitle: string,
  taskDescription: string,
  projectId: string,
): Promise<{
  priority: string
  suggestedAssigneeId: string | null
  suggestedDueDate: string | null
  estimatedHours: number
  tags: string[]
}> {
  try {
    // Get team members for this project
    const { data: projectMembers } = await supabase
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

    // Get existing tasks to understand team member expertise and workload
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignments(user_id)
      `)
      .eq("project_id", projectId)

    // Format team members for AI analysis
    const teamMembers =
      projectMembers?.map((member) => ({
        id: member.user_id,
        name: member.users?.user_metadata?.name || member.users?.email?.split("@")[0],
        email: member.users?.email,
        expertise: determineExpertise(member.user_id, existingTasks || []),
        currentWorkload: calculateWorkload(member.user_id, existingTasks || []),
      })) || []

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("name, start_date, due_date")
      .eq("id", projectId)
      .single()

    // Use AI to analyze the task
    const prompt = `
      Analyze this task and determine:
      1. Priority (High, Medium, or Low)
      2. Best team member to assign based on expertise and current workload
      3. Suggested due date (YYYY-MM-DD format)
      4. Estimated hours to complete
      5. Relevant tags/categories for the task
      
      Task Title: ${taskTitle}
      Task Description: ${taskDescription || "No description provided"}
      
      Project: ${project?.name || "Unknown"}
      Project Timeline: ${project?.start_date ? `${project.start_date} to ${project.due_date || "ongoing"}` : "Unknown"}
      
      Team Members, their expertise, and current workload:
      ${teamMembers
        .map(
          (member) =>
            `- ${member.name} (ID: ${member.id}): Expert in ${member.expertise.join(", ")}. Current workload: ${
              member.currentWorkload
            } tasks`,
        )
        .join("\n")}
      
      Format your response as JSON with the following structure:
      {
        "priority": "High|Medium|Low",
        "suggestedAssigneeId": "team_member_id",
        "suggestedDueDate": "YYYY-MM-DD",
        "estimatedHours": number,
        "tags": ["tag1", "tag2"],
        "reasoning": "Brief explanation of your decision"
      }
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the AI response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          priority: result.priority || "Medium",
          suggestedAssigneeId: result.suggestedAssigneeId,
          suggestedDueDate: result.suggestedDueDate,
          estimatedHours: result.estimatedHours || 4,
          tags: result.tags || [],
        }
      }

      // Default values if parsing fails
      return {
        priority: "Medium",
        suggestedAssigneeId: teamMembers.length > 0 ? teamMembers[0].id : null,
        suggestedDueDate: null,
        estimatedHours: 4,
        tags: [],
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        priority: "Medium",
        suggestedAssigneeId: teamMembers.length > 0 ? teamMembers[0].id : null,
        suggestedDueDate: null,
        estimatedHours: 4,
        tags: [],
      }
    }
  } catch (error) {
    console.error("Error in AI task analysis:", error)
    return {
      priority: "Medium",
      suggestedAssigneeId: null,
      suggestedDueDate: null,
      estimatedHours: 4,
      tags: [],
    }
  }
}

// Generate tasks for a project based on description
export async function generateProjectTasks(
  projectName: string,
  projectDescription: string,
  projectId: string,
  userId: string,
): Promise<any[]> {
  try {
    // Create a system prompt that instructs the model how to format the response
    const prompt = `
      Based on this project description, generate a list of tasks that would be needed to complete the project.
      
      Project Name: ${projectName}
      Project Description: ${projectDescription}
      
      For each task:
      1. Provide a clear, concise title
      2. Add a brief description
      3. Assign a priority (High, Medium, or Low)
      4. Suggest a status (To Do|In Progress|Review|Done)
      5. Estimate hours to complete
      
      Format your response as a JSON array of task objects with the following structure:
      [
        {
          "title": "Task title",
          "description": "Task description",
          "priority": "High|Medium|Low",
          "status": "To Do|In Progress|Review|Done",
          "estimatedHours": number
        }
      ]
      
      Generate between 5-10 tasks that cover different aspects of the project.
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the response as JSON
    try {
      // Find JSON array in the response (in case the model adds extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0])

        // Create tasks in the database
        const createdTasks = []

        for (const task of tasks) {
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              title: task.title,
              description: task.description,
              status: task.status || "To Do",
              priority: task.priority || "Medium",
              estimated_hours: task.estimatedHours || 4,
              project_id: projectId,
              created_by: userId,
              created_at: new Date().toISOString(),
            })
            .select()

          if (!error && data) {
            createdTasks.push(data[0])
          }
        }

        return createdTasks
      }

      return []
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error)
      return []
    }
  } catch (error) {
    console.error("Error generating tasks:", error)
    return []
  }
}

// Generate a meeting summary and action items
export async function generateMeetingSummary(
  meetingTitle: string,
  meetingNotes: string,
  projectId: string,
  userId: string,
): Promise<{
  summary: string
  actionItems: any[]
}> {
  try {
    const prompt = `
      Analyze these meeting notes and:
      1. Create a concise summary of the meeting
      2. Extract action items that need to be completed
      
      Meeting Title: ${meetingTitle}
      Meeting Notes:
      ${meetingNotes}
      
      Format your response as JSON with the following structure:
      {
        "summary": "Concise meeting summary",
        "actionItems": [
          {
            "title": "Action item title",
            "assignedTo": "Person mentioned in notes or 'Unassigned'",
            "dueDate": "Mentioned due date or null",
            "priority": "High|Medium|Low"
          }
        ]
      }
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        // Create tasks for action items
        const actionItems = []

        for (const item of result.actionItems) {
          // Try to find the mentioned user
          let assigneeId = null

          if (item.assignedTo && item.assignedTo !== "Unassigned") {
            const { data: users } = await supabase
              .from("users")
              .select("id")
              .ilike("user_metadata->>name", `%${item.assignedTo}%`)

            if (users && users.length > 0) {
              assigneeId = users[0].id
            }
          }

          // Create a task for this action item
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              title: item.title,
              description: `Action item from meeting: ${meetingTitle}`,
              status: "To Do",
              priority: item.priority || "Medium",
              due_date: item.dueDate,
              project_id: projectId,
              created_by: userId,
              created_at: new Date().toISOString(),
            })
            .select()

          if (!error && data) {
            actionItems.push(data[0])

            // Assign the task if we found a user
            if (assigneeId) {
              await supabase.from("task_assignments").insert({
                task_id: data[0].id,
                user_id: assigneeId,
                assigned_by: userId,
                assigned_at: new Date().toISOString(),
              })
            }
          }
        }

        return {
          summary: result.summary,
          actionItems: actionItems,
        }
      }

      return {
        summary: "Failed to generate summary",
        actionItems: [],
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        summary: "Failed to generate summary",
        actionItems: [],
      }
    }
  } catch (error) {
    console.error("Error generating meeting summary:", error)
    return {
      summary: "Failed to generate summary",
      actionItems: [],
    }
  }
}

// Generate project insights and recommendations
export async function generateProjectInsights(projectId: string): Promise<{
  healthScore: number
  riskAreas: string[]
  recommendations: string[]
  predictedCompletion: string | null
  bottlenecks: string[]
}> {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, users:owner_id(email, user_metadata)")
      .eq("id", projectId)
      .single()

    if (projectError) throw projectError

    // Get tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignments(user_id, users:user_id(email, user_metadata))
      `)
      .eq("project_id", projectId)

    if (tasksError) throw tasksError

    // Get team members
    const { data: teamMembers, error: teamError } = await supabase
      .from("project_members")
      .select(`
        user_id,
        users:user_id(email, user_metadata)
      `)
      .eq("project_id", projectId)

    if (teamError) throw teamError

    // Calculate task statistics
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter((task) => task.status === "Done").length || 0
    const highPriorityTasks = tasks?.filter((task) => task.priority === "High").length || 0
    const overdueTasks =
      tasks?.filter((task) => {
        if (!task.due_date) return false
        return new Date(task.due_date) < new Date() && task.status !== "Done"
      }).length || 0

    // Calculate completion percentage
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Format data for AI analysis
    const tasksByStatus = {
      "To Do": tasks?.filter((task) => task.status === "To Do").length || 0,
      "In Progress": tasks?.filter((task) => task.status === "In Progress").length || 0,
      Review: tasks?.filter((task) => task.status === "Review").length || 0,
      Done: completedTasks,
    }

    const tasksByPriority = {
      High: highPriorityTasks,
      Medium: tasks?.filter((task) => task.priority === "Medium").length || 0,
      Low: tasks?.filter((task) => task.priority === "Low").length || 0,
    }

    // Calculate team member workload
    const memberWorkload = {}
    tasks?.forEach((task) => {
      task.task_assignments?.forEach((assignment) => {
        const userId = assignment.user_id
        if (userId) {
          memberWorkload[userId] = (memberWorkload[userId] || 0) + 1
        }
      })
    })

    // Format team members with workload
    const teamWithWorkload =
      teamMembers?.map((member) => {
        const userId = member.user_id
        const name = member.users?.user_metadata?.name || member.users?.email?.split("@")[0] || "Unknown"
        return {
          id: userId,
          name,
          tasksAssigned: memberWorkload[userId] || 0,
        }
      }) || []

    // Use AI to generate insights
    const prompt = `
      Analyze this project data and generate insights:
      
      Project: ${project?.name}
      Description: ${project?.description || "No description"}
      Start Date: ${project?.start_date || "Not set"}
      Due Date: ${project?.due_date || "Not set"}
      
      Task Statistics:
      - Total Tasks: ${totalTasks}
      - Completion: ${completionPercentage}%
      - Tasks by Status: ${JSON.stringify(tasksByStatus)}
      - Tasks by Priority: ${JSON.stringify(tasksByPriority)}
      - Overdue Tasks: ${overdueTasks}
      
      Team Members and Workload:
      ${teamWithWorkload.map((member) => `- ${member.name}: ${member.tasksAssigned} tasks`).join("\n")}
      
      Based on this data, provide:
      1. Project health score (0-100)
      2. Risk areas (list)
      3. Recommendations for improvement (list)
      4. Predicted completion date (if project has a due date)
      5. Potential bottlenecks
      
      Format your response as JSON with the following structure:
      {
        "healthScore": number,
        "riskAreas": ["risk1", "risk2", ...],
        "recommendations": ["rec1", "rec2", ...],
        "predictedCompletion": "YYYY-MM-DD or null",
        "bottlenecks": ["bottleneck1", "bottleneck2", ...]
      }
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          healthScore: result.healthScore || 50,
          riskAreas: result.riskAreas || [],
          recommendations: result.recommendations || [],
          predictedCompletion: result.predictedCompletion,
          bottlenecks: result.bottlenecks || [],
        }
      }

      return {
        healthScore: 50,
        riskAreas: ["Unable to analyze project health"],
        recommendations: ["Consider adding more project details for better analysis"],
        predictedCompletion: null,
        bottlenecks: [],
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        healthScore: 50,
        riskAreas: ["Error analyzing project data"],
        recommendations: ["Try again later"],
        predictedCompletion: null,
        bottlenecks: [],
      }
    }
  } catch (error) {
    console.error("Error generating project insights:", error)
    return {
      healthScore: 50,
      riskAreas: ["Error retrieving project data"],
      recommendations: ["Check database connection"],
      predictedCompletion: null,
      bottlenecks: [],
    }
  }
}

// Generate team insights and recommendations
export async function generateTeamInsights(userId: string): Promise<{
  teamPerformance: {
    score: number
    strengths: string[]
    weaknesses: string[]
  }
  memberInsights: Array<{
    id: string
    name: string
    performance: number
    strengths: string[]
    recommendations: string[]
  }>
  recommendations: string[]
}> {
  try {
    // Get user's projects (as owner)
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("owner_id", userId)

    if (ownedError) throw ownedError

    if (!ownedProjects || ownedProjects.length === 0) {
      return {
        teamPerformance: {
          score: 0,
          strengths: [],
          weaknesses: [],
        },
        memberInsights: [],
        recommendations: ["Create or join a project to get team insights"],
      }
    }

    // Get all team members across projects
    const projectIds = ownedProjects.map((p) => p.id)

    const { data: teamMembers, error: teamError } = await supabase
      .from("project_members")
      .select(`
        user_id,
        project_id,
        users:user_id(email, user_metadata)
      `)
      .in("project_id", projectIds)

    if (teamError) throw teamError

    // Get all tasks across projects
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignments(user_id)
      `)
      .in("project_id", projectIds)

    if (tasksError) throw tasksError

    // Process team member data
    const memberMap = {}

    teamMembers?.forEach((member) => {
      const userId = member.user_id
      if (!memberMap[userId]) {
        memberMap[userId] = {
          id: userId,
          name: member.users?.user_metadata?.name || member.users?.email?.split("@")[0] || "Unknown",
          email: member.users?.email,
          projects: [member.project_id],
          tasksAssigned: 0,
          tasksCompleted: 0,
          onTimeCompletion: 0,
          lateCompletion: 0,
        }
      } else {
        memberMap[userId].projects.push(member.project_id)
      }
    })

    // Calculate task statistics for each member
    tasks?.forEach((task) => {
      task.task_assignments?.forEach((assignment) => {
        const userId = assignment.user_id
        if (memberMap[userId]) {
          memberMap[userId].tasksAssigned++

          if (task.status === "Done") {
            memberMap[userId].tasksCompleted++

            // Check if completed on time
            if (task.due_date && task.completed_at) {
              const dueDate = new Date(task.due_date)
              const completedDate = new Date(task.completed_at)

              if (completedDate <= dueDate) {
                memberMap[userId].onTimeCompletion++
              } else {
                memberMap[userId].lateCompletion++
              }
            }
          }
        }
      })
    })

    // Convert to array
    const members = Object.values(memberMap)

    // Use AI to generate insights
    const prompt = `
      Analyze this team data and generate insights:
      
      Team Members:
      ${members
        .map(
          (member) => `
        - ${member.name} (${member.email})
          Projects: ${member.projects.length}
          Tasks Assigned: ${member.tasksAssigned}
          Tasks Completed: ${member.tasksCompleted}
          On-time Completions: ${member.onTimeCompletion}
          Late Completions: ${member.lateCompletion}
      `,
        )
        .join("\n")}
      
      Based on this data, provide:
      1. Overall team performance score (0-100)
      2. Team strengths (list)
      3. Team weaknesses (list)
      4. For each team member:
         a. Individual performance score (0-100)
         b. Strengths (list)
         c. Personalized recommendations (list)
      5. Overall team recommendations (list)
      
      Format your response as JSON with the following structure:
      {
        "teamPerformance": {
          "score": number,
          "strengths": ["strength1", "strength2", ...],
          "weaknesses": ["weakness1", "weakness2", ...]
        },
        "memberInsights": [
          {
            "id": "member_id",
            "name": "member_name",
            "performance": number,
            "strengths": ["strength1", "strength2", ...],
            "recommendations": ["rec1", "rec2", ...]
          },
          ...
        ],
        "recommendations": ["rec1", "rec2", ...]
      }
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        // Ensure member IDs are preserved
        const memberInsights = result.memberInsights.map((insight) => {
          const member = members.find((m) => m.name === insight.name)
          return {
            ...insight,
            id: member?.id || insight.id,
          }
        })

        return {
          teamPerformance: result.teamPerformance || {
            score: 50,
            strengths: [],
            weaknesses: [],
          },
          memberInsights: memberInsights || [],
          recommendations: result.recommendations || [],
        }
      }

      return {
        teamPerformance: {
          score: 50,
          strengths: ["Unable to analyze team strengths"],
          weaknesses: ["Unable to analyze team weaknesses"],
        },
        memberInsights: [],
        recommendations: ["Add more team members and tasks for better analysis"],
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        teamPerformance: {
          score: 50,
          strengths: ["Error analyzing team data"],
          weaknesses: ["Error analyzing team data"],
        },
        memberInsights: [],
        recommendations: ["Try again later"],
      }
    }
  } catch (error) {
    console.error("Error generating team insights:", error)
    return {
      teamPerformance: {
        score: 0,
        strengths: [],
        weaknesses: [],
      },
      memberInsights: [],
      recommendations: ["Error retrieving team data"],
    }
  }
}

// Generate calendar events based on project milestones and tasks
export async function generateCalendarEvents(userId: string, projectId?: string): Promise<any[]> {
  try {
    // Get user's projects
    let projectsQuery = supabase.from("projects").select("id, name, start_date, due_date")

    if (projectId) {
      projectsQuery = projectsQuery.eq("id", projectId)
    } else {
      // Get projects where user is owner or member
      const { data: memberProjects } = await supabase.from("project_members").select("project_id").eq("user_id", userId)

      const memberProjectIds = memberProjects?.map((p) => p.project_id) || []

      projectsQuery = projectsQuery.or(`owner_id.eq.${userId},id.in.(${memberProjectIds.join(",")})`)
    }

    const { data: projects, error: projectsError } = await projectsQuery

    if (projectsError) throw projectsError

    if (!projects || projects.length === 0) {
      return []
    }

    // Get tasks for these projects
    const projectIds = projects.map((p) => p.id)

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignments(user_id)
      `)
      .in("project_id", projectIds)
      .not("due_date", "is", null)

    if (tasksError) throw tasksError

    // Filter tasks assigned to this user
    const userTasks =
      tasks?.filter(
        (task) =>
          task.created_by === userId || task.task_assignments?.some((assignment) => assignment.user_id === userId),
      ) || []

    // Generate events based on project milestones and task deadlines
    const events = []

    // Add project start and end dates as events
    projects.forEach((project) => {
      if (project.start_date) {
        events.push({
          title: `${project.name} - Start`,
          date: project.start_date,
          time: "09:00",
          project_id: project.id,
          type: "milestone",
          created_by: userId,
        })
      }

      if (project.due_date) {
        events.push({
          title: `${project.name} - Deadline`,
          date: project.due_date,
          time: "17:00",
          project_id: project.id,
          type: "milestone",
          created_by: userId,
        })
      }
    })

    // Add task deadlines as events
    userTasks.forEach((task) => {
      if (task.due_date) {
        const project = projects.find((p) => p.id === task.project_id)
        events.push({
          title: `Task Due: ${task.title}`,
          description: task.description,
          date: task.due_date,
          time: "16:00",
          project_id: task.project_id,
          type: "task",
          created_by: userId,
          metadata: {
            task_id: task.id,
            project_name: project?.name,
          },
        })
      }
    })

    // Use AI to suggest additional meetings and events
    if (events.length > 0) {
      const prompt = `
        Based on these project milestones and task deadlines, suggest additional meetings or events that would be helpful:
        
        Projects:
        ${projects
          .map(
            (project) => `
          - ${project.name}
            Start: ${project.start_date || "Not set"}
            End: ${project.due_date || "Not set"}
        `,
          )
          .join("\n")}
        
        Task Deadlines:
        ${userTasks
          .map(
            (task) => `
          - ${task.title} (${task.priority} priority)
            Due: ${task.due_date}
            Status: ${task.status}
        `,
          )
          .join("\n")}
        
        Suggest up to 3 additional meetings or events that would help with project coordination and success.
        For each suggestion, provide:
        1. Event title
        2. Brief description
        3. Suggested date (YYYY-MM-DD format)
        4. Event type (planning, review, retrospective, etc.)
        
        Format your response as a JSON array with the following structure:
        [
          {
            "title": "Event title",
            "description": "Event description",
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "type": "event_type"
          },
          ...
        ]
      `

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      })

      const response = result.response
      const text = response.text()

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const suggestedEvents = JSON.parse(jsonMatch[0])

          // Add project_id and created_by to suggested events
          const projectId = projects[0].id // Use the first project if multiple
          const suggestedEventsWithMetadata = suggestedEvents.map((event) => ({
            ...event,
            project_id: projectId,
            created_by: userId,
            suggested_by_ai: true,
          }))

          events.push(...suggestedEventsWithMetadata)
        }
      } catch (error) {
        console.error("Error parsing AI suggested events:", error)
      }
    }

    return events
  } catch (error) {
    console.error("Error generating calendar events:", error)
    return []
  }
}

// Generate report insights and visualizations
export async function generateReportInsights(
  userId: string,
  timeframe = "last30days",
): Promise<{
  summary: string
  keyMetrics: Record<string, number>
  trends: Array<{
    name: string
    data: number[]
    change: number
  }>
  recommendations: string[]
}> {
  try {
    // Calculate date range based on timeframe
    const endDate = new Date()
    let startDate = new Date()

    switch (timeframe) {
      case "last7days":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "last30days":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "last90days":
        startDate.setDate(endDate.getDate() - 90)
        break
      case "thisyear":
        startDate = new Date(endDate.getFullYear(), 0, 1) // January 1st of current year
        break
      default:
        startDate.setDate(endDate.getDate() - 30) // Default to 30 days
    }

    // Format dates for database queries
    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Get user's projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("id, name, created_at")
      .eq("owner_id", userId)
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)

    if (ownedError) throw ownedError

    // Get projects where user is a member
    const { data: memberProjects, error: memberError } = await supabase
      .from("project_members")
      .select("project_id, projects:project_id(id, name, created_at)")
      .eq("user_id", userId)

    if (memberError) throw memberError

    // Filter member projects by date range
    const filteredMemberProjects =
      memberProjects
        ?.filter((mp) => {
          const createdAt = new Date(mp.projects?.created_at)
          return createdAt >= startDate && createdAt <= endDate
        })
        .map((mp) => mp.projects) || []

    // Combine projects
    const allProjects = [...(ownedProjects || []), ...filteredMemberProjects]
    const projectIds = allProjects.map((p) => p.id)

    // Get tasks created in the timeframe
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*, task_assignments(user_id)")
      .in("project_id", projectIds)
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)

    if (tasksError) throw tasksError

    // Get completed tasks in the timeframe
    const { data: completedTasks, error: completedError } = await supabase
      .from("tasks")
      .select("*, task_assignments(user_id)")
      .in("project_id", projectIds)
      .eq("status", "Done")
      .gte("updated_at", startDateStr)
      .lte("updated_at", endDateStr)

    if (completedError) throw completedError

    // Calculate metrics
    const totalProjects = allProjects.length
    const totalTasks = tasks?.length || 0
    const completedTasksCount = completedTasks?.length || 0
    const completionRate = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0

    // Tasks by priority
    const highPriorityTasks = tasks?.filter((t) => t.priority === "High").length || 0
    const mediumPriorityTasks = tasks?.filter((t) => t.priority === "Medium").length || 0
    const lowPriorityTasks = tasks?.filter((t) => t.priority === "Low").length || 0

    // Tasks by status
    const todoTasks = tasks?.filter((t) => t.status === "To Do").length || 0
    const inProgressTasks = tasks?.filter((t) => t.status === "In Progress").length || 0
    const reviewTasks = tasks?.filter((t) => t.status === "Review").length || 0

    // Calculate trends (simplified for this example)
    // In a real implementation, you would query data for each time period
    const trends = [
      {
        name: "Task Completion",
        data: [65, 70, 75, 80, completionRate].map(Math.round),
        change: 5,
      },
      {
        name: "New Tasks",
        data: [20, 18, 22, 19, totalTasks],
        change: totalTasks - 19,
      },
      {
        name: "Active Projects",
        data: [4, 5, 4, 6, totalProjects],
        change: totalProjects - 6,
      },
    ]

    // Compile key metrics
    const keyMetrics = {
      totalProjects,
      totalTasks,
      completedTasks: completedTasksCount,
      completionRate: Math.round(completionRate),
      highPriorityTasks,
      mediumPriorityTasks,
      lowPriorityTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
    }

    // Use AI to generate insights
    const prompt = `
      Analyze these project and task metrics and generate insights:
      
      Timeframe: ${timeframe}
      
      Key Metrics:
      - Total Projects: ${totalProjects}
      - Total Tasks: ${totalTasks}
      - Completed Tasks: ${completedTasksCount}
      - Completion Rate: ${Math.round(completionRate)}%
      
      Tasks by Priority:
      - High: ${highPriorityTasks}
      - Medium: ${mediumPriorityTasks}
      - Low: ${lowPriorityTasks}
      
      Tasks by Status:
      - To Do: ${todoTasks}
      - In Progress: ${inProgressTasks}
      - Review: ${reviewTasks}
      - Done: ${completedTasksCount}
      
      Trends:
      - Task Completion Rate: ${trends[0].data.join(", ")}% (${trends[0].change > 0 ? "+" : ""}${trends[0].change}%)
      - New Tasks: ${trends[1].data.join(", ")} (${trends[1].change > 0 ? "+" : ""}${trends[1].change})
      - Active Projects: ${trends[2].data.join(", ")} (${trends[2].change > 0 ? "+" : ""}${trends[2].change})
      
      Based on this data, provide:
      1. A concise summary of performance during this period
      2. 3-5 specific recommendations for improvement
      
      Format your response as JSON with the following structure:
      {
        "summary": "Concise performance summary",
        "recommendations": ["rec1", "rec2", "rec3", ...]
      }
    `

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    })

    const response = result.response
    const text = response.text()

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        return {
          summary: result.summary || "No summary available",
          keyMetrics,
          trends,
          recommendations: result.recommendations || [],
        }
      }

      return {
        summary: "Unable to generate insights from the available data.",
        keyMetrics,
        trends,
        recommendations: ["Add more projects and tasks for better analysis"],
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        summary: "Error generating insights.",
        keyMetrics,
        trends,
        recommendations: ["Try again later"],
      }
    }
  } catch (error) {
    console.error("Error generating report insights:", error)
    return {
      summary: "Error retrieving report data.",
      keyMetrics: {},
      trends: [],
      recommendations: ["Check database connection"],
    }
  }
}

// Helper function to determine team member expertise based on past tasks
function determineExpertise(userId: string, tasks: any[]): string[] {
  const userTasks = tasks.filter((task) =>
    task.task_assignments.some((assignment: any) => assignment.user_id === userId),
  )

  // Extract keywords from task titles and descriptions
  const keywords: Record<string, number> = {}

  userTasks.forEach((task) => {
    const text = `${task.title} ${task.description || ""}`
    const words = text.toLowerCase().split(/\W+/)

    // Count occurrences of potential expertise keywords
    const expertiseKeywords = [
      "frontend",
      "backend",
      "api",
      "database",
      "ui",
      "ux",
      "design",
      "testing",
      "security",
      "performance",
      "mobile",
      "web",
      "devops",
      "react",
      "node",
      "javascript",
      "typescript",
      "python",
      "java",
      "css",
      "html",
      "aws",
      "cloud",
      "docker",
      "kubernetes",
    ]

    words.forEach((word) => {
      if (expertiseKeywords.includes(word)) {
        keywords[word] = (keywords[word] || 0) + 1
      }
    })
  })

  // Sort keywords by frequency and return top 3
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword)
}

// Calculate current workload for a team member
function calculateWorkload(userId: string, tasks: any[]): number {
  return tasks.filter(
    (task) => task.status !== "Done" && task.task_assignments.some((assignment: any) => assignment.user_id === userId),
  ).length
}

