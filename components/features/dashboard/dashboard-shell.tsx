"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { SignOutButton } from "@/components/features/auth/sign-out-button"
import {
  AppSidebar,
  type DashboardUser,
} from "@/components/features/dashboard/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser
  children: React.ReactNode
}) {
  const t = useTranslations("Dashboard")

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{t("title")}</div>
            <div className="truncate text-xs text-muted-foreground">
              {t("subtitle")}
            </div>
          </div>
          <SignOutButton />
        </header>
        <main className="mx-auto w-full max-w-5xl p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
