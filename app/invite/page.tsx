"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [inviteData, setInviteData] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const code = searchParams.get("code")

  useEffect(() => {
    if (!code) {
      setError("Invalid invitation link")
      setIsLoading(false)
      return
    }

    async function fetchInviteData() {
      try {
        const { data, error } = await supabase
          .from("invites")
          .select("*")
          .eq("code", code)
          .is("accepted_at", null)
          .is("rejected_at", null)
          .gt("expires_at", new Date().toISOString())
          .single()

        if (error || !data) {
          setError("Invalid or expired invitation")
          setIsLoading(false)
          return
        }

        setInviteData(data)

        // If the invite has an email, pre-fill it
        if (data.email) {
          setEmail(data.email)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching invite data:", error)
        setError("Failed to load invitation details")
        setIsLoading(false)
      }
    }

    fetchInviteData()
  }, [code])

  const handleAcceptInvite = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (user) {
        // User is already logged in, just accept the invite
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to accept invitation")
        }

        toast({
          title: "Invitation accepted",
          description: "You have successfully joined the team.",
        })

        router.push("/dashboard")
      } else {
        // User needs to sign up or sign in
        if (!email) {
          throw new Error("Email is required")
        }

        if (inviteData.email) {
          // This is an email-specific invite, try to sign in
          const { error } = await signIn(email, password)

          if (error) {
            throw new Error(error.message || "Invalid credentials")
          }

          // Accept the invite
          const response = await fetch("/api/invites/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to accept invitation")
          }

          toast({
            title: "Invitation accepted",
            description: "You have successfully joined the team.",
          })

          router.push("/dashboard")
        } else {
          // This is a link invite, user needs to sign up
          if (!password) {
            throw new Error("Password is required")
          }

          if (password !== confirmPassword) {
            throw new Error("Passwords do not match")
          }

          // Accept the invite and create an account
          const response = await fetch("/api/invites/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, email, password }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to accept invitation")
          }

          toast({
            title: "Account created",
            description: "Your account has been created and you've joined the team.",
          })

          // Sign in with the new credentials
          await signIn(email, password)
          router.push("/dashboard")
        }
      }
    } catch (error: any) {
      console.error("Error accepting invite:", error)
      setError(error.message || "Failed to accept invitation")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Invitation Error</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/")}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join TaskFlow</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join {inviteData.project_id ? "a project" : "the workspace"} as a{" "}
            {inviteData.role.charAt(0).toUpperCase() + inviteData.role.slice(1)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!inviteData.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!inviteData.email && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
          {user && (
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm">
                You are currently signed in as <strong>{user.email}</strong>. The invitation will be accepted for this
                account.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleAcceptInvite} disabled={isLoading}>
            {isLoading
              ? "Processing..."
              : user
                ? "Accept Invitation"
                : inviteData.email
                  ? "Sign In & Accept"
                  : "Create Account & Accept"}
          </Button>
          {!user && (
            <p className="text-center text-sm text-muted-foreground">
              {inviteData.email
                ? "Already have an account? Sign in to accept this invitation."
                : "By accepting, you agree to our Terms of Service and Privacy Policy."}
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

