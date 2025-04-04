"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { AIAssistant } from "./ai-assistant"
import { usePathname } from "next/navigation"

export function AiAssistantButton() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Only show on dashboard pages, not on landing or auth pages
  const shouldShow =
    pathname !== "/" &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/forgot-password") &&
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/invite")

  if (!shouldShow) return null

  return (
    <>
      {!isOpen && (
        <Button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg">
          <Sparkles className="h-6 w-6" />
        </Button>
      )}
      <AIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

