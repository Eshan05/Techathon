"use client"
import React from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CreditCard } from "lucide-react"

export default function BillingItem() {
  return (
    <DropdownMenuItem>
      <CreditCard />
      Billing
    </DropdownMenuItem>
  )
}
