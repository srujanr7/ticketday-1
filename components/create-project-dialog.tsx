"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIPromptInput } from "@/components/ai-prompt-input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Task {
  title: string
  description: string
  priority: "High" | "Medium" | "Low"
  status: "To Do" | "In Progress" | "Review" | "Done"
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [useAI, setUseAI] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    aiPrompt: "",
  })
  const [generatedTasks, setGeneratedTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear previous results when prompt changes
    if (name === "aiPrompt" && generatedTasks) {
      setGeneratedTasks(null)
    }
    if (error) setError(null)
  }

  const handleGenerateTasks = async () => {
    if (!formData.aiPrompt.trim() || !user) return

    setIsProcessing(true)
    setError(null)
    setGeneratedTasks(null)

    try {
      const response = await fetch("/api/ai/task-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: formData.aiPrompt,
          projectId: "temp", // Will be replaced with actual project ID after creation
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate tasks")
      }

      setGeneratedTasks(data.tasks)

      // Auto-generate project name and description if they're empty
      if (!formData.name.trim()) {
        // Extract a name from the prompt
        const words = formData.aiPrompt.split(" ").slice(0, 3).join(" ")
        setFormData((prev) => ({
          ...prev,
          name: words.charAt(0).toUpperCase() + words.slice(1) + " Project",
        }))
      }

      if (!formData.description.trim()) {
        setFormData((prev) => ({
          ...prev,
          description: formData.aiPrompt.length > 100 ? formData.aiPrompt.slice(0, 100) + "..." : formData.aiPrompt,
        }))
      }
    } catch (err) {
      console.error("Error generating tasks:", err)
      setError(err instanceof Error ? err.message : "Failed to generate tasks")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      // Create project in Supabase
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          description: formData.description,
          status: "Planning",
          owner_id: user.id,
        })
        .select()
        .single()

      if (projectError) {
        throw projectError
      }

      // If tasks were generated, create them
      if (generatedTasks && generatedTasks.length > 0 && projectData) {
        const tasksToInsert = generatedTasks.map((task) => ({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          project_id: projectData.id,
          created_by: user.id,
        }))

        const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert)

        if (tasksError) {
          console.error("Error creating tasks:", tasksError)
          // Continue anyway, we've created the project
        }
      }

      toast({
        title: "Project created",
        description: "Your project has been created successfully.",
      })

      if (onSuccess) {
        onSuccess()
      }

      onOpenChange(false)

      // Redirect to the new project
      if (projectData) {
        router.push(`/projects/${projectData.id}`)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "There was an error creating your project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/20 dark:text-red-400"
      case "medium":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "to do":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
      case "in progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400"
      case "review":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-800/20 dark:text-purple-400"
      case "done":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project manually or use AI to generate tasks from a description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={useAI ? "outline" : "default"}
                onClick={() => setUseAI(false)}
                className="flex-1"
              >
                Manual Setup
              </Button>
              <Button
                type="button"
                variant={useAI ? "default" : "outline"}
                onClick={() => setUseAI(true)}
                className="flex-1"
              >
                AI-Powered
              </Button>
            </div>

            {useAI ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Project Description</Label>
                  <AIPromptInput
                    id="aiPrompt"
                    name="aiPrompt"
                    value={formData.aiPrompt}
                    onChange={handleChange}
                    placeholder="Describe your project in detail. For example: 'Create an e-commerce website with user authentication, product catalog, shopping cart, and checkout process.'"
                  />
                  <p className="text-xs text-muted-foreground">
                    Our AI will analyze your description and generate tasks, priorities, and structure.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateTasks}
                  disabled={isProcessing || !formData.aiPrompt.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
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
                      Processing with Gemini...
                    </div>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        <path d="M13 8h2" />
                        <path d="M13 12h2" />
                      </svg>
                      Generate Tasks
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isProcessing && (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {generatedTasks && generatedTasks.length > 0 && (
                  <div className="border rounded-md bg-gray-50 dark:bg-gray-900 overflow-hidden">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">AI Generated Tasks:</h4>
                      <p className="text-sm text-muted-foreground">
                        {generatedTasks.length} tasks generated based on your description
                      </p>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y">
                      {generatedTasks.map((task, index) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{task.title}</h5>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                              <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedTasks && generatedTasks.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter project name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter project description"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter project description"
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (useAI && !generatedTasks) || (!useAI && !formData.name.trim())}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                  Creating...
                </div>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

