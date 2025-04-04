"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Mail, LinkIcon, Users, AlertCircle, CheckCircle2 } from "lucide-react"
import { type UserRole, ROLE_DESCRIPTIONS } from "@/components/auth/role-types"
import { sendInviteEmail, generateInviteLink, sendBulkInvites } from "@/app/actions/team-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  onSuccess?: () => void
}

export function InviteMemberDialog({ open, onOpenChange, projectId, onSuccess }: InviteMemberDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [inviteMethod, setInviteMethod] = useState<"email" | "link" | "bulk">("email")
  const [email, setEmail] = useState("")
  const [bulkEmails, setBulkEmails] = useState("")
  const [role, setRole] = useState<UserRole>("viewer")
  const [inviteLink, setInviteLink] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const handleGenerateLink = async () => {
    if (!user) return

    setIsLoading(true)
    setInviteStatus({ type: null, message: "" })

    try {
      const result = await generateInviteLink(role, projectId)

      if (!result.success) {
        throw new Error(result.error || "Failed to generate invite link")
      }

      setInviteLink(result.inviteUrl)

      toast({
        title: "Invite link generated",
        description: "You can now share this link with your team members.",
      })
    } catch (error: any) {
      console.error("Error generating invite link:", error)
      setInviteStatus({
        type: "error",
        message: error.message || "Failed to generate invite link. Please try again.",
      })
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)

    toast({
      title: "Link copied",
      description: "Invite link copied to clipboard.",
    })

    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSendInvite = async () => {
    if (!user) return

    setIsLoading(true)
    setInviteStatus({ type: null, message: "" })

    try {
      // Validate email
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error("Please enter a valid email address")
      }

      const result = await sendInviteEmail(email, role, projectId)

      if (!result.success) {
        throw new Error(result.error || "Failed to send invitation")
      }

      setInviteStatus({
        type: "success",
        message: `Invitation has been created for ${email}. In a production environment, an email would be sent automatically.`,
      })

      toast({
        title: "Invitation created",
        description: `An invitation has been created for ${email}.`,
      })

      // Don't close the dialog immediately to show the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
        setEmail("")
        setInviteStatus({ type: null, message: "" })
      }, 3000)
    } catch (error: any) {
      console.error("Error sending invite:", error)
      setInviteStatus({
        type: "error",
        message: error.message || "Failed to send invitation. Please try again.",
      })
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendBulkInvites = async () => {
    if (!user) return

    setIsLoading(true)
    setInviteStatus({ type: null, message: "" })

    try {
      // Split and clean emails
      const emails = bulkEmails
        .split(/[\s,;]+/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0)

      if (emails.length === 0) {
        throw new Error("No valid email addresses found")
      }

      const result = await sendBulkInvites(emails, role, projectId)

      if (!result.success) {
        throw new Error(result.error || "Failed to send invitations")
      }

      setInviteStatus({
        type: "success",
        message: `Invitations have been created for ${result.count} email addresses. In a production environment, emails would be sent automatically.`,
      })

      toast({
        title: "Invitations created",
        description: `Invitations have been created for ${result.count} email addresses.`,
      })

      // Don't close the dialog immediately to show the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
        setBulkEmails("")
        setInviteStatus({ type: null, message: "" })
      }, 3000)
    } catch (error: any) {
      console.error("Error sending bulk invites:", error)
      setInviteStatus({
        type: "error",
        message: error.message || "Failed to send invitations. Please try again.",
      })
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Invite people to collaborate on {projectId ? "this project" : "your workspace"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={inviteMethod} onValueChange={(value) => setInviteMethod(value as any)}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span>Invite Link</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Bulk Invite</span>
            </TabsTrigger>
          </TabsList>

          {inviteStatus.type && (
            <Alert variant={inviteStatus.type === "success" ? "default" : "destructive"} className="mb-4">
              {inviteStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{inviteStatus.message}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="external">External Collaborator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={handleSendInvite} disabled={isLoading || !email}>
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-link">Role for link invitees</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role-link">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="external">External Collaborator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            {!inviteLink ? (
              <Button onClick={handleGenerateLink} disabled={isLoading} className="w-full">
                {isLoading ? "Generating..." : "Generate Invite Link"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex gap-2">
                  <Input id="invite-link" value={inviteLink} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This link will expire in 7 days.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-emails">Email addresses</Label>
              <Textarea
                id="bulk-emails"
                placeholder="Enter multiple email addresses separated by commas, spaces, or new lines"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Enter multiple email addresses separated by commas, spaces, or new lines.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-bulk">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role-bulk">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="external">External Collaborator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={handleSendBulkInvites} disabled={isLoading || !bulkEmails}>
                {isLoading ? "Sending..." : "Send Invitations"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

