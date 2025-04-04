"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BarChart, TrendingUp, TrendingDown, Sparkles, RefreshCw, Download } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth/auth-provider"
import { generateReportInsights } from "@/lib/ai-service"

export function AIReportsInsights() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<any | null>(null)
  const [timeframe, setTimeframe] = useState("last30days")

  useEffect(() => {
    if (user) {
      fetchInsights()
    }
  }, [user, timeframe])

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const reportInsights = await generateReportInsights(user?.id || "", timeframe)
      setInsights(reportInsights)
    } catch (error) {
      console.error("Error fetching report insights:", error)
      setError("Failed to load insights. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchInsights()
  }

  const handleExport = () => {
    if (!insights) return

    // Create CSV content
    const csvContent = [
      ["Metric", "Value"],
      ["Total Projects", insights.keyMetrics.totalProjects],
      ["Total Tasks", insights.keyMetrics.totalTasks],
      ["Completed Tasks", insights.keyMetrics.completedTasks],
      ["Completion Rate", `${insights.keyMetrics.completionRate}%`],
      ["High Priority Tasks", insights.keyMetrics.highPriorityTasks],
      ["Medium Priority Tasks", insights.keyMetrics.mediumPriorityTasks],
      ["Low Priority Tasks", insights.keyMetrics.lowPriorityTasks],
      ["To Do Tasks", insights.keyMetrics.todoTasks],
      ["In Progress Tasks", insights.keyMetrics.inProgressTasks],
      ["Review Tasks", insights.keyMetrics.reviewTasks],
      ["", ""],
      ["Summary", insights.summary],
      ["", ""],
      ["Recommendations", ""],
      ...insights.recommendations.map((rec: string) => ["", rec]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `taskflow-report-${timeframe}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI-Powered Analytics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="thisyear">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <CardDescription>AI-generated insights and recommendations based on your project data</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-2">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : insights ? (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Performance Summary</h3>
              <p className="text-sm">{insights.summary}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Key Metrics</h3>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm">Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold">{insights.keyMetrics.totalProjects}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold">{insights.keyMetrics.totalTasks}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">{insights.keyMetrics.completedTasks} completed</span>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold">{insights.keyMetrics.completionRate}%</div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${insights.keyMetrics.completionRate}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm">High Priority</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold">{insights.keyMetrics.highPriorityTasks}</div>
                    <p className="text-xs text-muted-foreground">out of {insights.keyMetrics.totalTasks} tasks</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Trends</h3>
              <div className="space-y-4">
                {insights.trends.map((trend: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{trend.name}</div>
                      <div className="flex items-center gap-1 text-sm">
                        {trend.change > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : trend.change < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <BarChart className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={trend.change > 0 ? "text-green-500" : trend.change < 0 ? "text-red-500" : ""}>
                          {trend.change > 0 ? "+" : ""}
                          {trend.change}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-2 items-center space-x-1">
                      {trend.data.map((value: number, i: number) => (
                        <div
                          key={i}
                          className={`h-full rounded-full flex-1 ${
                            i === trend.data.length - 1 ? "bg-primary" : "bg-primary/30"
                          }`}
                          style={{ opacity: 0.3 + (i * 0.7) / trend.data.length }}
                        ></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">AI Recommendations</h3>
              <ul className="space-y-2">
                {insights.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 bg-muted/30 p-2 rounded-md">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available for analysis</p>
            <Button variant="outline" className="mt-4" onClick={handleRefresh}>
              Refresh Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

