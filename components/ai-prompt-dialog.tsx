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
import { AIPromptInput } from "@/components/ai-prompt-input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface AIPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Task {
  title: string
  description: string
  priority: "High" | "Medium" | "Low"
  status: "To Do" | "In Progress" | "Review" | "Done"
}

export function AIPromptDialog({ open, onOpenChange }: AIPromptDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [generatedTasks, setGeneratedTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    // Clear previous results when prompt changes
    if (generatedTasks) setGeneratedTasks(null)
    if (error) setError(null)
  }

  const handleGenerateTasks = async () => {
    if (!prompt.trim()) return

    setIsProcessing(true)
    setError(null)
    setGeneratedTasks(null)

    try {
      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate tasks")
      }

      setGeneratedTasks(data.tasks)
    } catch (err) {
      console.error("Error generating tasks:", err)
      setError(err instanceof Error ? err.message : "Failed to generate tasks")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApplyChanges = () => {
    setIsLoading(true)

    // Simulate applying changes
    setTimeout(() => {
      setIsLoading(false)
      onOpenChange(false)
      // In a real app, this would update the Kanban board with the generated tasks
      router.refresh()
    }, 1500)
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
          <DialogTitle>AI Task Generator</DialogTitle>
          <DialogDescription>
            Describe your project or task in natural language, and our AI will generate structured tasks for your Kanban
            board.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <AIPromptInput
            id="aiPrompt"
            name="aiPrompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe what you want to accomplish. For example: 'Create a responsive landing page with a hero section, features section, and contact form.'"
          />

          <Button onClick={handleGenerateTasks} disabled={isProcessing || !prompt.trim()} className="w-full">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
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
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {generatedTasks && generatedTasks.length > 0 && (
            <div className="mt-4 border rounded-md bg-gray-50 dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b">
                <h4 className="font-medium">AI Generated Tasks:</h4>
                <p className="text-sm text-muted-foreground">
                  {generatedTasks.length} tasks generated based on your description
                </p>
              </div>
              <div className="divide-y">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyChanges} disabled={isLoading || !generatedTasks}>
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Applying...
              </div>
            ) : (
              "Apply to Board"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

