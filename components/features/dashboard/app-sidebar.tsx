"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { BookOpenText, FileText, LayoutDashboard, ScanLine } from "lucide-react"

import { NavUser } from "@/components/layout/user/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const tSidebar = useTranslations("Sidebar")
  const tApp = useTranslations("App")
  const { data: session } = useSession()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "grid size-9 place-items-center rounded-xl border",
              "from-sidebar-accent/60 bg-gradient-to-br to-transparent"
            )}
          >
            <span className="text-sm font-semibold">KV</span>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm leading-tight font-semibold">
              {tApp("name")}
            </div>
            <div className="text-sidebar-foreground/70 truncate text-xs">
              {tApp("tagline")}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tSidebar("home")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>{tSidebar("overview")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{tSidebar("tools")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/translator">
                    <ScanLine />
                    <span>{tSidebar("documentAnalyzer")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <BookOpenText />
                  <span>{tSidebar("landRecords")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <FileText />
                  <span>{tSidebar("documentVault")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser session={session ?? null} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
