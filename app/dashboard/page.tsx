import { headers } from "next/headers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid gap-2">
            <div>
              <span className="text-muted-foreground">Signed in as:</span>{" "}
              <span className="font-medium">{session?.user?.email}</span>
            </div>
            <div className="text-muted-foreground">
              Open <span className="font-medium">Farmer profile</span> from the sidebar to
              add your language and location.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
