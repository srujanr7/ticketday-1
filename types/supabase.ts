export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string
          status: string
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          status?: string
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          status?: string
          created_at?: string
          updated_at?: string
          owner_id?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          project_id: string
          assignee_id: string | null
          created_at: string
          updated_at: string
          due_date: string | null
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: string
          priority?: string
          project_id: string
          assignee_id?: string | null
          created_at?: string
          updated_at?: string
          due_date?: string | null
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          project_id?: string
          assignee_id?: string | null
          created_at?: string
          updated_at?: string
          due_date?: string | null
          created_by?: string
        }
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          permission: string
        }
        Insert: {
          id?: string
          role: string
          permission: string
        }
        Update: {
          id?: string
          role?: string
          permission?: string
        }
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          type: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

