import { ScaleIcon, WheatIcon, ShieldCheckIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { siteConfig } from "@/lib/site"

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("AuthShell")

  const items = [
    {
      icon: ScaleIcon,
      title: t("item1Title"),
      description: t("item1Body"),
    },
    {
      icon: WheatIcon,
      title: t("item2Title"),
      description: t("item2Body"),
    },
    {
      icon: ShieldCheckIcon,
      title: t("item3Title"),
      description: t("item3Body"),
    },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="border-b border-border bg-background px-6 py-8 sm:px-8 lg:border-r lg:border-b-0 lg:px-10 lg:py-12">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-8">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-semibold tracking-tight text-foreground"
              >
                {siteConfig.name}
              </Link>

              <div className="max-w-xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t("title")}
                </h1>
                <p className="text-base text-muted-foreground">
                  {t("description")}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const Icon = item.icon

                  return (
                    <Card
                      key={item.title}
                      className="border-border bg-background shadow-none"
                    >
                      <CardContent className="flex items-start gap-3 px-3 py-2">
                        <div className="mt-0.5 rounded-md border border-border bg-muted p-2 text-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <p className="max-w-lg text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
              reserved.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}
