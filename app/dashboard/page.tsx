"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardNav } from "@/components/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard-header"
import { ProjectCard } from "@/components/project-card"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { RequireAuth } from "@/components/auth/require-auth"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Download, BarChart } from "lucide-react"

export default function DashboardPage() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch projects where user is owner or member
      const { data: ownedProjects, error: ownedError } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false })

      if (ownedError) throw ownedError

      const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user?.id)

      if (memberError) throw memberError

      let allProjects = ownedProjects || []

      // If user is a member of other projects, fetch those too
      if (memberProjects && memberProjects.length > 0) {
        const memberProjectIds = memberProjects.map((p) => p.project_id)
        const { data: otherProjects, error: otherError } = await supabase
          .from("projects")
          .select("*")
          .in("id", memberProjectIds)
          .order("created_at", { ascending: false })

        if (otherError) throw otherError

        if (otherProjects) {
          allProjects = [...allProjects, ...otherProjects]
        }
      }

      // For each project, fetch task stats
      const projectsWithStats = await Promise.all(
        allProjects.map(async (project) => {
          const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select("id, status")
            .eq("project_id", project.id)

          if (tasksError) {
            console.error("Error fetching tasks for project:", project.id, tasksError)
            return {
              ...project,
              tasks: { total: 0, completed: 0 },
              progress: 0,
            }
          }

          const totalTasks = tasks?.length || 0
          const completedTasks = tasks?.filter((t) => t.status === "Done").length || 0

          return {
            ...project,
            tasks: { total: totalTasks, completed: completedTasks },
            progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          }
        }),
      )

      setProjects(projectsWithStats)
    } catch (error) {
      console.error("Error fetching projects:", error)
      setError("Failed to load projects. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate dashboard stats
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status !== "Completed").length
  const totalTasks = projects.reduce((acc, project) => acc + (project.tasks?.total || 0), 0)
  const completedTasks = projects.reduce((acc, project) => acc + (project.tasks?.completed || 0), 0)
  const averageProgress =
    projects.length > 0 ? Math.round(projects.reduce((acc, project) => acc + project.progress, 0) / projects.length) : 0

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => (window.location.href = "/reports/insights")}>
                  <BarChart className="mr-2 h-4 w-4" />
                  View Insights
                </Button>
                <Button onClick={() => setIsCreateProjectOpen(true)}>
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
                  New Project
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <CardDescription>All projects across all workspaces</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{totalProjects}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-500">{activeProjects} active</span> projects
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                  <CardDescription>Total tasks across all projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{totalTasks}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-500">{completedTasks} completed</span> tasks
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                  <CardDescription>Across all active projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{averageProgress}%</div>
                      <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-800">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${averageProgress}%` }}></div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <CardDescription>Latest updates and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <>
                      <div className="text-sm">
                        {projects.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Last updated</p>
                            <p className="font-medium">
                              {new Date(projects[0].updated_at || projects[0].created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No recent activity</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="recent">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="recent">Recent Projects</TabsTrigger>
                  <TabsTrigger value="all">All Projects</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
              <TabsContent value="recent" className="space-y-4">
                {isLoading ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardHeader className="p-4">
                          <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Skeleton className="h-4 w-full mb-4" />
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-10" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : projects.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.slice(0, 6).map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No projects found. Create your first project to get started!</p>
                    <Button onClick={() => setIsCreateProjectOpen(true)} className="mt-4">
                      Create Project
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="all">
                {isLoading ? (
                  <div className="text-center py-10 text-muted-foreground">Loading all projects...</div>
                ) : projects.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No projects found. Create your first project to get started!</p>
                    <Button onClick={() => setIsCreateProjectOpen(true)} className="mt-4">
                      Create Project
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="archived">
                <div className="text-center py-10 text-muted-foreground">No archived projects found</div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
        <CreateProjectDialog
          open={isCreateProjectOpen}
          onOpenChange={setIsCreateProjectOpen}
          onSuccess={fetchProjects}
        />
      </div>
    </RequireAuth>
  )
}

