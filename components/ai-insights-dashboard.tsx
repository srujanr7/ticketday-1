"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Sparkles, AlertTriangle, TrendingUp, Clock, Users, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

// Initialize the Google Generative AI model
const gemini = google("gemini-1.5-flash")

export function AIInsightsDashboard({ projectId }: { projectId?: string }) {
  const { user } = useAuth()
  const [insights, setInsights] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      generateInsights()
    }
  }, [user, projectId])

  const generateInsights = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch project data
      const projectData: any = {}

      if (projectId) {
        // Fetch specific project data
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single()

        if (projectError) throw projectError
        projectData.project = project

        // Fetch tasks for this project
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select(`
            *,
            task_assignments(
              user_id,
              users:user_id(id, email, user_metadata)
            )
          `)
          .eq("project_id", projectId)

        if (tasksError) throw tasksError
        projectData.tasks = tasks

        // Fetch team members for this project
        const { data: members, error: membersError } = await supabase
          .from("project_members")
          .select(`
            user_id,
            users:user_id(id, email, user_metadata)
          `)
          .eq("project_id", projectId)

        if (membersError) throw membersError
        projectData.members = members
      } else {
        // Fetch all user's projects
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .or(`owner_id.eq.${user?.id},project_members.user_id.eq.${user?.id}`)

        if (projectsError) throw projectsError
        projectData.projects = projects

        // Fetch all tasks for user's projects
        const projectIds = projects.map((p) => p.id)

        if (projectIds.length > 0) {
          const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select(`
              *,
              task_assignments(
                user_id,
                users:user_id(id, email, user_metadata)
              )
            `)
            .in("project_id", projectIds)

          if (tasksError) throw tasksError
          projectData.tasks = tasks
        } else {
          projectData.tasks = []
        }
      }

      // Use AI to generate insights
      const prompt = `
        Analyze this project data and generate insights and recommendations.
        
        ${projectId ? "Project Data:" : "User Projects Data:"}
        ${JSON.stringify(projectData, null, 2)}
        
        Generate the following insights:
        1. Project health status (On Track, At Risk, Behind Schedule)
        2. Key bottlenecks or blockers
        3. Resource allocation recommendations
        4. Timeline predictions
        5. Task prioritization suggestions
        6. Team performance insights
        
        Format your response as JSON with the following structure:
        {
          "status": "On Track|At Risk|Behind Schedule",
          "bottlenecks": [
            { "issue": "Description of bottleneck", "severity": "High|Medium|Low", "recommendation": "How to address it" }
          ],
          "resourceRecommendations": [
            { "recommendation": "Resource allocation suggestion", "impact": "High|Medium|Low" }
          ],
          "timelinePrediction": {
            "onTrack": true|false,
            "predictedCompletion": "YYYY-MM-DD",
            "confidence": "High|Medium|Low",
            "details": "Explanation of prediction"
          },
          "taskPrioritization": [
            { "taskId": "id", "suggestedPriority": "High|Medium|Low", "reasoning": "Why this priority" }
          ],
          "teamInsights": [
            { "insight": "Team performance observation", "recommendation": "Suggested action" }
          ]
        }
      `

      const { text } = await generateText({
        model: gemini,
        prompt: prompt,
        temperature: 0.2,
      })

      // Parse the AI response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          setInsights(JSON.parse(jsonMatch[0]))
        } else {
          throw new Error("Could not parse AI response")
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        setError("Failed to generate insights. Please try again.")
      }
    } catch (error) {
      console.error("Error generating insights:", error)
      setError("Failed to fetch project data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Track":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "At Risk":
        return "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400"
      case "Behind Schedule":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "Medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400"
      case "Low":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              AI Project Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis and recommendations for your {projectId ? "project" : "projects"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateInsights} disabled={isLoading}>
            {isLoading ? "Generating..." : "Refresh Insights"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            <div className="h-24 w-full bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            <div className="h-24 w-full bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
          </div>
        ) : insights ? (
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium">Project Status:</h3>
                  <Badge className={`ml-2 ${getStatusColor(insights.status)}`}>{insights.status}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                        Top Bottleneck
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {insights.bottlenecks && insights.bottlenecks.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm">{insights.bottlenecks[0].issue}</p>
                            <Badge className={getSeverityColor(insights.bottlenecks[0].severity)}>
                              {insights.bottlenecks[0].severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{insights.bottlenecks[0].recommendation}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No bottlenecks detected</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                        Timeline Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {insights.timelinePrediction ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm">Predicted Completion:</p>
                            <Badge
                              className={
                                insights.timelinePrediction.onTrack
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {insights.timelinePrediction.predictedCompletion}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{insights.timelinePrediction.details}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No timeline prediction available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Users className="mr-2 h-4 w-4 text-blue-500" />
                        Team Insight
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {insights.teamInsights && insights.teamInsights.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm">{insights.teamInsights[0].insight}</p>
                          <p className="text-xs text-muted-foreground">{insights.teamInsights[0].recommendation}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No team insights available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bottlenecks">
              <div className="space-y-4">
                {insights.bottlenecks && insights.bottlenecks.length > 0 ? (
                  insights.bottlenecks.map((bottleneck: any, index: number) => (
                    <Alert key={index} className="flex justify-between items-start">
                      <div>
                        <AlertTitle className="flex items-center">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {bottleneck.issue}
                        </AlertTitle>
                        <AlertDescription className="mt-2">{bottleneck.recommendation}</AlertDescription>
                      </div>
                      <Badge className={getSeverityColor(bottleneck.severity)}>{bottleneck.severity}</Badge>
                    </Alert>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No bottlenecks detected</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="resources">
              <div className="space-y-4">
                {insights.resourceRecommendations && insights.resourceRecommendations.length > 0 ? (
                  insights.resourceRecommendations.map((recommendation: any, index: number) => (
                    <Alert key={index} className="flex justify-between items-start">
                      <div>
                        <AlertTitle className="flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Resource Recommendation
                        </AlertTitle>
                        <AlertDescription className="mt-2">{recommendation.recommendation}</AlertDescription>
                      </div>
                      <Badge className={getSeverityColor(recommendation.impact)}>{recommendation.impact}</Badge>
                    </Alert>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No resource recommendations available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="space-y-4">
                {insights.timelinePrediction ? (
                  <>
                    <Alert className={insights.timelinePrediction.onTrack ? "border-green-500" : "border-red-500"}>
                      <Clock className="h-4 w-4" />
                      <AlertTitle>{insights.timelinePrediction.onTrack ? "On Track" : "Timeline at Risk"}</AlertTitle>
                      <AlertDescription>
                        Predicted completion: <strong>{insights.timelinePrediction.predictedCompletion}</strong>
                        <br />
                        Confidence:{" "}
                        <Badge className={getSeverityColor(insights.timelinePrediction.confidence)}>
                          {insights.timelinePrediction.confidence}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Timeline Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{insights.timelinePrediction.details}</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No timeline prediction available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team">
              <div className="space-y-4">
                {insights.teamInsights && insights.teamInsights.length > 0 ? (
                  insights.teamInsights.map((insight: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Team Insight
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm font-medium">{insight.insight}</p>
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>{insight.recommendation}</AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No team insights available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No insights available. Click "Refresh Insights" to generate AI-powered project analysis.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

