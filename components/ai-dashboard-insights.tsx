"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BarChart, TrendingUp, TrendingDown, Sparkles, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { generateProjectInsights, generateTeamInsights } from "@/lib/ai-service"

interface AIDashboardInsightsProps {
  projectId?: string
}

export function AIDashboardInsights({ projectId }: AIDashboardInsightsProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectInsights, setProjectInsights] = useState<any | null>(null)
  const [teamInsights, setTeamInsights] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState("project")

  useEffect(() => {
    if (user) {
      fetchInsights()
    }
  }, [user, projectId])

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // If projectId is provided, fetch insights for that project
      if (projectId) {
        const insights = await generateProjectInsights(projectId)
        setProjectInsights(insights)
      } else {
        // Otherwise, fetch team insights
        const insights = await generateTeamInsights(user?.id || "")
        setTeamInsights(insights)
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
      setError("Failed to load insights. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchInsights()
  }

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400"
    if (score >= 50) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  const getHealthBg = (score: number) => {
    if (score >= 70) return "bg-green-600"
    if (score >= 50) return "bg-amber-600"
    return "bg-red-600"
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>Automated analysis and recommendations for your projects and team</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!projectId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="project">Project Insights</TabsTrigger>
              <TabsTrigger value="team">Team Insights</TabsTrigger>
            </TabsList>
          </Tabs>
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
        ) : (
          <>
            {(activeTab === "project" || projectId) && projectInsights && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Project Health</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-bold ${getHealthColor(projectInsights.healthScore)}`}>
                        {projectInsights.healthScore}/100
                      </div>
                      {projectInsights.healthScore >= 70 ? (
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : projectInsights.healthScore >= 50 ? (
                        <BarChart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <Progress
                      value={projectInsights.healthScore}
                      className="h-2 mt-1"
                      indicatorClassName={getHealthBg(projectInsights.healthScore)}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Predicted Completion</div>
                    <div className="text-lg font-medium">
                      {projectInsights.predictedCompletion
                        ? new Date(projectInsights.predictedCompletion).toLocaleDateString()
                        : "Not available"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Risk Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {projectInsights.riskAreas.map((risk: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        >
                          {risk}
                        </Badge>
                      ))}
                      {projectInsights.riskAreas.length === 0 && (
                        <span className="text-sm text-muted-foreground">No significant risks detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Potential Bottlenecks</h4>
                    <div className="flex flex-wrap gap-2">
                      {projectInsights.bottlenecks.map((bottleneck: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        >
                          {bottleneck}
                        </Badge>
                      ))}
                      {projectInsights.bottlenecks.length === 0 && (
                        <span className="text-sm text-muted-foreground">No bottlenecks detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
                    <ul className="space-y-1 text-sm">
                      {projectInsights.recommendations.map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "team" && !projectId && teamInsights && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Team Performance</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-bold ${getHealthColor(teamInsights.teamPerformance.score)}`}>
                        {teamInsights.teamPerformance.score}/100
                      </div>
                      {teamInsights.teamPerformance.score >= 70 ? (
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : teamInsights.teamPerformance.score >= 50 ? (
                        <BarChart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <Progress
                      value={teamInsights.teamPerformance.score}
                      className="h-2 mt-1"
                      indicatorClassName={getHealthBg(teamInsights.teamPerformance.score)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Team Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {teamInsights.teamPerformance.strengths.map((strength: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        >
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Areas for Improvement</h4>
                    <div className="flex flex-wrap gap-2">
                      {teamInsights.teamPerformance.weaknesses.map((weakness: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        >
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
                    <ul className="space-y-1 text-sm">
                      {teamInsights.recommendations.map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

