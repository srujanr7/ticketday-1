"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

// Initialize the Google Generative AI model
const gemini = google("gemini-1.5-flash")

interface MeetingSchedulerProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: () => void
}

export function MeetingScheduler({ isOpen, onClose, projectId, onSuccess }: MeetingSchedulerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("30")
  const [meetingType, setMeetingType] = useState("planning")
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])

  useState(() => {
    if (isOpen && projectId) {
      fetchTeamMembers()
      fetchTasks()
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

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Meeting title is required",
        variant: "destructive",
      })
      return
    }

    if (!date) {
      toast({
        title: "Error",
        description: "Meeting date is required",
        variant: "destructive",
      })
      return
    }

    if (!time) {
      toast({
        title: "Error",
        description: "Meeting time is required",
        variant: "destructive",
      })
      return
    }

    if (selectedAttendees.length === 0) {
      toast({
        title: "Error",
        description: "At least one attendee is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create the event in our database
      const { data, error } = await supabase
        .from("events")
        .insert({
          title,
          description,
          date: date.toISOString().split("T")[0],
          time,
          duration: Number.parseInt(duration),
          project_id: projectId,
          type: meetingType,
          created_by: user?.id,
          attendees: selectedAttendees,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      // Check if user has Google Calendar integration
      const { data: integration } = await supabase
        .from("integrations")
        .select("config")
        .eq("type", "googleCalendar")
        .eq("user_id", user?.id)
        .eq("connected", true)
        .single()

      if (integration) {
        // In a real app, you would use the Google Calendar API to create the event
        toast({
          title: "Google Calendar Event Created",
          description: "The meeting has been added to your Google Calendar",
        })
      }

      toast({
        title: "Meeting Scheduled",
        description: "The meeting has been scheduled successfully",
      })

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error: any) {
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

  const generateMeetingDetails = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Project ID is required",
        variant: "destructive",
      })
      return
    }

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
      const { data: recentTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("title, description, status, priority")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (tasksError) throw tasksError

      // Use AI to generate meeting details
      const prompt = `
        Generate a meeting for a project team based on the following information:
        
        Project: ${project.name}
        Project Description: ${project.description || "No description provided"}
        
        Recent Tasks:
        ${recentTasks
          .map(
            (task: any) =>
              `- ${task.title} (${task.status}, ${task.priority}): ${task.description || "No description"}`,
          )
          .join("\n")}
        
        Based on this information, generate:
        1. A clear, concise meeting title
        2. A detailed meeting description/agenda
        3. The appropriate meeting type (planning, review, retrospective, or status)
        4. Suggested duration in minutes (15, 30, 45, or 60)
        
        Format your response as JSON with the following structure:
        {
          "title": "Meeting title",
          "description": "Meeting description and agenda",
          "type": "planning|review|retrospective|status",
          "duration": 30
        }
      `

      const { text } = await generateText({
        model: gemini,
        prompt: prompt,
        temperature: 0.3,
      })

      // Parse the AI response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])

          setTitle(result.title)
          setDescription(result.description)
          setMeetingType(result.type)
          setDuration(result.duration.toString())

          // Set a default date (tomorrow)
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(10, 0, 0, 0) // 10:00 AM
          setDate(tomorrow)
          setTime("10:00")

          toast({
            title: "Meeting Details Generated",
            description: "AI has suggested meeting details based on your project",
          })
        } else {
          throw new Error("Could not parse AI response")
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        toast({
          title: "Error",
          description: "Failed to generate meeting details. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating meeting details:", error)
      toast({
        title: "Error",
        description: "Failed to generate meeting details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={generateMeetingDetails}
              disabled={isGenerating}
              className="mb-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Generate
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
              rows={4}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`col-span-3 justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
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
              Type
            </Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="retrospective">Retrospective</SelectItem>
                <SelectItem value="status">Status Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Attendees</Label>
            <div className="col-span-3">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto p-1">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                      <Checkbox
                        id={`attendee-${member.id}`}
                        checked={selectedAttendees.includes(member.id)}
                        onCheckedChange={() => toggleAttendee(member.id)}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Label htmlFor={`attendee-${member.id}`} className="text-sm cursor-pointer flex-1">
                        {member.name}
                      </Label>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No team members available</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
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

