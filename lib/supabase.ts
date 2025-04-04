import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper functions for authentication
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Helper functions for tasks
export async function getTasks(projectId?: string) {
  let query = supabase.from("tasks").select("*")

  if (projectId) {
    query = query.eq("project_id", projectId)
  }

  const { data, error } = await query
  return { data, error }
}

export async function createTask(taskData: any) {
  const { data, error } = await supabase.from("tasks").insert(taskData).select()
  return { data, error }
}

export async function updateTask(taskId: string, taskData: any) {
  const { data, error } = await supabase.from("tasks").update(taskData).eq("id", taskId).select()
  return { data, error }
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId)
  return { error }
}

// Helper functions for projects
export async function getProjects() {
  const { data, error } = await supabase.from("projects").select("*")
  return { data, error }
}

export async function createProject(projectData: any) {
  const { data, error } = await supabase.from("projects").insert(projectData).select()
  return { data, error }
}

// Helper functions for user roles and permissions
export async function getUserRole(userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).single()
  return { data, error }
}

export async function checkPermission(userId: string, permission: string) {
  const { data: roleData } = await getUserRole(userId)

  if (!roleData) return false

  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role", roleData.role)
    .eq("permission", permission)
    .single()

  return !!data && !error
}

