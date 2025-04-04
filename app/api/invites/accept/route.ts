import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { code, email, password } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 })
    }

    // Find the invitation
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("code", code)
      .is("accepted_at", null)
      .is("rejected_at", null)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 })
    }

    // If the user is signing up (email and password provided)
    if (email && password) {
      // Create a new user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 })
      }

      const userId = authData.user?.id

      if (!userId) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
      }

      // Assign the role to the user
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: invite.role,
      })

      if (roleError) {
        return NextResponse.json({ error: "Failed to assign role" }, { status: 500 })
      }

      // If there's a project, add the user to it
      if (invite.project_id) {
        const { error: projectError } = await supabase.from("project_members").insert({
          project_id: invite.project_id,
          user_id: userId,
          role: invite.role,
        })

        if (projectError) {
          return NextResponse.json({ error: "Failed to add to project" }, { status: 500 })
        }
      }
    }

    // Mark the invitation as accepted
    const { error: updateError } = await supabase
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 })
  }
}

