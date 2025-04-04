export type UserRole = "admin" | "editor" | "viewer" | "external"

export interface Permission {
  id: string
  name: string
  description: string
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    "create:project",
    "read:project",
    "update:project",
    "delete:project",
    "create:task",
    "read:task",
    "update:task",
    "delete:task",
    "invite:member",
    "manage:roles",
    "manage:integrations",
    "view:reports",
    "export:data",
  ],
  editor: [
    "create:project",
    "read:project",
    "update:project",
    "create:task",
    "read:task",
    "update:task",
    "delete:task",
    "invite:member",
    "view:reports",
  ],
  viewer: ["read:project", "read:task", "view:reports"],
  external: ["read:project", "read:task", "create:task", "update:task"],
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full access to all features and settings",
  editor: "Can create and edit projects and tasks, but cannot delete projects or manage system settings",
  viewer: "Read-only access to projects and tasks",
  external: "Limited access for external collaborators",
}

