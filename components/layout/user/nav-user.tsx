"use client"

import { ChevronsUpDown, ShieldCheck, ShieldOff } from "lucide-react"

import ChangePassword from "@/components/features/auth/change-password"
import { Providers } from "@/components/providers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Session } from "@/lib/auth-types"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

const dmiClasses =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden"

const QL = () => (
  <div className={`${dmiClasses}`}>
    <Skeleton className="size-4 shrink-0 rounded-full" />
    <Skeleton className="h-4 w-20 shrink-0 rounded-md" />
  </div>
)

const EditProfileItem = dynamic(
  () => import("../../features/profile/settings/edit-profile-item"),
  { ssr: false, loading: () => <QL /> }
)
const SessionsItem = dynamic(
  () => import("../../features/profile/settings/sessions-item"),
  { ssr: false, loading: () => <QL /> }
)
const PasskeysItem = dynamic(
  () => import("../../features/profile/settings/passkeys-item"),
  { ssr: false, loading: () => <QL /> }
)
const TwoFaScanItem = dynamic(
  () => import("../../features/profile/settings/twofa-scan-item"),
  { ssr: false, loading: () => <QL /> }
)
const TwoFaToggleItem = dynamic(
  () => import("../../features/profile/settings/twofa-toggle-item"),
  { ssr: false, loading: () => <QL /> }
)
const VerifyEmailItem = dynamic(
  () => import("../../features/profile/settings/verify-email-item"),
  { ssr: false, loading: () => <QL /> }
)
const BillingItem = dynamic(
  () => import("../../features/profile/settings/billing-item"),
  { ssr: false, loading: () => <QL /> }
)
const NotificationsItem = dynamic(
  () => import("../../features/profile/settings/notifications-item"),
  { ssr: false, loading: () => <QL /> }
)
const SignOutItem = dynamic(
  () => import("../../features/profile/settings/signout-item"),
  { ssr: false, loading: () => <QL /> }
)

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function NavUser({ session }: { session: Session | null }) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  if (!session?.user) return null
  const user = session.user

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={session?.user.image || undefined}
                  alt={user.name}
                />
                <AvatarFallback className="rounded-lg">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={session?.user.image || undefined}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <header className="flex-center-1 truncate font-medium">
                    <span>{user.name}</span>{" "}
                    <div className="flex items-center">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full text-green-800 dark:text-green-100">
                          <ShieldCheck size={12} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full text-yellow-800 dark:text-yellow-100">
                          <ShieldOff size={10} />
                        </span>
                      )}
                    </div>
                  </header>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Providers>
                <EditProfileItem session={session} />
              </Providers>
              <SessionsItem session={session} />
              <PasskeysItem />
              {session?.user.twoFactorEnabled && <TwoFaScanItem />}
              <TwoFaToggleItem enabled={!!session?.user.twoFactorEnabled} />
              <ChangePassword />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <BillingItem />
            <NotificationsItem />
            <DropdownMenuSeparator />
            {!user.emailVerified && <VerifyEmailItem email={user.email} />}
            <SignOutItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
