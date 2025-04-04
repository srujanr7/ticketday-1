"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCard } from "@/components/project-card"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function ProjectsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch projects where the user is the owner or a member
      const { data: ownedProjects, error: ownedError } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user?.id)

      if (ownedError) throw ownedError

      // Fetch projects where the user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select(`
          project_id,
          projects:project_id (*)
        `)
        .eq("user_id", user?.id)

      if (memberError) throw memberError

      // Combine and deduplicate projects
      const memberProjectsData = memberProjects.map((item) => item.projects)
      const allProjects = [...ownedProjects, ...memberProjectsData]

      // Remove duplicates
      const uniqueProjects = Array.from(new Map(allProjects.map((project) => [project.id, project])).values())

      setProjects(uniqueProjects)
    } catch (error: any) {
      console.error("Error fetching projects:", error)
      setError("Failed to load projects. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }

    try {
      // Check if user is the owner
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .single()

      if (fetchError) throw fetchError

      if (project.owner_id !== user?.id) {
        toast({
          title: "Permission denied",
          description: "You can only delete projects that you own.",
          variant: "destructive",
        })
        return
      }

      // Delete the project
      const { error: deleteError } = await supabase.from("projects").delete().eq("id", projectId)

      if (deleteError) throw deleteError

      // Update the UI
      setProjects(projects.filter((project) => project.id !== projectId))

      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      })
    } catch (error: any) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      case "in progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400"
      case "planning":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  // Filter projects based on search query and active filter
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!activeFilter) return matchesSearch

    switch (activeFilter) {
      case "in-progress":
        return matchesSearch && project.status?.toLowerCase() === "in progress"
      case "planning":
        return matchesSearch && project.status?.toLowerCase() === "planning"
      case "completed":
        return matchesSearch && project.status?.toLowerCase() === "completed"
      case "my-projects":
        return matchesSearch && project.owner_id === user?.id
      default:
        return matchesSearch
    }
  })

  const handleCreateProjectSuccess = () => {
    setIsCreateProjectOpen(false)
    fetchProjects()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Projects</h1>
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

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search projects..."
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
                  <DropdownMenuItem onClick={() => setActiveFilter(null)}>All Projects</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("in-progress")}>In Progress</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("planning")}>Planning</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("completed")}>Completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("my-projects")}>My Projects</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
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
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                <span className="sr-only">Grid view</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
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
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
                <span className="sr-only">List view</span>
              </Button>
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
              <TabsTrigger value="all">All Projects</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {isLoading ? (
                viewMode === "grid" ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-6 space-y-4">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Tasks</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-5 w-[200px]" />
                              <Skeleton className="h-3 w-[150px] mt-1" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[60px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-[60px]" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : filteredProjects.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Tasks</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">
                              <Link href={`/projects/${project.id}`} className="hover:underline">
                                {project.name}
                              </Link>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{project.description}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(project.status)}>{project.status || "Not Set"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full max-w-24">
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                                    <div
                                      className="h-full bg-blue-600 rounded-full"
                                      style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <span className="text-xs">{project.progress || 0}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{project.task_count || 0}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{project.member_count || 0} members</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {project.due_date ? new Date(project.due_date).toLocaleDateString() : "Not set"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <Link href={`/projects/${project.id}`}>
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
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteProject(project.id)}
                                  disabled={project.owner_id !== user?.id}
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <div className="text-center py-10 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">No projects found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || activeFilter
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first project to get started."}
                  </p>
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
                    Create Project
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="active">
              <div className="text-center py-10 text-muted-foreground">Filter showing only active projects</div>
            </TabsContent>
            <TabsContent value="completed">
              <div className="text-center py-10 text-muted-foreground">Filter showing only completed projects</div>
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
        onSuccess={handleCreateProjectSuccess}
      />
    </div>
  )
}

