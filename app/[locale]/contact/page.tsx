import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

export default async function Page() {
  const t = await getTranslations("Contact")

  return (
    <div className="mx-auto flex min-h-svh max-w-lg items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{t("body")}</p>
          <Button asChild variant="outline">
            <Link href="/sign-in">{t("backToSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
