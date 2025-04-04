"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { TaskForm } from "@/components/task/task-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function TasksPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<any>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchTeamMembers()
    }
  }, [user])

  const fetchTasks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch tasks created by the user
      const { data: createdTasks, error: createdError } = await supabase
        .from("tasks")
        .select(`
          *,
          projects:project_id (name)
        `)
        .eq("created_by", user?.id)

      if (createdError) throw createdError

      // Fetch tasks assigned to the user
      const { data: assignedTasks, error: assignedError } = await supabase
        .from("task_assignments")
        .select(`
          task_id,
          tasks:task_id (
            *,
            projects:project_id (name)
          )
        `)
        .eq("user_id", user?.id)

      if (assignedError) throw assignedError

      // Combine and deduplicate tasks
      const assignedTasksData = assignedTasks.map((item) => item.tasks)
      const allTasks = [...createdTasks, ...assignedTasksData]

      // Remove duplicates
      const uniqueTasks = Array.from(new Map(allTasks.filter(Boolean).map((task) => [task.id, task])).values())

      // Fetch assignee information for each task
      const tasksWithAssignees = await Promise.all(
        uniqueTasks.map(async (task) => {
          const { data: assignments, error: assignmentError } = await supabase
            .from("task_assignments")
            .select(`
              user_id,
              users:user_id (
                id,
                email,
                user_metadata
              )
            `)
            .eq("task_id", task.id)

          if (assignmentError) {
            console.error("Error fetching task assignments:", assignmentError)
            return task
          }

          const assignees = assignments.map((assignment) => ({
            id: assignment.user_id,
            name: assignment.users?.user_metadata?.name || assignment.users?.email?.split("@")[0] || "Unknown",
            email: assignment.users?.email,
            avatar: assignment.users?.user_metadata?.avatar_url,
          }))

          return {
            ...task,
            assignees,
            project_name: task.projects?.name,
          }
        }),
      )

      setTasks(tasksWithAssignees)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setError("Failed to load tasks. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, email, user_metadata")

      if (error) throw error

      const formattedMembers = data.map((member) => ({
        id: member.id,
        name: member.user_metadata?.name || member.email?.split("@")[0] || "Unknown",
        email: member.email,
        avatar: member.user_metadata?.avatar_url,
      }))

      setTeamMembers(formattedMembers)
    } catch (error) {
      console.error("Error fetching team members:", error)
    }
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map((task) => task.id))
    }
  }

  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      // Check if user is the creator
      const { data: task, error: fetchError } = await supabase
        .from("tasks")
        .select("created_by")
        .eq("id", taskId)
        .single()

      if (fetchError) throw fetchError

      if (task.created_by !== user?.id) {
        toast({
          title: "Permission denied",
          description: "You can only delete tasks that you created.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("tasks").delete().eq("id", taskId)
      if (error) throw error

      setTasks(tasks.filter((task) => task.id !== taskId))
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId))

      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      })
    } catch (error: any) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return

    try {
      // Check if user is the creator of all selected tasks
      const { data: tasks, error: fetchError } = await supabase
        .from("tasks")
        .select("id, created_by")
        .in("id", selectedTasks)

      if (fetchError) throw fetchError

      const unauthorizedTasks = tasks.filter((task) => task.created_by !== user?.id)
      if (unauthorizedTasks.length > 0) {
        toast({
          title: "Permission denied",
          description: "You can only delete tasks that you created.",
          variant: "destructive",
        })
        return
      }

      for (const taskId of selectedTasks) {
        const { error } = await supabase.from("tasks").delete().eq("id", taskId)
        if (error) throw error
      }

      setTasks((tasks) => tasks.filter((task) => !selectedTasks.includes(task.id)))
      setSelectedTasks([])

      toast({
        title: "Tasks deleted",
        description: `${selectedTasks.length} tasks have been deleted successfully.`,
      })
    } catch (error: any) {
      console.error("Error deleting tasks:", error)
      toast({
        title: "Error",
        description: "Failed to delete tasks. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePriority = async (taskId: string, priority: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ priority }).eq("id", taskId)

      if (error) throw error

      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, priority } : task)))

      toast({
        title: "Priority updated",
        description: "The task priority has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating priority:", error)
      toast({
        title: "Error",
        description: "Failed to update priority. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId)

      if (error) throw error

      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status } : task)))

      toast({
        title: "Status updated",
        description: "The task status has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditTask = (task: any) => {
    setCurrentTask(task)
    setIsTaskFormOpen(true)
  }

  const handleCreateTask = () => {
    setCurrentTask(null)
    setIsTaskFormOpen(true)
  }

  const handleAssignTask = (task: any) => {
    setCurrentTask(task)
    setSelectedAssignee("")
    setIsAssignDialogOpen(true)
  }

  const handleAssignSubmit = async () => {
    if (!selectedAssignee || !currentTask) return

    try {
      // Check if assignment already exists
      const { data: existingAssignment, error: checkError } = await supabase
        .from("task_assignments")
        .select("*")
        .eq("task_id", currentTask.id)
        .eq("user_id", selectedAssignee)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is what we want
        throw checkError
      }

      if (existingAssignment) {
        toast({
          title: "Already assigned",
          description: "This user is already assigned to the task.",
        })
        setIsAssignDialogOpen(false)
        return
      }

      // Create new assignment
      const { error } = await supabase.from("task_assignments").insert({
        task_id: currentTask.id,
        user_id: selectedAssignee,
        assigned_by: user?.id,
        assigned_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update local state
      const assignedUser = teamMembers.find((member) => member.id === selectedAssignee)

      setTasks(
        tasks.map((task) => {
          if (task.id === currentTask.id) {
            const updatedAssignees = [...(task.assignees || []), assignedUser]
            return { ...task, assignees: updatedAssignees }
          }
          return task
        }),
      )

      toast({
        title: "Task assigned",
        description: "The task has been assigned successfully.",
      })

      setIsAssignDialogOpen(false)
    } catch (error: any) {
      console.error("Error assigning task:", error)
      toast({
        title: "Error",
        description: "Failed to assign task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUnassignTask = async (taskId: string, userId: string) => {
    try {
      const { error } = await supabase.from("task_assignments").delete().eq("task_id", taskId).eq("user_id", userId)

      if (error) throw error

      // Update local state
      setTasks(
        tasks.map((task) => {
          if (task.id === taskId) {
            const updatedAssignees = (task.assignees || []).filter((assignee: any) => assignee.id !== userId)
            return { ...task, assignees: updatedAssignees }
          }
          return task
        }),
      )

      toast({
        title: "Task unassigned",
        description: "The user has been unassigned from the task.",
      })
    } catch (error: any) {
      console.error("Error unassigning task:", error)
      toast({
        title: "Error",
        description: "Failed to unassign task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
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
    switch (status?.toLowerCase()) {
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

  // Filter tasks based on search query and active filter
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project_name?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!activeFilter) return matchesSearch

    switch (activeFilter) {
      case "high-priority":
        return matchesSearch && task.priority?.toLowerCase() === "high"
      case "medium-priority":
        return matchesSearch && task.priority?.toLowerCase() === "medium"
      case "low-priority":
        return matchesSearch && task.priority?.toLowerCase() === "low"
      case "assigned-to-me":
        return matchesSearch && task.assignees?.some((assignee: any) => assignee.id === user?.id)
      case "created-by-me":
        return matchesSearch && task.created_by === user?.id
      default:
        return matchesSearch
    }
  })

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Tasks</h1>
            <Button onClick={handleCreateTask}>
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
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Task
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search tasks..."
                className="w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
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
                      <path d="M3 6h18" />
                      <path d="M7 12h10" />
                      <path d="M10 18h4" />
                    </svg>
                    {activeFilter ? `Filter: ${activeFilter.replace("-", " ")}` : "Filter"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setActiveFilter(null)}>All Tasks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("high-priority")}>High Priority</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("medium-priority")}>
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("low-priority")}>Low Priority</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("assigned-to-me")}>Assigned to me</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("created-by-me")}>Created by me</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              {selectedTasks.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
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
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                    Delete Selected
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all tasks"
                        />
                      </TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assignees</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[200px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[150px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[120px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[60px]" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTasks.includes(task.id)}
                              onCheckedChange={() => handleSelectTask(task.id)}
                              aria-label={`Select ${task.title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.project_name || "—"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={getPriorityColor(task.priority)} role="button">
                                  {task.priority || "None"}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "High")}>
                                  High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "Medium")}>
                                  Medium
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "Low")}>
                                  Low
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={getStatusColor(task.status)} role="button">
                                  {task.status || "None"}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "To Do")}>
                                  To Do
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "In Progress")}>
                                  In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "Review")}>
                                  Review
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "Done")}>
                                  Done
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>
                            {task.assignees && task.assignees.length > 0 ? (
                              <div className="flex -space-x-2 overflow-hidden">
                                {task.assignees.slice(0, 3).map((assignee: any) => (
                                  <DropdownMenu key={assignee.id}>
                                    <DropdownMenuTrigger asChild>
                                      <Avatar className="h-6 w-6 border-2 border-background cursor-pointer">
                                        <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                        <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem className="font-medium">{assignee.name}</DropdownMenuItem>
                                      <DropdownMenuItem className="text-xs text-muted-foreground">
                                        {assignee.email}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => handleUnassignTask(task.id, assignee.id)}
                                      >
                                        Unassign
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ))}
                                {task.assignees.length > 3 && (
                                  <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="bg-gray-100 text-gray-800 text-xs">
                                      +{task.assignees.length - 3}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleAssignTask(task)}
                              >
                                Assign
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditTask(task)}
                              >
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
                                  className="h-4 w-4"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleAssignTask(task)}
                              >
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
                                  className="h-4 w-4"
                                >
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span className="sr-only">Assign</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={task.created_by !== user?.id}
                              >
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
                                  className="h-4 w-4"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No tasks found. Create your first task to get started!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="my-tasks">
              <div className="text-center py-10 text-muted-foreground">Filter showing only tasks assigned to you</div>
            </TabsContent>
            <TabsContent value="completed">
              <div className="text-center py-10 text-muted-foreground">Filter showing only completed tasks</div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => {
            setIsTaskFormOpen(false)
            fetchTasks()
          }}
          projectId=""
          task={currentTask}
          onSuccess={fetchTasks}
        />
      )}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>Select a team member to assign to this task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignee" className="text-right">
                Assignee
              </Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={!selectedAssignee}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

