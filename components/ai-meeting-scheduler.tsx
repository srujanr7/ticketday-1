"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Sparkles, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AIMeetingSchedulerProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: () => void
}

export function AIMeetingScheduler({ isOpen, onClose, projectId, onSuccess }: AIMeetingSchedulerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState("10:00")
  const [duration, setDuration] = useState("60")
  const [meetingType, setMeetingType] = useState("planning")
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false)

  // Fetch team members when the component mounts
  useState(() => {
    if (projectId) {
      fetchTeamMembers()
      checkGoogleCalendarConnection()
    }
  })

  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true)
    try {
      // Get project members
      const { data: projectMembers, error: membersError } = await supabase
        .from("project_members")
        .select(`
          user_id,
          users:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq("project_id", projectId)

      if (membersError) throw membersError

      // Get project owner
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("owner_id, users:owner_id(id, email, user_metadata)")
        .eq("id", projectId)
        .single()

      if (projectError) throw projectError

      // Combine members and owner
      const members = projectMembers.map((member) => ({
        id: member.user_id,
        name: member.users?.user_metadata?.name || member.users?.email?.split("@")[0] || "Unknown",
        email: member.users?.email,
        avatar: member.users?.user_metadata?.avatar_url,
      }))

      // Add owner if not already in members
      if (project?.owner_id) {
        const ownerExists = members.some((member) => member.id === project.owner_id)
        if (!ownerExists) {
          members.push({
            id: project.owner_id,
            name: project.users?.user_metadata?.name || project.users?.email?.split("@")[0] || "Unknown",
            email: project.users?.email,
            avatar: project.users?.user_metadata?.avatar_url,
          })
        }
      }

      setTeamMembers(members)

      // Auto-select current user
      if (user) {
        setSelectedAttendees([user.id])
      }
    } catch (error) {
      console.error("Error fetching team members:", error)
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const checkGoogleCalendarConnection = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "googleCalendar")
        .eq("status", "connected")
        .single()

      if (!error && data) {
        setIsGoogleCalendarConnected(true)
      }
    } catch (error) {
      console.error("Error checking Google Calendar connection:", error)
    }
  }

  const handleGenerateMeeting = async () => {
    if (!projectId || !user) return

    setIsGenerating(true)

    try {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("name, description")
        .eq("id", projectId)
        .single()

      if (projectError) throw projectError

      // Get recent tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (tasksError) throw tasksError

      // Call AI service to generate meeting details
      const response = await fetch("/api/ai/meeting-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          projectName: project?.name,
          projectDescription: project?.description,
          recentTasks: tasks,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate meeting")
      }

      const data = await response.json()

      if (data.meeting) {
        setTitle(data.meeting.title)
        setDescription(data.meeting.description)
        setMeetingType(data.meeting.type || "planning")
        setDuration(data.meeting.duration?.toString() || "60")

        // Set suggested attendees
        if (data.meeting.suggestedAttendees && data.meeting.suggestedAttendees.length > 0) {
          const attendeeIds = data.meeting.suggestedAttendees
            .map((email: string) => {
              const member = teamMembers.find((m) => m.email === email)
              return member?.id
            })
            .filter(Boolean)

          setSelectedAttendees([...new Set([...selectedAttendees, ...attendeeIds])])
        }

        toast({
          title: "Meeting Generated",
          description: "AI has suggested meeting details based on your project.",
        })
      }
    } catch (error) {
      console.error("Error generating meeting:", error)
      toast({
        title: "Generation Failed",
        description: "Could not generate meeting details. Please try manually.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateMeeting = async () => {
    if (!title || !date || !time || !projectId || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Format date for database
      const formattedDate = date.toISOString().split("T")[0]

      // Create event in database
      const { data, error } = await supabase
        .from("events")
        .insert({
          title,
          description,
          date: formattedDate,
          time,
          duration: Number.parseInt(duration),
          type: meetingType,
          project_id: projectId,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      const eventId = data[0].id

      // Add attendees
      for (const attendeeId of selectedAttendees) {
        await supabase.from("event_attendees").insert({
          event_id: eventId,
          user_id: attendeeId,
          status: attendeeId === user.id ? "accepted" : "pending",
          invited_at: new Date().toISOString(),
        })
      }

      // If Google Calendar is connected, create event there too
      if (isGoogleCalendarConnected) {
        try {
          await fetch("/api/integrations/google-calendar/create-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventId,
              userId: user.id,
            }),
          })
        } catch (calendarError) {
          console.error("Error creating Google Calendar event:", calendarError)
          // Don't fail the whole operation if calendar sync fails
        }
      }

      toast({
        title: "Meeting Scheduled",
        description: "Your meeting has been scheduled successfully.",
      })

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      console.error("Error scheduling meeting:", error)
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAttendee = (userId: string) => {
    if (selectedAttendees.includes(userId)) {
      setSelectedAttendees(selectedAttendees.filter((id) => id !== userId))
    } else {
      setSelectedAttendees([...selectedAttendees, userId])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule AI-Powered Meeting</DialogTitle>
          <DialogDescription>Create a meeting and automatically invite team members</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateMeeting}
              disabled={isGenerating}
              className="flex items-center gap-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Meeting title"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Meeting description and agenda"
              rows={3}
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
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
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
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Meeting Type
            </Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="retrospective">Retrospective</SelectItem>
                <SelectItem value="standup">Stand-up</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2 flex items-center justify-end gap-2">
              <Users className="h-4 w-4" />
              <Label>Attendees</Label>
            </div>
            <div className="col-span-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {isLoadingMembers ? (
                  <div className="text-sm text-muted-foreground">Loading team members...</div>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border ${
                        selectedAttendees.includes(member.id)
                          ? "border-primary bg-primary/10"
                          : "border-input hover:bg-accent"
                      }`}
                      onClick={() => toggleAttendee(member.id)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No team members available</div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="google-calendar"
                  checked={isGoogleCalendarConnected}
                  disabled={!isGoogleCalendarConnected}
                />
                <label
                  htmlFor="google-calendar"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    !isGoogleCalendarConnected ? "text-muted-foreground" : ""
                  }`}
                >
                  {isGoogleCalendarConnected
                    ? "Add to Google Calendar"
                    : "Connect Google Calendar in Integrations to sync events"}
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateMeeting} disabled={isLoading || !title || !date || !time}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Meeting"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

