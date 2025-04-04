"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <div className="flex items-center gap-2">
              <Select defaultValue="last30days">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last90days">Last 90 Days</SelectItem>
                  <SelectItem value="thisyear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <CardDescription>All active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+2</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                <CardDescription>Tasks finished on time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">87</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+12</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team Productivity</CardTitle>
                <CardDescription>Average tasks per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">4.2</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-amber-500">-0.3</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">On-time Delivery</CardTitle>
                <CardDescription>Projects completed on schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+5%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Status Distribution</CardTitle>
                    <CardDescription>Current status of all projects</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80 flex items-center justify-center">
                      <div className="w-full max-w-md">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                              <span>In Progress</span>
                            </div>
                            <span className="font-medium">50%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: "50%" }}></div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                              <span>Planning</span>
                            </div>
                            <span className="font-medium">25%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: "25%" }}></div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                              <span>Completed</span>
                            </div>
                            <span className="font-medium">25%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: "25%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Task Completion Trend</CardTitle>
                    <CardDescription>Tasks completed over time</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80 flex items-center justify-center">
                      <div className="w-full h-full flex flex-col justify-end">
                        <div className="flex items-end justify-between h-64 gap-2">
                          {Array.from({ length: 7 }).map((_, i) => {
                            const height = Math.floor(Math.random() * 60) + 20
                            return (
                              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                <div className="w-full bg-blue-500 rounded-t-md" style={{ height: `${height}%` }}></div>
                                <span className="text-xs text-muted-foreground">
                                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>Project duration and milestones</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80 flex items-center justify-center">
                      <div className="w-full space-y-6">
                        {["E-commerce Website", "Mobile App Redesign", "API Integration", "Marketing Website"].map(
                          (project, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{project}</span>
                                <span className="text-sm text-muted-foreground">
                                  {Math.floor(Math.random() * 40) + 60}% Complete
                                </span>
                              </div>
                              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800 relative">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                                ></div>
                                {[25, 50, 75].map((milestone, j) => (
                                  <div
                                    key={j}
                                    className="absolute top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"
                                    style={{ left: `${milestone}%` }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="projects">
              <div className="text-center py-10 text-muted-foreground">Project-specific analytics and reports</div>
            </TabsContent>
            <TabsContent value="team">
              <div className="text-center py-10 text-muted-foreground">Team performance and productivity metrics</div>
            </TabsContent>
            <TabsContent value="tasks">
              <div className="text-center py-10 text-muted-foreground">Task completion and distribution analytics</div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

