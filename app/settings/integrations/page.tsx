"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Github, Calendar, Slack, Zap, ExternalLink } from "lucide-react"
import { RequireAuth } from "@/components/auth/require-auth"
import { NotionIntegration } from "@/components/integrations/notion-integration"
import { GitHubIntegration } from "@/components/integrations/github-integration"
import { SlackIntegration } from "@/components/integrations/slack-integration"
import Link from "next/link"
import { getUserIntegrationStatus, getIntegrationConfig } from "@/app/actions/integration-actions"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Integration states
  const [integrations, setIntegrations] = useState({
    slack: {
      connected: false,
      config: null,
    },
    github: {
      connected: false,
      config: null,
    },
    googleCalendar: {
      connected: false,
      config: null,
    },
    zapier: {
      connected: false,
      config: null,
    },
    notion: {
      connected: false,
      config: null,
    },
  })

  useEffect(() => {
    // Fetch integration status from server
    async function fetchIntegrationStatus() {
      if (!user?.id) return

      try {
        setIsLoading(true)
        const status = await getUserIntegrationStatus(user.id)

        // Create a new state object
        const newIntegrations = { ...integrations }

        // Update each integration's connected status
        for (const [key, value] of Object.entries(status)) {
          if (key in newIntegrations) {
            newIntegrations[key as keyof typeof newIntegrations].connected = value.connected

            // If connected, fetch the config
            if (value.connected) {
              const config = await getIntegrationConfig(user.id, key as any)
              newIntegrations[key as keyof typeof newIntegrations].config = config
            }
          }
        }

        setIntegrations(newIntegrations)
      } catch (error) {
        console.error("Error fetching integration status:", error)
        setErrorMessage("Failed to load integration status. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegrationStatus()
  }, [user?.id])

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Integrations</h1>
              <Link href="/settings/integrations/all">
                <Button variant="outline">Browse All Integrations</Button>
              </Link>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="slack" className="space-y-6">
              <TabsList className="mb-4">
                <TabsTrigger value="slack" className="flex items-center gap-2">
                  <Slack className="h-4 w-4" />
                  Slack
                </TabsTrigger>
                <TabsTrigger value="github" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                </TabsTrigger>
                <TabsTrigger value="googleCalendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Google Calendar
                </TabsTrigger>
                <TabsTrigger value="zapier" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Zapier
                </TabsTrigger>
                <TabsTrigger value="notion" className="flex items-center gap-2">
                  <svg viewBox="0 0 99 99" className="h-4 w-4" fill="currentColor">
                    <path d="M24.03 12.54C30.43 12.54 35.63 17.74 35.63 24.14C35.63 30.54 30.43 35.74 24.03 35.74C17.63 35.74 12.43 30.54 12.43 24.14C12.43 17.74 17.63 12.54 24.03 12.54Z" />
                    <path d="M62.95 12.54C69.35 12.54 74.55 17.74 74.55 24.14C74.55 30.54 69.35 35.74 62.95 35.74C56.55 35.74 51.35 30.54 51.35 24.14C51.35 17.74 56.55 12.54 62.95 12.54Z" />
                    <path d="M24.03 51.47C30.43 51.47 35.63 56.67 35.63 63.07C35.63 69.47 30.43 74.67 24.03 74.67C17.63 74.67 12.43 69.47 12.43 63.07C12.43 56.67 17.63 51.47 24.03 51.47Z" />
                    <path d="M62.95 51.47C69.35 51.47 74.55 56.67 74.55 63.07C74.55 69.47 69.35 74.67 62.95 74.67C56.55 74.67 51.35 69.47 51.35 63.07C51.35 56.67 56.55 51.47 62.95 51.47Z" />
                  </svg>
                  Notion
                </TabsTrigger>
              </TabsList>

              {/* Slack Integration */}
              <TabsContent value="slack">
                <SlackIntegration connected={integrations.slack.connected} config={integrations.slack.config} />
              </TabsContent>

              {/* GitHub Integration */}
              <TabsContent value="github">
                <GitHubIntegration connected={integrations.github.connected} config={integrations.github.config} />
              </TabsContent>

              {/* Google Calendar Integration */}
              <TabsContent value="googleCalendar">
                {/* Similar to SlackIntegration and GitHubIntegration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#4285F4]" />
                        <CardTitle>Google Calendar Integration</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Google Cloud Console <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <CardDescription>
                      Connect TaskFlow with Google Calendar to sync deadlines, meetings, and create events from tasks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center py-8 text-muted-foreground">Google Calendar integration coming soon!</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Zapier Integration */}
              <TabsContent value="zapier">
                {/* Similar to SlackIntegration and GitHubIntegration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-[#FF4A00]" />
                        <CardTitle>Zapier Integration</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="https://zapier.com/app/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Zapier Dashboard <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <CardDescription>
                      Connect TaskFlow with Zapier to automate workflows with 3000+ apps and services.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center py-8 text-muted-foreground">Zapier integration coming soon!</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notion Integration */}
              <TabsContent value="notion">
                <NotionIntegration connected={integrations.notion.connected} config={integrations.notion.config} />
              </TabsContent>
            </Tabs>

            <div className="mt-8">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">API Keys and Security</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For security reasons, we don't store your API keys in plain text. All sensitive information is
                  encrypted before being stored in our database.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you need to update your API keys or credentials, you'll need to re-enter them completely.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}

