"use client"
import React from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Bell } from "lucide-react"

export default function NotificationsItem() {
  return (
    <DropdownMenuItem>
      <Bell />
      Notifications
    </DropdownMenuItem>
  )
}
