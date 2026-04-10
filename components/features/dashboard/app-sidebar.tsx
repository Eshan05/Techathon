"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  BookOpenText,
  FileText,
  LayoutDashboard,
  UserRound,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { FarmerProfileCredenza } from "@/components/features/profile/farmer-profile-credenza"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export type DashboardUser = {
  id: string
  name?: string | null
  email?: string | null
}

export function AppSidebar({ user }: { user: DashboardUser }) {
  const tSidebar = useTranslations("Sidebar")
  const tApp = useTranslations("App")

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
          <SidebarGroupLabel>{tSidebar("profile")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <FarmerProfileCredenza>
                  <SidebarMenuButton>
                    <UserRound />
                    <span>{tSidebar("farmerProfile")}</span>
                  </SidebarMenuButton>
                </FarmerProfileCredenza>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{tSidebar("tools")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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

      <SidebarFooter className="gap-1 group-data-[collapsible=icon]:hidden">
        <div className="bg-sidebar-accent/20 rounded-lg border p-3">
          <div className="text-xs font-medium">{tSidebar("signedIn")}</div>
          <div className="text-sidebar-foreground/70 mt-1 truncate text-xs">
            {user.email ?? user.name ?? user.id}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
