"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ExternalLink } from "lucide-react"

interface NotionIntegrationProps {
  connected?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onSaveSettings?: () => void
}

export function NotionIntegration({
  connected = false,
  onConnect,
  onDisconnect,
  onSaveSettings,
}: NotionIntegrationProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [integrationData, setIntegrationData] = useState({
    apiKey: "",
    workspaceId: "",
    syncPages: true,
    syncDatabases: true,
    createTasksFromPages: true,
    linkTasksToPages: true,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setIntegrationData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConnect = async () => {
    if (!integrationData.apiKey || !integrationData.workspaceId) {
      toast({
        title: "Missing information",
        description: "Notion API Key and Workspace ID are required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Call the onConnect callback which will use the server action
      if (onConnect) onConnect()
    } catch (error) {
      console.error("Error connecting Notion:", error)
      toast({
        title: "Connection failed",
        description: "Failed to connect to Notion. Please check your credentials and try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      // Call the onDisconnect callback which will use the server action
      if (onDisconnect) onDisconnect()
    } catch (error) {
      console.error("Error disconnecting Notion:", error)
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect from Notion. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Call the onSaveSettings callback which will use the server action
      if (onSaveSettings) onSaveSettings()
    } catch (error) {
      console.error("Error saving Notion settings:", error)
      toast({
        title: "Save failed",
        description: "Failed to save Notion settings. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 99 99" className="h-5 w-5" fill="currentColor">
              <path d="M24.03 12.54C30.43 12.54 35.63 17.74 35.63 24.14C35.63 30.54 30.43 35.74 24.03 35.74C17.63 35.74 12.43 30.54 12.43 24.14C12.43 17.74 17.63 12.54 24.03 12.54Z" />
              <path d="M62.95 12.54C69.35 12.54 74.55 17.74 74.55 24.14C74.55 30.54 69.35 35.74 62.95 35.74C56.55 35.74 51.35 30.54 51.35 24.14C51.35 17.74 56.55 12.54 62.95 12.54Z" />
              <path d="M24.03 51.47C30.43 51.47 35.63 56.67 35.63 63.07C35.63 69.47 30.43 74.67 24.03 74.67C17.63 74.67 12.43 69.47 12.43 63.07C12.43 56.67 17.63 51.47 24.03 51.47Z" />
              <path d="M62.95 51.47C69.35 51.47 74.55 56.67 74.55 63.07C74.55 69.47 69.35 74.67 62.95 74.67C56.55 74.67 51.35 69.47 51.35 63.07C51.35 56.67 56.55 51.47 62.95 51.47Z" />
            </svg>
            <CardTitle>Notion Integration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Notion Integrations <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <CardDescription>
          Connect TaskFlow with Notion to sync pages, databases, and create tasks from Notion pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!connected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notion-api-key">Notion API Key</Label>
              <Input
                id="notion-api-key"
                type="password"
                placeholder="secret_..."
                value={integrationData.apiKey}
                onChange={(e) => handleInputChange("apiKey", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find your API key in the Notion integrations dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notion-workspace-id">Workspace ID</Label>
              <Input
                id="notion-workspace-id"
                placeholder="Enter your Notion workspace ID"
                value={integrationData.workspaceId}
                onChange={(e) => handleInputChange("workspaceId", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The ID of your Notion workspace to connect with.</p>
            </div>
          </div>
        ) : (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notion Settings</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notion-sync-pages">Sync Pages</Label>
                  <Switch
                    id="notion-sync-pages"
                    checked={integrationData.syncPages}
                    onCheckedChange={(checked) => handleInputChange("syncPages", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Sync Notion pages with TaskFlow projects.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notion-sync-databases">Sync Databases</Label>
                  <Switch
                    id="notion-sync-databases"
                    checked={integrationData.syncDatabases}
                    onCheckedChange={(checked) => handleInputChange("syncDatabases", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Sync Notion databases with TaskFlow tasks.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notion-create-tasks">Create Tasks from Pages</Label>
                  <Switch
                    id="notion-create-tasks"
                    checked={integrationData.createTasksFromPages}
                    onCheckedChange={(checked) => handleInputChange("createTasksFromPages", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Automatically create tasks from new Notion pages.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notion-link-tasks">Link Tasks to Pages</Label>
                  <Switch
                    id="notion-link-tasks"
                    checked={integrationData.linkTasksToPages}
                    onCheckedChange={(checked) => handleInputChange("linkTasksToPages", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Link TaskFlow tasks to Notion pages.</p>
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
            {isLoading ? "Connecting..." : "Connect Notion"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

