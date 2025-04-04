"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegrationCard } from "@/components/integrations/integration-card"
import { useRouter } from "next/navigation"
import {
  Github,
  Slack,
  Calendar,
  Zap,
  Figma,
  FileImage,
  Trello,
  FileText,
  Mail,
  MessageSquare,
  Video,
  Phone,
} from "lucide-react"

export default function AllIntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  // Mock data for integrations
  const integrations = [
    {
      name: "Slack",
      description: "Connect TaskFlow with Slack to receive notifications and updates about your projects and tasks.",
      icon: <Slack className="h-5 w-5 text-[#4A154B]" />,
      connected: true,
      url: "https://slack.com/apps",
      category: "Communication",
    },
    {
      name: "GitHub",
      description: "Connect TaskFlow with GitHub to sync issues, pull requests, and automate task creation.",
      icon: <Github className="h-5 w-5" />,
      connected: true,
      url: "https://github.com/apps",
      category: "Development",
    },
    {
      name: "Google Calendar",
      description: "Connect TaskFlow with Google Calendar to sync deadlines, meetings, and create events from tasks.",
      icon: <Calendar className="h-5 w-5 text-[#4285F4]" />,
      connected: false,
      url: "https://calendar.google.com",
      category: "Productivity",
    },
    {
      name: "Zapier",
      description: "Connect TaskFlow with Zapier to automate workflows with 3000+ apps and services.",
      icon: <Zap className="h-5 w-5 text-[#FF4A00]" />,
      connected: false,
      url: "https://zapier.com",
      category: "Productivity",
    },
    {
      name: "Figma",
      description: "Connect TaskFlow with Figma to link design files to tasks and get notifications on design updates.",
      icon: <Figma className="h-5 w-5 text-black dark:text-white" />,
      connected: false,
      url: "https://figma.com",
      category: "Design",
    },
    {
      name: "Canva",
      description: "Connect TaskFlow with Canva to link design projects and collaborate on creative assets.",
      icon: <FileImage className="h-5 w-5 text-[#00C4CC]" />,
      connected: false,
      url: "https://canva.com",
      category: "Design",
    },
    {
      name: "Trello",
      description: "Connect TaskFlow with Trello to sync boards, cards, and lists between both platforms.",
      icon: <Trello className="h-5 w-5 text-[#0079BF]" />,
      connected: false,
      url: "https://trello.com",
      category: "Productivity",
    },
    {
      name: "Google Drive",
      description: "Connect TaskFlow with Google Drive to attach files to tasks and collaborate on documents.",
      icon: <FileText className="h-5 w-5 text-[#4285F4]" />,
      connected: false,
      url: "https://drive.google.com",
      category: "Productivity",
    },
    {
      name: "Gmail",
      description: "Connect TaskFlow with Gmail to create tasks from emails and track email conversations.",
      icon: <Mail className="h-5 w-5 text-[#D14836]" />,
      connected: false,
      url: "https://gmail.com",
      category: "Communication",
    },
    {
      name: "Microsoft Teams",
      description: "Connect TaskFlow with Microsoft Teams to collaborate on tasks and receive notifications.",
      icon: <MessageSquare className="h-5 w-5 text-[#6264A7]" />,
      connected: false,
      url: "https://teams.microsoft.com",
      category: "Communication",
    },
    {
      name: "Zoom",
      description: "Connect TaskFlow with Zoom to schedule meetings and link them to tasks.",
      icon: <Video className="h-5 w-5 text-[#2D8CFF]" />,
      connected: false,
      url: "https://zoom.us",
      category: "Communication",
    },
    {
      name: "Twilio",
      description: "Connect TaskFlow with Twilio to send SMS notifications for task updates and reminders.",
      icon: <Phone className="h-5 w-5 text-[#F22F46]" />,
      connected: false,
      url: "https://twilio.com",
      category: "Communication",
    },
  ]

  const filteredIntegrations = integrations.filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleIntegrationClick = (integrationName: string) => {
    router.push("/settings/integrations")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">All Integrations</h1>
            <Button variant="outline" onClick={() => router.push("/settings/integrations")}>
              Back to Integrations
            </Button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <Input
              placeholder="Search integrations..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="productivity">Productivity</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="development">Development</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.name}
                    name={integration.name}
                    description={integration.description}
                    icon={integration.icon}
                    connected={integration.connected}
                    url={integration.url}
                    category={integration.category}
                    onClick={() => handleIntegrationClick(integration.name)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="productivity" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations
                  .filter((integration) => integration.category.toLowerCase() === "productivity")
                  .map((integration) => (
                    <IntegrationCard
                      key={integration.name}
                      name={integration.name}
                      description={integration.description}
                      icon={integration.icon}
                      connected={integration.connected}
                      url={integration.url}
                      category={integration.category}
                      onClick={() => handleIntegrationClick(integration.name)}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations
                  .filter((integration) => integration.category.toLowerCase() === "communication")
                  .map((integration) => (
                    <IntegrationCard
                      key={integration.name}
                      name={integration.name}
                      description={integration.description}
                      icon={integration.icon}
                      connected={integration.connected}
                      url={integration.url}
                      category={integration.category}
                      onClick={() => handleIntegrationClick(integration.name)}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="development" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations
                  .filter((integration) => integration.category.toLowerCase() === "development")
                  .map((integration) => (
                    <IntegrationCard
                      key={integration.name}
                      name={integration.name}
                      description={integration.description}
                      icon={integration.icon}
                      connected={integration.connected}
                      url={integration.url}
                      category={integration.category}
                      onClick={() => handleIntegrationClick(integration.name)}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations
                  .filter((integration) => integration.category.toLowerCase() === "design")
                  .map((integration) => (
                    <IntegrationCard
                      key={integration.name}
                      name={integration.name}
                      description={integration.description}
                      icon={integration.icon}
                      connected={integration.connected}
                      url={integration.url}
                      category={integration.category}
                      onClick={() => handleIntegrationClick(integration.name)}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

