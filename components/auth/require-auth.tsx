"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"

type RequireAuthProps = {
  children: React.ReactNode
  requiredRole?: string
}

export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, isLoading, userRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      } else if (requiredRole && userRole !== requiredRole && userRole !== "admin") {
        // Redirect to unauthorized page if role doesn't match
        router.push("/unauthorized")
      }
    }
  }, [user, isLoading, router, pathname, requiredRole, userRole])

  // Show nothing while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated or doesn't have required role, don't render children
  if (!user || (requiredRole && userRole !== requiredRole && userRole !== "admin")) {
    return null
  }

  return <>{children}</>
}

