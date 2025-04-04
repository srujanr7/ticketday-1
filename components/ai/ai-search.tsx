"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2, X, FileText, CheckSquare, FolderKanban, MessageSquare } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchResult {
  type: "task" | "project" | "comment" | "file"
  id: string
  title: string
  description?: string
  url?: string
  metadata?: Record<string, any>
}

export function AISearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 500)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }

      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (debouncedQuery.length > 2 && isOpen && user) {
      performSearch()
    } else if (debouncedQuery.length === 0) {
      setResults([])
    }
  }, [debouncedQuery, isOpen, user])

  const performSearch = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: debouncedQuery,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error("Error performing search:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false)

    if (result.url) {
      router.push(result.url)
    } else if (result.type === "task") {
      router.push(`/tasks/${result.id}`)
    } else if (result.type === "project") {
      router.push(`/projects/${result.id}`)
    } else if (result.type === "comment") {
      router.push(`/tasks/${result.metadata?.taskId}`)
    }
  }

  const getIconForResult = (type: string) => {
    switch (type) {
      case "task":
        return <CheckSquare className="h-4 w-4 text-blue-500" />
      case "project":
        return <FolderKanban className="h-4 w-4 text-green-500" />
      case "comment":
        return <MessageSquare className="h-4 w-4 text-amber-500" />
      case "file":
        return <FileText className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div ref={searchRef} className="relative">
      <Button
        variant="outline"
        className="w-full justify-between text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center">
          <Search className="mr-2 h-4 w-4" />
          <span>Search...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[20%] z-50 grid w-full max-w-lg translate-x-[-50%] gap-4">
            <Card className="border-2">
              <div className="flex items-center border-b p-2">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for tasks, projects, files..."
                  className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-0">
                {results.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto py-2">
                    {results.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}-${index}`}
                        className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-accent"
                        onClick={() => handleResultClick(result)}
                      >
                        {getIconForResult(result.type)}
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium">{result.title}</div>
                          {result.description && (
                            <div className="truncate text-xs text-muted-foreground">{result.description}</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{result.type}</div>
                      </div>
                    ))}
                  </div>
                ) : query.length > 0 && !isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{query}"</div>
                ) : null}

                {!query && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Type to search across tasks, projects, files, and more...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

