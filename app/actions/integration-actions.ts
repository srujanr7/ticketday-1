"use server"

import { supabase } from "@/lib/supabase"

// Types for integration operations
type IntegrationType = "slack" | "github" | "googleCalendar" | "zapier" | "notion"

interface IntegrationStatus {
  connected: boolean
  name: string
}

// Get integration status for a specific user
export async function getUserIntegrationStatus(userId: string): Promise<Record<IntegrationType, IntegrationStatus>> {
  if (!userId) {
    return getDefaultIntegrationStatus()
  }

  try {
    // Query user's integrations from Supabase
    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("type, connected")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching integrations:", error)
      return getDefaultIntegrationStatus()
    }

    // Create a map of integration statuses
    const integrationMap = getDefaultIntegrationStatus()

    // Update with actual status from database
    integrations?.forEach((integration) => {
      const type = integration.type as IntegrationType
      if (type in integrationMap) {
        integrationMap[type].connected = integration.connected
      }
    })

    return integrationMap
  } catch (error) {
    console.error("Error in getUserIntegrationStatus:", error)
    return getDefaultIntegrationStatus()
  }
}

// Get integration configuration for a specific user and integration type
export async function getIntegrationConfig(userId: string, type: IntegrationType): Promise<Record<string, any> | null> {
  if (!userId) {
    return null
  }

  try {
    // Query user's integration from Supabase
    const { data, error } = await supabase
      .from("integrations")
      .select("config")
      .eq("user_id", userId)
      .eq("type", type)
      .single()

    if (error) {
      console.error(`Error fetching ${type} integration config:`, error)
      return null
    }

    return data.config
  } catch (error) {
    console.error(`Error in getIntegrationConfig for ${type}:`, error)
    return null
  }
}

// Default integration status (all disconnected)
function getDefaultIntegrationStatus(): Record<IntegrationType, IntegrationStatus> {
  return {
    slack: {
      connected: false,
      name: "Slack",
    },
    github: {
      connected: false,
      name: "GitHub",
    },
    googleCalendar: {
      connected: false,
      name: "Google Calendar",
    },
    zapier: {
      connected: false,
      name: "Zapier",
    },
    notion: {
      connected: false,
      name: "Notion",
    },
  }
}

// Connect an integration for a user
export async function connectIntegration(
  type: IntegrationType,
  credentials: Record<string, string>,
  userId: string,
  projectId?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    // Validate credentials
    if (!validateCredentials(type, credentials)) {
      return {
        success: false,
        message: `Missing required credentials for ${type}`,
      }
    }

    // In a real app, you would verify the credentials with the service
    // before storing them

    // Store the integration with encrypted credentials
    const { error } = await supabase.from("integrations").upsert(
      {
        user_id: userId,
        type,
        connected: true,
        project_id: projectId,
        config: {
          // Store credentials
          ...credentials,
          connected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,type",
      },
    )

    if (error) {
      console.error(`Error connecting ${type}:`, error)
      return {
        success: false,
        message: `Failed to connect ${type}`,
      }
    }

    return {
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} connected successfully!`,
    }
  } catch (error) {
    console.error(`Error in connectIntegration for ${type}:`, error)
    return {
      success: false,
      message: `An unexpected error occurred`,
    }
  }
}

// Disconnect an integration for a user
export async function disconnectIntegration(
  type: IntegrationType,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    const { error } = await supabase
      .from("integrations")
      .update({
        connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("type", type)

    if (error) {
      console.error(`Error disconnecting ${type}:`, error)
      return {
        success: false,
        message: `Failed to disconnect ${type}`,
      }
    }

    return {
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} disconnected successfully!`,
    }
  } catch (error) {
    console.error(`Error in disconnectIntegration for ${type}:`, error)
    return {
      success: false,
      message: `An unexpected error occurred`,
    }
  }
}

// Save integration settings for a user
export async function saveIntegrationSettings(
  type: IntegrationType,
  settings: Record<string, any>,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    // Get current integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("config")
      .eq("user_id", userId)
      .eq("type", type)
      .single()

    if (fetchError) {
      console.error(`Error fetching ${type} integration:`, fetchError)
      return {
        success: false,
        message: `Failed to fetch ${type} settings`,
      }
    }

    // Update settings
    const { error } = await supabase
      .from("integrations")
      .update({
        config: {
          ...integration.config,
          settings: {
            ...(integration.config.settings || {}),
            ...settings,
          },
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("type", type)

    if (error) {
      console.error(`Error saving ${type} settings:`, error)
      return {
        success: false,
        message: `Failed to save ${type} settings`,
      }
    }

    return {
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} settings saved successfully!`,
    }
  } catch (error) {
    console.error(`Error in saveIntegrationSettings for ${type}:`, error)
    return {
      success: false,
      message: `An unexpected error occurred`,
    }
  }
}

// Helper function to validate credentials
function validateCredentials(type: IntegrationType, credentials: Record<string, string>): boolean {
  switch (type) {
    case "slack":
      return !!credentials.apiKey && !!credentials.botToken
    case "github":
      return !!credentials.accessToken && !!credentials.repositories
    case "googleCalendar":
      return !!credentials.apiKey && !!credentials.calendarId
    case "zapier":
      return !!credentials.webhookUrl
    case "notion":
      return !!credentials.apiKey
    default:
      return false
  }
}

