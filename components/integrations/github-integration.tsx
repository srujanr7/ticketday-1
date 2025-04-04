"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, ExternalLink, Github, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { connectIntegration, disconnectIntegration, saveIntegrationSettings } from "@/app/actions/integration-actions"

interface GitHubIntegrationProps {
  connected?: boolean
  config?: any
  onConnect?: (config: any) => Promise<{ success: boolean; message: string }>
  onDisconnect?: () => Promise<{ success: boolean; message: string }>
  onSaveSettings?: (settings: any) => Promise<{ success: boolean; message: string }>
}

export function GitHubIntegration({
  connected = false,
  config = {},
  onConnect,
  onDisconnect,
  onSaveSettings,
}: GitHubIntegrationProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  const webhookUrl = `${appUrl}/api/webhooks/github`

  const [integrationData, setIntegrationData] = useState({
    accessToken: config.accessToken || "",
    repositories: config.repositories || "",
    webhookSecret: config.webhookSecret || "",
    autoCreateTasks: config.settings?.autoCreateTasks !== false,
    linkPullRequests: config.settings?.linkPullRequests !== false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setIntegrationData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConnect = async () => {
    if (!user?.id) return
    if (!integrationData.accessToken || !integrationData.repositories) {
      toast({
        title: "Missing information",
        description: "GitHub access token and repositories are required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const credentials = {
        accessToken: integrationData.accessToken,
        repositories: integrationData.repositories,
        webhookSecret: integrationData.webhookSecret,
      }

      const result = await connectIntegration("github", credentials, user.id)

      if (result.success) {
        setSuccessMessage(result.message)
        toast({
          title: "GitHub connected",
          description: result.message,
        })
      } else {
        setErrorMessage(result.message)
        toast({
          title: "Connection failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error connecting GitHub:", error)
      setErrorMessage("An unexpected error occurred")
      toast({
        title: "Connection failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user?.id) return

    setIsLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const result = await disconnectIntegration("github", user.id)

      if (result.success) {
        setSuccessMessage(result.message)
        toast({
          title: "GitHub disconnected",
          description: result.message,
        })
      } else {
        setErrorMessage(result.message)
        toast({
          title: "Disconnection failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      setErrorMessage("An unexpected error occurred")
      toast({
        title: "Disconnection failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!user?.id) return

    setIsLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const settings = {
        autoCreateTasks: integrationData.autoCreateTasks,
        linkPullRequests: integrationData.linkPullRequests,
      }

      const result = await saveIntegrationSettings("github", settings, user.id)

      if (result.success) {
        setSuccessMessage(result.message)
        toast({
          title: "Settings saved",
          description: result.message,
        })
      } else {
        setErrorMessage(result.message)
        toast({
          title: "Save failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving GitHub settings:", error)
      setErrorMessage("An unexpected error occurred")
      toast({
        title: "Save failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The webhook URL has been copied to your clipboard",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              GitHub Tokens <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <CardDescription>
          Connect TaskFlow with GitHub to sync issues, pull requests, and automate task creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-600 dark:text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-access-token">GitHub Personal Access Token</Label>
            <Input
              id="github-access-token"
              type="password"
              placeholder="ghp_..."
              value={integrationData.accessToken}
              onChange={(e) => handleInputChange("accessToken", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              Create a personal access token with repo and workflow scopes.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="github-repositories">Repositories (comma-separated)</Label>
            <Input
              id="github-repositories"
              placeholder="username/repo, organization/repo"
              value={integrationData.repositories}
              onChange={(e) => handleInputChange("repositories", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">Specify which repositories to sync with TaskFlow.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="github-webhook-secret">Webhook Secret (optional)</Label>
            <Input
              id="github-webhook-secret"
              type="password"
              placeholder="A secure random string"
              value={integrationData.webhookSecret}
              onChange={(e) => handleInputChange("webhookSecret", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              Create a secret to secure your webhook. This should be a random string.
            </p>
          </div>
        </div>

        {connected && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Webhook Configuration</h3>
              <div className="space-y-2">
                <Label htmlFor="github-webhook-url">Webhook URL</Label>
                <div className="flex">
                  <Input id="github-webhook-url" value={webhookUrl} readOnly className="rounded-r-none" />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this webhook URL to your GitHub repository settings.
                </p>
              </div>
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Setup Instructions:</h4>
                <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                  <li>Go to your GitHub repository</li>
                  <li>Navigate to Settings &gt; Webhooks &gt; Add webhook</li>
                  <li>Paste the Webhook URL above</li>
                  <li>Set Content type to "application/json"</li>
                  <li>Enter your Webhook Secret if you provided one</li>
                  <li>Select "Let me select individual events"</li>
                  <li>Check: Issues, Pull requests, and Push</li>
                  <li>Click "Add webhook"</li>
                </ol>
              </div>
            </div>

            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">GitHub Settings</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="github-auto-create-tasks">Auto-create tasks from issues</Label>
                  <Switch
                    id="github-auto-create-tasks"
                    checked={integrationData.autoCreateTasks}
                    onCheckedChange={(checked) => handleInputChange("autoCreateTasks", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="github-link-prs">Link pull requests to tasks</Label>
                  <Switch
                    id="github-link-prs"
                    checked={integrationData.linkPullRequests}
                    onCheckedChange={(checked) => handleInputChange("linkPullRequests", checked)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {connected ? (
          <>
            <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
              Disconnect
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect GitHub"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

