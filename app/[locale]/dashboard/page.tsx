import { getTranslations } from "next-intl/server"
import { headers } from "next/headers"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth/auth"

export default async function Page() {
  const t = await getTranslations("Dashboard")

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("welcomeTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid gap-2">
            <div>
              <span className="text-muted-foreground">{t("signedInAs")}:</span>{" "}
              <span className="font-medium">{session?.user?.email}</span>
            </div>
            <div className="text-muted-foreground">{t("openProfileHint")}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("landLookupTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("landLookupBody")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("schemeTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("schemeBody")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("noticeTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("noticeBody")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("vaultTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("vaultBody")}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
