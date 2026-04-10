"use client";

import * as React from "react";
import { BookOpenText, FileText, LayoutDashboard, UserRound } from "lucide-react";

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
} from "@/components/ui/sidebar";
import { FarmerProfileCredenza } from "@/components/features/profile/farmer-profile-credenza";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export function AppSidebar({ user }: { user: DashboardUser }) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "grid size-9 place-items-center rounded-xl border",
              "bg-gradient-to-br from-sidebar-accent/60 to-transparent"
            )}
          >
            <span className="text-sm font-semibold">KV</span>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold leading-tight">
              Kisan Vakil
            </div>
            <div className="truncate text-xs text-sidebar-foreground/70">
              Pocket advocate
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Identity</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <FarmerProfileCredenza>
                  <SidebarMenuButton>
                    <UserRound />
                    <span>Farmer profile</span>
                  </SidebarMenuButton>
                </FarmerProfileCredenza>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Records (MVP)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <BookOpenText />
                  <span>Land records</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <FileText />
                  <span>Document vault</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg border bg-sidebar-accent/20 p-3">
          <div className="text-xs font-medium">Signed in</div>
          <div className="mt-1 truncate text-xs text-sidebar-foreground/70">
            {user.email ?? user.name ?? user.id}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
