"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { AppSidebar } from "@/components/features/dashboard/app-sidebar"
import { Providers } from "@/components/providers"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard")

  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t("title")}</div>
              <div className="truncate text-xs text-muted-foreground">
                {/* {t("subtitle")} */}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  )
}
