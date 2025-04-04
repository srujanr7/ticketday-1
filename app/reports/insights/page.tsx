"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RequireAuth } from "@/components/auth/require-auth"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Sparkles, Download, RefreshCw, Calendar, Clock, Users, CheckSquare, AlertTriangle, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Sample data for charts
const velocityData = [
  { week: "Week 1", actual: 12, predicted: 10 },
  { week: "Week 2", actual: 19, predicted: 15 },
  { week: "Week 3", actual: 15, predicted: 18 },
  { week: "Week 4", actual: 22, predicted: 20 },
  { week: "Week 5", actual: 28, predicted: 25 },
  { week: "Week 6", actual: 24, predicted: 28 },
  { week: "Week 7", actual: 30, predicted: 30 },
  { week: "Week 8", actual: 35, predicted: 32 },
]

const taskDistributionData = [
  { name: "Feature Development", value: 45 },
  { name: "Bug Fixes", value: 25 },
  { name: "Documentation", value: 15 },
  { name: "Testing", value: 10 },
  { name: "Maintenance", value: 5 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const timeSpentData = [
  { day: "Monday", development: 5.2, meetings: 2.1, planning: 1.5 },
  { day: "Tuesday", development: 6.5, meetings: 1.2, planning: 0.8 },
  { day: "Wednesday", development: 5.8, meetings: 2.5, planning: 1.2 },
  { day: "Thursday", development: 4.5, meetings: 3.2, planning: 0.9 },
  { day: "Friday", development: 4.0, meetings: 2.8, planning: 1.7 },
]

const bottlenecksData = [
  { name: "Code Reviews", value: 35 },
  { name: "Waiting for Approval", value: 25 },
  { name: "Environment Setup", value: 20 },
  { name: "Dependency Issues", value: 15 },
  { name: "Other", value: 5 },
]

export default function InsightsPage() {
  const [timeRange, setTimeRange] = useState("last30days")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">AI Insights</h1>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Powered by Gemini
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
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
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    Completed Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">87</div>
                  <div className="flex items-center mt-1">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                      +12%
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">from last period</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Avg. Completion Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">3.2 days</div>
                  <div className="flex items-center mt-1">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                      -8%
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">from last period</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Bottlenecks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">4</div>
                  <div className="flex items-center mt-1">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400">
                      +1
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">from last period</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    Team Velocity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">35 pts</div>
                  <div className="flex items-center mt-1">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                      +15%
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">from last period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="performance" className="space-y-6">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Velocity</CardTitle>
                      <CardDescription>Actual vs. Predicted velocity over time</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-80">
                        <ChartContainer
                          config={{
                            actual: {
                              label: "Actual",
                              color: "hsl(var(--chart-1))",
                            },
                            predicted: {
                              label: "Predicted",
                              color: "hsl(var(--chart-2))",
                            },
                          }}
                          className="h-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={velocityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="week" />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} />
                              <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="var(--color-predicted)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Task Distribution</CardTitle>
                      <CardDescription>Breakdown of tasks by type</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={taskDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {taskDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} tasks`, "Count"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Time Spent Analysis</CardTitle>
                      <CardDescription>How the team spends their time during the week</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-80">
                        <ChartContainer
                          config={{
                            development: {
                              label: "Development",
                              color: "hsl(var(--chart-1))",
                            },
                            meetings: {
                              label: "Meetings",
                              color: "hsl(var(--chart-2))",
                            },
                            planning: {
                              label: "Planning",
                              color: "hsl(var(--chart-3))",
                            },
                          }}
                          className="h-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeSpentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="day" />
                              <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar dataKey="development" stackId="a" fill="var(--color-development)" />
                              <Bar dataKey="meetings" stackId="a" fill="var(--color-meetings)" />
                              <Bar dataKey="planning" stackId="a" fill="var(--color-planning)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="bottlenecks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Development Bottlenecks</CardTitle>
                    <CardDescription>Factors slowing down your development process</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bottlenecksData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {bottlenecksData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, "Impact"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Top Bottlenecks</h3>
                          <div className="space-y-4">
                            {bottlenecksData.slice(0, 3).map((item, index) => (
                              <div key={index}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{item.name}</span>
                                  <span>{item.value}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                  <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${item.value}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">AI Recommendations</h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span>Implement automated code review tools to speed up the review process</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span>Create a streamlined approval workflow with clear ownership</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span>Standardize development environments with containerization</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="predictions" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Project Completion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">June 15, 2024</div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Based on current velocity and remaining tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">85% confidence</Badge>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400">
                          2 weeks later than planned
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">Medium Risk</div>
                      <div className="text-sm text-muted-foreground mb-4">3 potential issues identified</div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          <span>Resource constraints in backend team</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                          <span>Dependency on third-party API updates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                          <span>Testing coverage below target</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-500" />
                        Team Capacity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">85% Utilized</div>
                      <div className="text-sm text-muted-foreground mb-4">Based on current workload and team size</div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">Frontend Team</span>
                            <span className="text-sm font-medium">95%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div className="bg-red-600 h-2 rounded-full" style={{ width: "95%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">Backend Team</span>
                            <span className="text-sm font-medium">80%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div className="bg-amber-600 h-2 rounded-full" style={{ width: "80%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">QA Team</span>
                            <span className="text-sm font-medium">70%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: "70%" }}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      AI-Powered Recommendations
                    </CardTitle>
                    <CardDescription>
                      Personalized suggestions to improve your team's productivity and project outcomes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Zap className="h-5 w-5 text-amber-500" />
                          Process Improvements
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Optimize Code Review Process</h4>
                            <p className="text-sm text-muted-foreground">
                              Code reviews are taking an average of 2.3 days, causing delays in your development cycle.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                                High Impact
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                                Easy to Implement
                              </Badge>
                            </div>
                          </div>
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Implement Daily Standups</h4>
                            <p className="text-sm text-muted-foreground">
                              Communication gaps are causing duplicate work and misalignment. Short daily standups can
                              improve coordination.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                                Medium Impact
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                                Easy to Implement
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Users className="h-5 w-5 text-purple-500" />
                          Team Optimization
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Rebalance Frontend Workload</h4>
                            <p className="text-sm text-muted-foreground">
                              Your frontend team is at 95% capacity, risking burnout. Consider redistributing tasks or
                              adding temporary resources.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/20 dark:text-red-400">
                                Urgent
                              </Badge>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400">
                                Medium Difficulty
                              </Badge>
                            </div>
                          </div>
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Cross-train QA and Development</h4>
                            <p className="text-sm text-muted-foreground">
                              QA team has capacity while developers are overloaded. Cross-training could improve
                              resource utilization.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                                High Impact
                              </Badge>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400">
                                Medium Difficulty
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-green-500" />
                          Planning Improvements
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Break Down Large Tasks</h4>
                            <p className="text-sm text-muted-foreground">
                              20% of your tasks take over 70% of development time. Breaking them down will improve
                              estimation and velocity.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                                High Impact
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                                Easy to Implement
                              </Badge>
                            </div>
                          </div>
                          <div className="border rounded-lg p-4 space-y-2">
                            <h4 className="font-medium">Implement Buffer Time</h4>
                            <p className="text-sm text-muted-foreground">
                              Your team consistently underestimates tasks by 15-20%. Adding buffer time to sprints will
                              improve predictability.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400">
                                Medium Impact
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400">
                                Easy to Implement
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}

