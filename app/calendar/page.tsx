"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function CalendarPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleString("default", { month: "long" }))
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString())
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "",
    project_id: "",
    type: "meeting",
  })
  const [projects, setProjects] = useState<any[]>([])
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthName = today.toLocaleString("default", { month: "long" })

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchProjects()
    }
  }, [user])

  useEffect(() => {
    setCurrentMonth(monthName)
    setCurrentYear(year.toString())
  }, [monthName, year])

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch events created by the user
      const { data: userEvents, error: userEventsError } = await supabase
        .from("events")
        .select("*, projects(name)")
        .eq("created_by", user?.id)
        .order("date", { ascending: true })

      if (userEventsError) throw userEventsError

      // Fetch events from projects the user is a member of
      const { data: projectMembers, error: projectMembersError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user?.id)

      if (projectMembersError) throw projectMembersError

      const projectIds = projectMembers.map((pm) => pm.project_id)

      let projectEvents: any[] = []
      if (projectIds.length > 0) {
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("*, projects(name)")
          .in("project_id", projectIds)
          .order("date", { ascending: true })

        if (eventsError) throw eventsError

        projectEvents = events || []
      }

      // Combine and deduplicate events
      const allEvents = [...(userEvents || []), ...projectEvents]
      const uniqueEvents = Array.from(new Map(allEvents.map((event) => [event.id, event])).values())

      setEvents(uniqueEvents)
    } catch (error) {
      console.error("Error fetching events:", error)
      setError("Failed to load events. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      // Fetch projects owned by the user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("owner_id", user?.id)
        .order("name", { ascending: true })

      if (ownedError) throw ownedError

      // Fetch projects where the user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select(`
          project_id,
          projects:project_id (id, name)
        `)
        .eq("user_id", user?.id)

      if (memberError) throw memberError

      // Combine and deduplicate projects
      const memberProjectsData = memberProjects.map((item) => item.projects)
      const allProjects = [...(ownedProjects || []), ...memberProjectsData]

      // Remove duplicates
      const uniqueProjects = Array.from(
        new Map(allProjects.filter(Boolean).map((project) => [project.id, project])).values(),
      )

      setProjects(uniqueProjects)
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const handleCreateEvent = async () => {
    try {
      if (!eventForm.title) {
        toast({
          title: "Title required",
          description: "Please enter a title for the event.",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: eventForm.title,
          description: eventForm.description,
          date: eventForm.date.toISOString().split("T")[0],
          time: eventForm.time,
          project_id: eventForm.project_id || null,
          type: eventForm.type,
          created_by: user?.id,
        })
        .select()

      if (error) throw error

      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      })

      setEvents([...events, data[0]])
      setIsEventDialogOpen(false)
      resetEventForm()
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetEventForm = () => {
    setEventForm({
      title: "",
      description: "",
      date: new Date(),
      time: "",
      project_id: "",
      type: "meeting",
    })
  }

  const handleOpenEventDialog = (date?: Date) => {
    if (date) {
      setEventForm((prev) => ({ ...prev, date }))
    }
    setIsEventDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEventForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setEventForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setEventForm((prev) => ({ ...prev, date }))
    }
  }

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    // Add day names
    for (let i = 0; i < 7; i++) {
      days.push({ type: "dayName", value: dayNames[i] })
    }

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ type: "empty" })
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`
      const dayEvents = events.filter((event) => event.date === date)
      days.push({
        type: "day",
        value: i,
        date,
        events: dayEvents,
        isToday: i === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      })
    }

    return days
  }, [events, year, month, today])

  const getEventTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "meeting":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400"
      case "review":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-800/20 dark:text-purple-400"
      case "presentation":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      case "planning":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      case "demo":
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Calendar</h1>
            <Button onClick={() => handleOpenEventDialog()}>
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
                className="mr-2 h-4 w-4"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Event
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
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
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span className="sr-only">Previous Month</span>
              </Button>
              <h2 className="text-xl font-semibold">
                {currentMonth} {currentYear}
              </h2>
              <Button variant="outline" size="icon">
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
                  className="h-4 w-4"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <span className="sr-only">Next Month</span>
              </Button>
              <Button variant="outline" size="sm" className="ml-2">
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="month">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="agenda">Agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day.type === "dayName") {
                return (
                  <div key={index} className="p-2 text-center font-medium text-sm text-muted-foreground">
                    {day.value}
                  </div>
                )
              } else if (day.type === "empty") {
                return <div key={index} className="p-2 min-h-24 bg-gray-50 dark:bg-gray-900/50"></div>
              } else {
                return (
                  <div
                    key={index}
                    className={`p-2 min-h-24 border border-gray-100 dark:border-gray-800 ${
                      day.isToday ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                    onClick={() => handleOpenEventDialog(new Date(day.date))}
                    role="button"
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${day.isToday ? "text-blue-600 dark:text-blue-400" : ""}`}
                    >
                      {day.value}
                    </div>
                    <div className="space-y-1">
                      {day.events &&
                        day.events.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-1">
                              <Badge className={`${getEventTypeColor(event.type)} h-1.5 w-1.5 rounded-full p-0`} />
                              <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              }
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Upcoming Events</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Skeleton className="h-5 w-[200px] mb-2" />
                        <Skeleton className="h-4 w-[150px] mb-2" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                      <Skeleton className="h-6 w-[80px]" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events
                  .filter((event) => new Date(event.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((event) => (
                    <Card key={event.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()} • {event.time || "All day"}
                          </p>
                          <p className="text-sm mt-1">{event.projects?.name || "No project"}</p>
                        </div>
                        <Badge className={getEventTypeColor(event.type)}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No upcoming events. Click on a day or the "New Event" button to create one.
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={eventForm.title}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={eventForm.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !eventForm.date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventForm.date ? format(eventForm.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={eventForm.date} onSelect={handleDateChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={eventForm.time}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project
              </Label>
              <Select value={eventForm.project_id} onValueChange={(value) => handleSelectChange("project_id", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select value={eventForm.type} onValueChange={(value) => handleSelectChange("type", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!eventForm.title || !eventForm.date}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

