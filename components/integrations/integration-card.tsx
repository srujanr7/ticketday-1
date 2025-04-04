"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface IntegrationCardProps {
  name: string
  description: string
  icon: React.ReactNode
  connected?: boolean
  url?: string
  category: string
  onClick?: () => void
}

export function IntegrationCard({
  name,
  description,
  icon,
  connected = false,
  url,
  category,
  onClick,
}: IntegrationCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "productivity":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400"
      case "communication":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      case "design":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-800/20 dark:text-purple-400"
      case "development":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <Card
      className={cn("transition-all duration-200 overflow-hidden", isHovered && "shadow-md border-primary/30")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
          <Badge className={getCategoryColor(category)}>{category}</Badge>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {connected && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
            <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400"></div>
            <span>Connected</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        {url && (
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            Learn more <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        <Button onClick={onClick} variant={connected ? "outline" : "default"}>
          {connected ? "Manage" : "Connect"}
        </Button>
      </CardFooter>
    </Card>
  )
}

