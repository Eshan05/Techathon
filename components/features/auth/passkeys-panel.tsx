"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Fingerprint } from "lucide-react"
import { toast } from "sonner"
import { toUserMessage } from "@/lib/errors"
import { authClient as client } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export function AddPasskeyInline() {
  const [isOpen, setIsOpen] = useState(false)
  const [passkeyName, setPasskeyName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAddPasskey = async () => {
    if (!passkeyName) {
      toast.error("Passkey name is required")
      return
    }
    setIsLoading(true)
    const res = await client.passkey.addPasskey({ name: passkeyName })
    if (res?.error) {
      const msg = toUserMessage(res.error, {
        fallbackTitle: "Couldn’t add the passkey",
        context: "auth.passkeys.add",
      })
      toast.error(msg.title, { description: msg.description })
    } else {
      setIsOpen(false)
      toast.success("Passkey added successfully. You can now use it to login.")
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={"sm"} className="mx-auto gap-2">
          <Fingerprint size={15} />
          Add New Passkey
        </Button>
      </DialogTrigger>
      <DialogContent className="w-11/12 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Passkey</DialogTitle>
          <DialogDescription>
            Create a new passkey to securely access your account without a
            password.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Input
            id="passkey-name"
            value={passkeyName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPasskeyName(e.target.value)
            }
            placeholder="Passkey name"
          />
        </div>
        <DialogFooter>
          <Button
            disabled={isLoading}
            type="submit"
            onClick={handleAddPasskey}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" /> Create Passkey
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PasskeysPanel({ className }: { className?: string }) {
  const { data, isPending, isRefetching, refetch } = client.useListPasskeys()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const loading = isPending || isRefetching

  return (
    <div className={`grid gap-3 max-sm:mb-4 ${className || ""}`}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading passkeys...</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-2">
          {data.map((pk: any) => (
            <div
              key={pk.id}
              className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <Fingerprint />
                <div>
                  <div className="text-sm font-medium">
                    {pk.name || "Passkey"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pk.createdAt
                      ? new Date(pk.createdAt).toLocaleString()
                      : null}
                  </div>
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    setIsDeleting(pk.id)
                    const res = await client.passkey.deletePasskey({
                      id: pk.id,
                    })
                    if (res?.error) {
                      const msg = toUserMessage(res.error, {
                        fallbackTitle: "Couldn’t delete the passkey",
                        context: "auth.passkeys.delete",
                      })
                      toast.error(msg.title, { description: msg.description })
                    } else {
                      toast.success("Passkey deleted")
                      try {
                        refetch?.()
                      } catch (e) {}
                    }
                    setIsDeleting(null)
                  }}
                >
                  {isDeleting === pk.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span>Delete</span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No passkeys found</div>
      )}
    </div>
  )
}

export default PasskeysPanel
