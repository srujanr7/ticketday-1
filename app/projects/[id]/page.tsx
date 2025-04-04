"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "@/components/kanban-board"
import { AIPromptDialog } from "@/components/ai-prompt-dialog"
import { TaskForm } from "@/components/task/task-form"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Sparkles } from "lucide-react"
import { AIInsightsDashboard } from "@/components/ai-insights-dashboard"
// Add the import for MeetingScheduler
import { MeetingScheduler } from "@/components/meeting-scheduler"
import { CalendarIcon } from "@radix-ui/react-icons"

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const { user } = useAuth()
  const { toast } = useToast()
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [project, setProject] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAIInsights, setShowAIInsights] = useState(false)
  // Add state for meeting scheduler dialog
  const [isMeetingSchedulerOpen, setIsMeetingSchedulerOpen] = useState(false)

  useEffect(() => {
    if (user && projectId) {
      fetchProject()
      fetchProjectMembers()
      fetchTasks()
    }
  }, [user, projectId])

  const fetchProject = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error("Error fetching project:", error)
      setError("Failed to load project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectMembers = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error

      // Also include the project owner
      if (project?.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from("users")
          .select("id, email, user_metadata")
          .eq("id", project.owner_id)
          .single()

        if (!ownerError && ownerData) {
          const transformedMembers = data.map((item: any) => ({
            id: item.user_id,
            name: item.users?.user_metadata?.name || item.users?.email?.split("@")[0] || "Unknown",
            email: item.users?.email,
            avatar: item.users?.user_metadata?.avatar_url,
          }))

          // Add owner to members if not already included
          const ownerExists = transformedMembers.some((member) => member.id === ownerData.id)
          if (!ownerExists) {
            transformedMembers.push({
              id: ownerData.id,
              name: ownerData.user_metadata?.name || ownerData.email?.split("@")[0] || "Unknown",
              email: ownerData.email,
              avatar: ownerData.user_metadata?.avatar_url,
            })
          }

          setMembers(transformedMembers)
        }
      }
    } catch (error) {
      console.error("Error fetching project members:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", projectId)

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }

  // Calculate project stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "Done").length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <Skeleton className="h-8 w-[300px] mb-2" />
                  <Skeleton className="h-4 w-[400px]" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-[120px]" />
                  <Skeleton className="h-10 w-[100px]" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-[100px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-[60px] mb-2" />
                      <Skeleton className="h-2 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : project ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  <p className="text-muted-foreground">{project.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAIInsights(!showAIInsights)}
                    className={showAIInsights ? "bg-primary/10" : ""}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Insights
                  </Button>
                  <Button variant="outline" onClick={() => setIsMeetingSchedulerOpen(true)}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" onClick={() => setIsAIPromptOpen(true)}>
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
                    </svg>
                    AI Prompt
                  </Button>
                  <Button onClick={() => setIsTaskFormOpen(true)}>
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
                    Add Task
                  </Button>
                </div>
              </div>

              {showAIInsights && (
                <div className="mb-6">
                  <AIInsightsDashboard projectId={projectId} />
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{progress}%</div>
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-800">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {completedTasks}/{totalTasks}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completed
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-2 overflow-hidden">
                      {members.slice(0, 4).map((member) => (
                        <div
                          key={member.id}
                          className="inline-block h-8 w-8 rounded-full border-2 border-background"
                          style={{
                            backgroundImage: member.avatar ? `url(${member.avatar})` : undefined,
                            backgroundColor: !member.avatar ? "#e2e8f0" : undefined,
                            backgroundSize: "cover",
                          }}
                          title={member.name}
                        >
                          {!member.avatar && (
                            <div className="h-full w-full flex items-center justify-center text-xs font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                      {members.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gray-100 text-xs font-medium dark:bg-gray-800">
                          +{members.length - 4}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Start:</span>
                        <span className="font-medium">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Due:</span>
                        <span className="font-medium">
                          {project.due_date ? new Date(project.due_date).toLocaleDateString() : "Not set"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="kanban">
                <TabsList className="mb-4">
                  <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                </TabsList>
                <TabsContent value="kanban">
                  <KanbanBoard projectId={projectId} tasks={tasks} onTasksChange={fetchTasks} />
                </TabsContent>
                <TabsContent value="list">
                  <div className="text-center py-10 text-muted-foreground">List view coming soon</div>
                </TabsContent>
                <TabsContent value="calendar">
                  <div className="text-center py-10 text-muted-foreground">Calendar view coming soon</div>
                </TabsContent>
                <TabsContent value="files">
                  <div className="text-center py-10 text-muted-foreground">Files view coming soon</div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold mb-2">Project not found</h2>
              <p className="text-muted-foreground">
                The project you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button className="mt-4" onClick={() => (window.location.href = "/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          )}
        </main>
      </div>
      <AIPromptDialog open={isAIPromptOpen} onOpenChange={setIsAIPromptOpen} />
      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          projectId={projectId}
          onSuccess={fetchTasks}
        />
      )}
      {/* Add the MeetingScheduler component at the end of the component, right before the closing tag */}
      <MeetingScheduler
        isOpen={isMeetingSchedulerOpen}
        onClose={() => setIsMeetingSchedulerOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          // Refresh data if needed
        }}
      />
    </div>
  )
}

