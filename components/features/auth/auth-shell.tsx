import Link from "next/link";
import { ScaleIcon, WheatIcon, ShieldCheckIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

const items = [
  {
    icon: ScaleIcon,
    title: "Paperwork-grade receipts",
    description: "Generate receipts that look tidy, consistent, and court-ready (without feeling corporate).",
  },
  {
    icon: WheatIcon,
    title: "Field-tested workflows",
    description: "Fast entry, fewer clicks, and exports that survive harvest-season chaos.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Proper authentication",
    description: "Email + password, passkeys, and optional two-factor for when it really matters.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="border-b border-border bg-background px-6 py-8 sm:px-8 lg:border-r lg:border-b-0 lg:px-10 lg:py-12">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-8">
              <Link href="/" className="inline-flex items-center text-sm font-semibold tracking-tight text-foreground">
                {siteConfig.name}
              </Link>

              <div className="max-w-xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Receipts that hold up in the ledger — and in the courtroom.
                </h1>
                <p className="text-base text-muted-foreground">
                  Acquittance helps teams generate, email, and verify receipts with a no-nonsense interface.
                  A little legal. A little farm. Fully practical.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Card key={item.title} className="border-border bg-background shadow-none">
                      <CardContent className="flex items-start gap-3 px-3 py-2">
                        <div className="mt-0.5 rounded-md border border-border bg-muted p-2 text-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <p className="max-w-lg text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
