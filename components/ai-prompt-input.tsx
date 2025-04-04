"use client"

import type React from "react"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

interface AIPromptInputProps {
  id: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
}

export function AIPromptInput({ id, name, value, onChange, placeholder }: AIPromptInputProps) {
  const [isTyping, setIsTyping] = useState(false)

  return (
    <div className="relative">
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e)
          setIsTyping(e.target.value.length > 0)
        }}
        placeholder={placeholder}
        rows={6}
        className="pr-10"
      />
      <div className={`absolute right-3 bottom-3 transition-opacity ${isTyping ? "opacity-100" : "opacity-0"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-blue-600 animate-pulse"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M13 8h2" />
          <path d="M13 12h2" />
        </svg>
      </div>
    </div>
  )
}

