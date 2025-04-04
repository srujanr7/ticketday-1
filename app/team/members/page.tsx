"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { RequireAuth } from "@/components/auth/require-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/components/auth/role-types"
import { MoreHorizontal, UserPlus, Search, Filter, Mail, UserMinus, UserCog, MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface TeamMember {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  status: "active" | "pending" | "inactive"
  joined_at: string
  last_active?: string
}

export default function TeamMembersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [messageText, setMessageText] = useState("")
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  useEffect(() => {
    fetchMembers()
    fetchPendingInvites()
  }, [])

  const fetchMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch team members from Supabase
      const { data: userRoles, error: rolesError } = await supabase.from("user_roles").select(`
          user_id,
          role
        `)

      if (rolesError) throw rolesError

      // Fetch user details
      const userIds = userRoles.map((role) => role.user_id)

      if (userIds.length === 0) {
        setMembers([])
        setIsLoading(false)
        return
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email, user_metadata, created_at, last_sign_in_at")
        .in("id", userIds)

      if (usersError) throw usersError

      // Combine the data
      const transformedMembers: TeamMember[] = userRoles.map((role) => {
        const userInfo = users.find((u) => u.id === role.user_id)
        return {
          id: role.user_id,
          email: userInfo?.email || "Unknown",
          name: userInfo?.user_metadata?.name || userInfo?.email?.split("@")[0] || "Unknown",
          role: role.role,
          avatar: userInfo?.user_metadata?.avatar_url,
          status: "active",
          joined_at: userInfo?.created_at || new Date().toISOString(),
          last_active: userInfo?.last_sign_in_at,
        }
      })

      setMembers(transformedMembers)
    } catch (error) {
      console.error("Error fetching team members:", error)
      setError("Failed to load team members. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPendingInvites = async () => {
    try {
      // Fetch pending invites from Supabase
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .is("accepted_at", null)
        .is("rejected_at", null)
        .gt("expires_at", new Date().toISOString())

      if (error) throw error

      setPendingInvites(data || [])
    } catch (error) {
      console.error("Error fetching pending invites:", error)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId)

      if (error) throw error

      // Update the local state
      setMembers(members.map((member) => (member.id === userId ? { ...member, role: newRole } : member)))

      toast({
        title: "Role updated",
        description: "The team member's role has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating role:", error)
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return

    try {
      // Remove user role
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId)

      if (error) throw error

      // Remove from project members
      await supabase.from("project_members").delete().eq("user_id", userId)

      // Update the local state
      setMembers(members.filter((member) => member.id !== userId))

      toast({
        title: "Member removed",
        description: "The team member has been removed successfully.",
      })
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      // Get the invite details
      const { data: invite, error: fetchError } = await supabase.from("invites").select("*").eq("id", inviteId).single()

      if (fetchError) throw fetchError

      // In a real app, you would send an email here
      // For now, we'll update the expiration date and show a success message
      const { error: updateError } = await supabase
        .from("invites")
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq("id", inviteId)

      if (updateError) throw updateError

      toast({
        title: "Invitation resent",
        description: `The invitation has been resent to ${invite.email}.`,
      })
    } catch (error) {
      console.error("Error resending invite:", error)
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.from("invites").delete().eq("id", inviteId)

      if (error) throw error

      // Update the local state
      setPendingInvites(pendingInvites.filter((invite) => invite.id !== inviteId))

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully.",
      })
    } catch (error) {
      console.error("Error cancelling invite:", error)
      toast({
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenMessageDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setMessageText("")
    setIsMessageDialogOpen(true)
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedMember || !user) return

    setIsSendingMessage(true)

    try {
      // In a real app, you would send a message through your messaging system
      // For now, we'll just simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create a message record in Supabase
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: selectedMember.id,
        content: messageText,
        sent_at: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Message sent",
        description: `Your message has been sent to ${selectedMember.name}.`,
      })

      setIsMessageDialogOpen(false)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleViewProfile = (member: TeamMember) => {
    setSelectedMember(member)
    setIsProfileDialogOpen(true)
  }

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === "all" || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/20 dark:text-red-400"
      case "editor":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/20 dark:text-blue-400"
      case "viewer":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      case "external":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <RequireAuth requiredRole="admin">
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Team Members</h1>
              <Button onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Members
              </Button>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Filter by role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-[120px]" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[180px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => handleViewProfile(member)}>
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span
                              className="font-medium hover:underline cursor-pointer"
                              onClick={() => handleViewProfile(member)}
                            >
                              {member.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {member.last_active ? new Date(member.last_active).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenMessageDialog(member)}
                              title="Send Message"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span className="sr-only">Message</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewProfile(member)}>
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "admin")}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  <span>Make Admin</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "editor")}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  <span>Make Editor</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "viewer")}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  <span>Make Viewer</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRemoveMember(member.id)}>
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  <span>Remove Member</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No team members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {pendingInvites.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(invite.role as UserRole)}>
                              {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{invite.created_by}</TableCell>
                          <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleResendInvite(invite.id)}
                                title="Resend Invitation"
                              >
                                <Mail className="h-4 w-4" />
                                <span className="sr-only">Resend</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCancelInvite(invite.id)}
                                title="Cancel Invitation"
                              >
                                <UserMinus className="h-4 w-4" />
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </main>
        </div>
        <InviteMemberDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          onSuccess={() => {
            fetchMembers()
            fetchPendingInvites()
          }}
        />

        {/* Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send Message to {selectedMember?.name}</DialogTitle>
              <DialogDescription>This message will be sent directly to the team member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={!messageText.trim() || isSendingMessage}>
                {isSendingMessage ? "Sending..." : "Send Message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Dialog */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Team Member Profile</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="py-4">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                    <AvatarFallback className="text-2xl">{selectedMember.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{selectedMember.name}</h2>
                  <p className="text-muted-foreground">{selectedMember.email}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">Role</div>
                    <div>
                      <Badge className={getRoleBadgeColor(selectedMember.role)}>
                        {selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">Status</div>
                    <div>
                      <Badge variant="outline" className="capitalize">
                        {selectedMember.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">Joined</div>
                    <div>{new Date(selectedMember.joined_at).toLocaleDateString()}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">Last Active</div>
                    <div>
                      {selectedMember.last_active ? new Date(selectedMember.last_active).toLocaleDateString() : "Never"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6 gap-2">
                  <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsProfileDialogOpen(false)
                      handleOpenMessageDialog(selectedMember)
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}

