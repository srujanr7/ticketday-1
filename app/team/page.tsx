"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"

export default function TeamPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Mock data for team members
  const teamMembers = [
    {
      id: "1",
      name: "Alex Johnson",
      role: "Project Manager",
      email: "alex@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 4,
      tasks: { assigned: 12, completed: 8 },
      status: "active",
    },
    {
      id: "2",
      name: "Sarah Miller",
      role: "UI/UX Designer",
      email: "sarah@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 3,
      tasks: { assigned: 15, completed: 10 },
      status: "active",
    },
    {
      id: "3",
      name: "David Chen",
      role: "Frontend Developer",
      email: "david@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 2,
      tasks: { assigned: 18, completed: 14 },
      status: "active",
    },
    {
      id: "4",
      name: "Maria Garcia",
      role: "Backend Developer",
      email: "maria@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 3,
      tasks: { assigned: 14, completed: 11 },
      status: "active",
    },
    {
      id: "5",
      name: "James Wilson",
      role: "QA Engineer",
      email: "james@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 2,
      tasks: { assigned: 10, completed: 7 },
      status: "active",
    },
    {
      id: "6",
      name: "Emily Brown",
      role: "Product Owner",
      email: "emily@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 4,
      tasks: { assigned: 8, completed: 5 },
      status: "active",
    },
    {
      id: "7",
      name: "Michael Lee",
      role: "DevOps Engineer",
      email: "michael@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 1,
      tasks: { assigned: 6, completed: 4 },
      status: "active",
    },
    {
      id: "8",
      name: "Lisa Taylor",
      role: "Content Strategist",
      email: "lisa@example.com",
      avatar: "/placeholder.svg?height=128&width=128",
      projects: 2,
      tasks: { assigned: 9, completed: 6 },
      status: "active",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Team</h1>
            <Button onClick={() => setIsInviteOpen(true)}>
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
              Add Team Member
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input placeholder="Search team members..." className="w-[250px]" />
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
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All Roles</DropdownMenuItem>
                  <DropdownMenuItem>Developers</DropdownMenuItem>
                  <DropdownMenuItem>Designers</DropdownMenuItem>
                  <DropdownMenuItem>Managers</DropdownMenuItem>
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

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Members</TabsTrigger>
              <TabsTrigger value="developers">Developers</TabsTrigger>
              <TabsTrigger value="designers">Designers</TabsTrigger>
              <TabsTrigger value="managers">Managers</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-medium text-lg">{member.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                          <Badge className="mb-4">
                            {member.projects} {member.projects === 1 ? "Project" : "Projects"}
                          </Badge>
                          <div className="w-full flex justify-between text-sm">
                            <span>
                              Tasks: {member.tasks.completed}/{member.tasks.assigned}
                            </span>
                            <span>{Math.round((member.tasks.completed / member.tasks.assigned) * 100)}% Complete</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full mt-2 mb-4 dark:bg-gray-800">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${(member.tasks.completed / member.tasks.assigned) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" className="w-full">
                              Profile
                            </Button>
                            <Button variant="outline" size="sm" className="w-full">
                              Message
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Tasks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.projects}</TableCell>
                          <TableCell>
                            {member.tasks.completed}/{member.tasks.assigned}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                                <span className="sr-only">More</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="developers">
              <div className="text-center py-10 text-muted-foreground">Filter showing only developers</div>
            </TabsContent>
            <TabsContent value="designers">
              <div className="text-center py-10 text-muted-foreground">Filter showing only designers</div>
            </TabsContent>
            <TabsContent value="managers">
              <div className="text-center py-10 text-muted-foreground">Filter showing only managers</div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onSuccess={() => {
          // Refresh team members list
          // This would be implemented with a real data fetch in production
        }}
      />
    </div>
  )
}

