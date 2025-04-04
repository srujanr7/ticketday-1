"use client"

import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { createTask, updateTask } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIPromptInput } from "@/components/ai-prompt-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { analyzeTaskContent } from "@/lib/ai-service"

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  task?: any
  onSuccess?: () => void
}

export function TaskForm({ isOpen, onClose, projectId, task, onSuccess }: TaskFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("To Do")
  const [priority, setPriority] = useState("Medium")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [estimatedHours, setEstimatedHours] = useState<number>(0)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [formMode, setFormMode] = useState<"manual" | "ai">("manual")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiError, setAiError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "To Do",
    priority: task?.priority || "Medium",
    dueDate: task?.due_date ? new Date(task.due_date) : undefined,
  })

  useEffect(() => {
    if (user) {
      fetchProjects()
      if (task) {
        setTitle(task.title || "")
        setDescription(task.description || "")
        setStatus(task.status || "To Do")
        setPriority(task.priority || "Medium")
        setDueDate(task.due_date ? new Date(task.due_date) : undefined)
        setSelectedProjectId(task.project_id || projectId || "")
        setEstimatedHours(task.estimated_hours || 0)

        // Set assignees if task has them
        if (task.assignees && task.assignees.length > 0) {
          setSelectedAssignees(task.assignees.map((assignee: any) => assignee.id))
        }
      }
    }
  }, [user, task, projectId])

  useEffect(() => {
    if (selectedProjectId) {
      fetchTeamMembers(selectedProjectId)
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      // Fetch projects where user is owner or member
      const { data: ownedProjects, error: ownedError } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user?.id)

      if (ownedError) throw ownedError

      const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select("project_id, projects:project_id(*)")
        .eq("user_id", user?.id)

      if (memberError) throw memberError

      // Combine and deduplicate projects
      const memberProjectsData = memberProjects.map((item) => item.projects)
      const allProjects = [...(ownedProjects || []), ...(memberProjectsData || [])]
      const uniqueProjects = Array.from(
        new Map(allProjects.filter(Boolean).map((project) => [project.id, project])).values(),
      )

      setProjects(uniqueProjects)

      // If no project is selected and we have projects, select the first one
      if (!selectedProjectId && uniqueProjects.length > 0) {
        setSelectedProjectId(uniqueProjects[0].id)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchTeamMembers = async (projectId: string) => {
    try {
      // Get project members
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

      if (membersError) throw membersError

      // Get project owner
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("owner_id, users:owner_id(id, email, user_metadata)")
        .eq("id", projectId)
        .single()

      if (projectError) throw projectError

      // Combine members and owner
      const members = projectMembers.map((member) => ({
        id: member.user_id,
        name: member.users?.user_metadata?.name || member.users?.email?.split("@")[0] || "Unknown",
        email: member.users?.email,
        avatar: member.users?.user_metadata?.avatar_url,
      }))

      // Add owner if not already in members
      if (project?.owner_id) {
        const ownerExists = members.some((member) => member.id === project.owner_id)
        if (!ownerExists) {
          members.push({
            id: project.owner_id,
            name: project.users?.user_metadata?.name || project.users?.email?.split("@")[0] || "Unknown",
            email: project.users?.email,
            avatar: project.users?.user_metadata?.avatar_url,
          })
        }
      }

      setTeamMembers(members)
    } catch (error) {
      console.error("Error fetching team members:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, dueDate: date }))
  }

  const handleSubmitOld = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate ? formData.dueDate.toISOString() : null,
        project_id: projectId,
        created_by: user.id,
      }

      if (task) {
        // Update existing task
        await updateTask(task.id, taskData)
        toast({
          title: "Task updated",
          description: "Your task has been updated successfully.",
        })
      } else {
        // Create new task
        await createTask(taskData)
        toast({
          title: "Task created",
          description: "Your task has been created successfully.",
        })
      }

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      console.error("Error saving task:", error)
      toast({
        title: "Error",
        description: "There was an error saving your task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const taskData = {
        title,
        description,
        status,
        priority,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
        project_id: selectedProjectId,
        estimated_hours: estimatedHours,
        tags: selectedTags,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      }

      let taskId: string

      if (task) {
        // Update existing task
        const { data, error } = await supabase.from("tasks").update(taskData).eq("id", task.id).select()
        if (error) throw error
        taskId = task.id
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...taskData,
            created_at: new Date().toISOString(),
          })
          .select()
        if (error) throw error
        taskId = data[0].id
      }

      // Handle assignees
      if (selectedAssignees.length > 0) {
        // First, remove existing assignments if updating
        if (task) {
          await supabase.from("task_assignments").delete().eq("task_id", taskId)
        }

        // Add new assignments
        for (const assigneeId of selectedAssignees) {
          await supabase.from("task_assignments").insert({
            task_id: taskId,
            user_id: assigneeId,
            assigned_by: user?.id,
            assigned_at: new Date().toISOString(),
          })
        }
      }

      toast({
        title: task ? "Task updated" : "Task created",
        description: task ? "The task has been updated successfully." : "The task has been created successfully.",
      })

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error: any) {
      console.error("Error saving task:", error)
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateTaskWithAI = async () => {
    if (!aiPrompt.trim() || !user) {
      toast({
        title: "Prompt required",
        description: "Please enter a task description first.",
        variant: "destructive",
      })
      return
    }

    setIsAIGenerating(true)
    setAiError(null)

    try {
      const response = await fetch("/api/ai/task-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          projectId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate task")
      }

      const data = await response.json()

      if (data.tasks && data.tasks.length > 0) {
        // Use the first task
        const generatedTask = data.tasks[0]
        setFormData({
          title: generatedTask.title,
          description: generatedTask.description,
          status: generatedTask.status || "To Do",
          priority: generatedTask.priority || "Medium",
          dueDate: undefined, // We'll let the user set this
        })

        // Switch to manual mode to show the generated task
        setFormMode("manual")

        toast({
          title: "Task generated",
          description: "AI has generated a task based on your description.",
        })
      }
    } catch (error) {
      console.error("Error generating task:", error)
      setAiError("Failed to generate task. Please try again or use manual mode.")
    } finally {
      setIsAIGenerating(false)
    }
  }

  const generateTaskDescription = async () => {
    if (!formData.title) {
      toast({
        title: "Title required",
        description: "Please enter a task title first.",
        variant: "destructive",
      })
      return
    }

    setIsAIGenerating(true)

    try {
      const response = await fetch("/api/ai/task-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Generate a detailed description for a task titled "${formData.title}" in a project management system.`,
          projectId,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate task description")
      }

      const data = await response.json()

      if (data.tasks && data.tasks.length > 0) {
        // Use the first task's description
        setFormData((prev) => ({
          ...prev,
          description: data.tasks[0].description,
          priority: data.tasks[0].priority || prev.priority,
        }))
      }
    } catch (error) {
      console.error("Error generating task description:", error)
      toast({
        title: "Generation failed",
        description: "Failed to generate task description. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAIGenerating(false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!title.trim() || !selectedProjectId) {
      toast({
        title: "Error",
        description: "Task title and project are required for AI analysis",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const analysis = await analyzeTaskContent(title, description, selectedProjectId)

      // Update form with AI suggestions
      setPriority(analysis.priority)
      if (analysis.suggestedDueDate) {
        setDueDate(new Date(analysis.suggestedDueDate))
      }
      setEstimatedHours(analysis.estimatedHours)
      setSuggestedTags(analysis.tags)

      // If there's a suggested assignee, add them
      if (analysis.suggestedAssigneeId) {
        setSelectedAssignees([...selectedAssignees, analysis.suggestedAssigneeId])
      }

      toast({
        title: "AI Analysis Complete",
        description: "Task details have been updated with AI suggestions.",
      })
    } catch (error) {
      console.error("Error during AI analysis:", error)
      toast({
        title: "Analysis Failed",
        description: "Could not complete AI analysis. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId))
    } else {
      setSelectedAssignees([...selectedAssignees, userId])
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details of your task." : "Add a new task to your project."}
          </DialogDescription>
        </DialogHeader>

        {!task && (
          <Tabs value={formMode} onValueChange={(value) => setFormMode(value as "manual" | "ai")} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <form onSubmit={handleSubmitOld}>
          {formMode === "ai" && !task ? (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="aiPrompt">Describe the task</Label>
                <AIPromptInput
                  id="aiPrompt"
                  name="aiPrompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the task in detail. For example: 'Create a responsive navigation menu that collapses on mobile devices and includes dropdown submenus.'"
                />
                <p className="text-xs text-muted-foreground">
                  Our AI will analyze your description and generate a structured task.
                </p>
              </div>

              {aiError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{aiError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="button"
                onClick={generateTaskWithAI}
                disabled={isAIGenerating || !aiPrompt.trim()}
                className="w-full"
              >
                {isAIGenerating ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating with AI...
                  </div>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Task
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Task title"
                    className="flex-1"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Task description"
                      className="flex-1"
                      rows={4}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex gap-1"
                    onClick={generateTaskDescription}
                    disabled={isAIGenerating || !formData.title}
                  >
                    {isAIGenerating ? (
                      <div className="flex items-center gap-1">
                        <svg
                          className="animate-spin h-4 w-4 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generating...
                      </div>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Due Date
                </Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.dueDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={formData.dueDate} onSelect={handleDateChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (formMode === "manual" && !formData.title)}>
              {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

