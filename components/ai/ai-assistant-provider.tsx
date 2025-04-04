"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import { AIAssistant } from "./ai-assistant"
import { AiAssistantButton } from "./ai-assistant-button"

type AIAssistantContextType = {
  isOpen: boolean
  openAssistant: () => void
  closeAssistant: () => void
  toggleAssistant: () => void
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined)

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openAssistant = () => setIsOpen(true)
  const closeAssistant = () => setIsOpen(false)
  const toggleAssistant = () => setIsOpen((prev) => !prev)

  const value = {
    isOpen,
    openAssistant,
    closeAssistant,
    toggleAssistant,
  }

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
      {isOpen && <AIAssistant isOpen={isOpen} onClose={closeAssistant} />}
      <AiAssistantButton isOpen={isOpen} toggleAssistant={toggleAssistant} />
    </AIAssistantContext.Provider>
  )
}

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext)
  if (context === undefined) {
    throw new Error("useAIAssistant must be used within an AIAssistantProvider")
  }
  return context
}

