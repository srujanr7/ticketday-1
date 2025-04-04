"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function sendInviteEmail(email: string, role: string, projectId?: string) {
  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("You must be logged in to send invitations")
    }

    // Create an invitation record
    const { data, error } = await supabase
      .from("invites")
      .insert({
        email,
        role,
        project_id: projectId || null,
        created_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()

    if (error) throw error

    // In a real application, you would send an email here
    // For now, we'll just return the invitation data

    revalidatePath("/team")
    revalidatePath("/team/members")

    return { success: true, data }
  } catch (error: any) {
    console.error("Error sending invite:", error)
    return { success: false, error: error.message }
  }
}

export async function generateInviteLink(role: string, projectId?: string) {
  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("You must be logged in to generate invite links")
    }

    // Generate a unique code
    const code = Math.random().toString(36).substring(2, 15)

    // Create an invitation record
    const { data, error } = await supabase
      .from("invites")
      .insert({
        code,
        role,
        project_id: projectId || null,
        created_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()

    if (error) throw error

    // Generate the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const inviteUrl = `${baseUrl}/invite?code=${code}`

    return { success: true, inviteUrl }
  } catch (error: any) {
    console.error("Error generating invite link:", error)
    return { success: false, error: error.message }
  }
}

export async function sendBulkInvites(emails: string[], role: string, projectId?: string) {
  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("You must be logged in to send invitations")
    }

    // Filter valid emails
    const validEmails = emails.filter((email) => email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))

    if (validEmails.length === 0) {
      throw new Error("No valid email addresses provided")
    }

    // Create invitation records
    const invites = validEmails.map((email) => ({
      email,
      role,
      project_id: projectId || null,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }))

    const { data, error } = await supabase.from("invites").insert(invites).select()

    if (error) throw error

    // In a real application, you would send emails here
    // For now, we'll just return the invitation data

    revalidatePath("/team")
    revalidatePath("/team/members")

    return { success: true, count: validEmails.length }
  } catch (error: any) {
    console.error("Error sending bulk invites:", error)
    return { success: false, error: error.message }
  }
}

export async function cancelInvite(inviteId: string) {
  try {
    const { error } = await supabase.from("invites").delete().eq("id", inviteId)

    if (error) throw error

    revalidatePath("/team")
    revalidatePath("/team/members")

    return { success: true }
  } catch (error: any) {
    console.error("Error cancelling invite:", error)
    return { success: false, error: error.message }
  }
}

export async function resendInvite(inviteId: string) {
  try {
    // Get the invite details
    const { data: invite, error: fetchError } = await supabase.from("invites").select("*").eq("id", inviteId).single()

    if (fetchError) throw fetchError

    if (!invite) {
      throw new Error("Invitation not found")
    }

    // In a real application, you would resend the email here
    // For now, we'll just update the expiration date

    const { error: updateError } = await supabase
      .from("invites")
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .eq("id", inviteId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error: any) {
    console.error("Error resending invite:", error)
    return { success: false, error: error.message }
  }
}

