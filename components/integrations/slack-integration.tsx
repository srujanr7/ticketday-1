"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, ExternalLink, Slack, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { connectIntegration, disconnectIntegration, saveIntegrationSettings } from "@/app/actions/integration-actions"

interface SlackIntegrationProps {
  connected?: boolean
  config?: any
  onConnect?: (config: any) => Promise<{ success: boolean; message: string }>
  onDisconnect?: () => Promise<{ success: boolean; message: string }>
  onSaveSettings?: (settings: any) => Promise<{ success: boolean; message: string }>
}

export function SlackIntegration({
  connected = false,
  config = {},
  onConnect,
  onDisconnect,
  onSaveSettings,
}: SlackIntegrationProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  const webhookUrl = `${appUrl}/api/webhooks/slack`

  const [integrationData, setIntegrationData] = useState({
    apiKey: config.apiKey || "",
    botToken: config.botToken || "",
    signingSecret: config.signingSecret || "",
    webhookUrl: config.webhookUrl || "",
    teamId: config.teamId || "",
    notifications: {
      taskCreated: config.settings?.notifications?.taskCreated !== false,
      taskUpdated: config.settings?.notifications?.taskUpdated !== false,
      taskAssigned: config.settings?.notifications?.taskAssigned !== false,
      commentAdded: config.settings?.notifications?.commentAdded !== false,
      projectCreated: config.settings?.notifications?.projectCreated !== false,
    },
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setIntegrationData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNotificationToggle = (notification: string, checked: boolean) => {
    setIntegrationData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [notification]: checked,
      },
    }))
  }

  const handleConnect = async () => {
    if (!user?.id) return
    if (!integrationData.apiKey || !integrationData.botToken) {
      toast({
        title: "Missing information",
        description: "Slack API Key and Bot Token are required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const credentials = {
        apiKey: integrationData.apiKey,
        botToken: integrationData.botToken,
        signingSecret: integrationData.signingSecret,
        webhookUrl: integrationData.webhookUrl,
        teamId: integrationData.teamId,
      }

      const result = await connectIntegration("slack", credentials, user.id)

      if (result.success) {
        setSuccessMessage(result.message)
        toast({
          title: "Slack connected",
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
      console.error("Error connecting Slack:", error)
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
      const result = await disconnectIntegration("slack", user.id)

      if (result.success) {
        setSuccessMessage(result.message)
        toast({
          title: "Slack disconnected",
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
      console.error("Error disconnecting Slack:", error)
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
        notifications: integrationData.notifications,
      }

      const result = await saveIntegrationSettings("slack", settings, user.id)

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
      console.error("Error saving Slack settings:", error)
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
            <Slack className="h-5 w-5 text-[#4A154B]" />
            <CardTitle>Slack Integration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Slack API Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <CardDescription>
          Connect TaskFlow with Slack to receive notifications and updates about your projects and tasks.
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
            <Label htmlFor="slack-api-key">Slack API Key</Label>
            <Input
              id="slack-api-key"
              type="password"
              placeholder="xoxp-..."
              value={integrationData.apiKey}
              onChange={(e) => handleInputChange("apiKey", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              You can find your API key in the Slack API dashboard under "OAuth & Permissions".
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slack-bot-token">Bot User OAuth Token</Label>
            <Input
              id="slack-bot-token"
              type="password"
              placeholder="xoxb-..."
              value={integrationData.botToken}
              onChange={(e) => handleInputChange("botToken", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              The Bot User OAuth Token is used for posting messages to channels.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slack-signing-secret">Signing Secret</Label>
            <Input
              id="slack-signing-secret"
              type="password"
              placeholder="Your Slack signing secret"
              value={integrationData.signingSecret}
              onChange={(e) => handleInputChange("signingSecret", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">Found in the "Basic Information" section of your Slack app.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slack-team-id">Team ID</Label>
            <Input
              id="slack-team-id"
              placeholder="T0123456"
              value={integrationData.teamId}
              onChange={(e) => handleInputChange("teamId", e.target.value)}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              Your Slack workspace ID. You can find this in the Slack API dashboard.
            </p>
          </div>
        </div>

        {connected && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Webhook Configuration</h3>
              <div className="space-y-2">
                <Label htmlFor="slack-webhook-url">Webhook URL</Label>
                <div className="flex">
                  <Input id="slack-webhook-url" value={webhookUrl} readOnly className="rounded-r-none" />
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
                  Add this webhook URL to your Slack app's Event Subscriptions.
                </p>
              </div>
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Setup Instructions:</h4>
                <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                  <li>Go to your Slack App in the Slack API Dashboard</li>
                  <li>Navigate to "Event Subscriptions" and enable events</li>
                  <li>Paste the Webhook URL above as the Request URL</li>
                  <li>Subscribe to bot events: message.channels, reaction_added</li>
                  <li>Save changes and reinstall your app if needed</li>
                </ol>
              </div>
            </div>

            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Settings</h3>
              <div className="space-y-2">
                {[
                  { id: "taskCreated", label: "Task created" },
                  { id: "taskUpdated", label: "Task updated" },
                  { id: "taskAssigned", label: "Task assigned" },
                  { id: "commentAdded", label: "Comment added" },
                  { id: "projectCreated", label: "Project created" },
                ].map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between">
                    <Label htmlFor={`slack-${notification.id}`}>{notification.label}</Label>
                    <Switch
                      id={`slack-${notification.id}`}
                      checked={
                        integrationData.notifications[notification.id as keyof typeof integrationData.notifications] ||
                        false
                      }
                      onCheckedChange={(checked) => handleNotificationToggle(notification.id, checked)}
                    />
                  </div>
                ))}
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
            {isLoading ? "Connecting..." : "Connect Slack"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

