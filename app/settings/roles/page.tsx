"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RequireAuth } from "@/components/auth/require-auth"
import { useToast } from "@/hooks/use-toast"
import { type UserRole, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/components/auth/role-types"
import { Badge } from "@/components/ui/badge"
import { Info, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RolesSettingsPage() {
  const { toast } = useToast()
  const [permissions, setPermissions] = useState<Record<UserRole, string[]>>({ ...ROLE_PERMISSIONS })
  const [isLoading, setIsLoading] = useState(false)

  const handleTogglePermission = (role: UserRole, permission: string) => {
    setPermissions((prev) => {
      const newPermissions = { ...prev }

      if (newPermissions[role].includes(permission)) {
        // Remove permission
        newPermissions[role] = newPermissions[role].filter((p) => p !== permission)
      } else {
        // Add permission
        newPermissions[role] = [...newPermissions[role], permission]
      }

      return newPermissions
    })
  }

  const handleSavePermissions = async () => {
    setIsLoading(true)

    try {
      // In a real app, you would save the permissions to your database
      // For now, we'll just show a success message

      toast({
        title: "Permissions saved",
        description: "Role permissions have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving permissions:", error)
      toast({
        title: "Error",
        description: "Failed to save permissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPermissions = () => {
    setPermissions({ ...ROLE_PERMISSIONS })

    toast({
      title: "Permissions reset",
      description: "Role permissions have been reset to default values.",
    })
  }

  const allPermissions = [
    {
      category: "Projects",
      permissions: [
        { id: "create:project", name: "Create Projects", description: "Can create new projects" },
        { id: "read:project", name: "View Projects", description: "Can view projects" },
        { id: "update:project", name: "Edit Projects", description: "Can edit project details" },
        { id: "delete:project", name: "Delete Projects", description: "Can delete projects" },
      ],
    },
    {
      category: "Tasks",
      permissions: [
        { id: "create:task", name: "Create Tasks", description: "Can create new tasks" },
        { id: "read:task", name: "View Tasks", description: "Can view tasks" },
        { id: "update:task", name: "Edit Tasks", description: "Can edit task details" },
        { id: "delete:task", name: "Delete Tasks", description: "Can delete tasks" },
      ],
    },
    {
      category: "Team",
      permissions: [
        { id: "invite:member", name: "Invite Members", description: "Can invite new team members" },
        { id: "manage:roles", name: "Manage Roles", description: "Can manage user roles" },
      ],
    },
    {
      category: "Settings",
      permissions: [
        { id: "manage:integrations", name: "Manage Integrations", description: "Can manage integrations" },
        { id: "view:reports", name: "View Reports", description: "Can view reports and analytics" },
        { id: "export:data", name: "Export Data", description: "Can export data from the system" },
      ],
    },
  ]

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
              <h1 className="text-3xl font-bold">Roles & Permissions</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleResetPermissions}>
                  Reset to Default
                </Button>
                <Button onClick={handleSavePermissions} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure what each role can do in your workspace. Changes will affect all users with the corresponding
                role.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="admin" className="space-y-6">
              <TabsList>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor("admin")}>Admin</Badge>
                </TabsTrigger>
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor("editor")}>Editor</Badge>
                </TabsTrigger>
                <TabsTrigger value="viewer" className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor("viewer")}>Viewer</Badge>
                </TabsTrigger>
                <TabsTrigger value="external" className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor("external")}>External</Badge>
                </TabsTrigger>
              </TabsList>

              {(["admin", "editor", "viewer", "external"] as UserRole[]).map((role) => (
                <TabsContent key={role} value={role} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(role)}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                            <span>Role</span>
                          </CardTitle>
                          <CardDescription>{ROLE_DESCRIPTIONS[role]}</CardDescription>
                        </div>

                        {role === "admin" && (
                          <Alert className="max-w-md border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertDescription className="text-amber-600 dark:text-amber-400">
                              Admin users always have all permissions and cannot be restricted.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {allPermissions.map((category) => (
                        <div key={category.category} className="space-y-4">
                          <h3 className="text-lg font-medium">{category.category}</h3>
                          <div className="space-y-2">
                            {category.permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor={`${role}-${permission.id}`} className="font-medium">
                                    {permission.name}
                                  </Label>
                                  <p className="text-sm text-muted-foreground">{permission.description}</p>
                                </div>
                                <Switch
                                  id={`${role}-${permission.id}`}
                                  checked={role === "admin" || permissions[role].includes(permission.id)}
                                  onCheckedChange={() => {
                                    if (role !== "admin") {
                                      handleTogglePermission(role, permission.id)
                                    }
                                  }}
                                  disabled={role === "admin"}
                                />
                              </div>
                            ))}
                          </div>
                          {category !== allPermissions[allPermissions.length - 1] && <Separator className="my-4" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}

