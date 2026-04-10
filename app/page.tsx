import Link from "next/link";

import { SignInButton } from "@/components/features/auth/sign-in-button";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 p-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">{siteConfig.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Receipts, verified.
          <span className="text-muted-foreground"> Paperwork you can stand behind.</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A slightly-legal, slightly-farmer interface for teams who need receipts that are consistent, searchable, and
          easy to share.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SignInButton />
        <Button asChild variant="outline">
          <Link href="/sign-up">Create account</Link>
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">Ledger-first</p>
          <p className="text-sm text-muted-foreground">Store once, reuse everywhere. No duplicate entry.</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">Email + passkeys</p>
          <p className="text-sm text-muted-foreground">Start simple. Upgrade security when you&apos;re ready.</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">Audit-friendly</p>
          <p className="text-sm text-muted-foreground">Clear IDs, timestamps, and verification hooks.</p>
        </div>
      </section>

      <p className="mt-auto font-mono text-xs text-muted-foreground">
        (Press <kbd>d</kbd> to toggle dark mode)
      </p>
    </div>
  );
}
