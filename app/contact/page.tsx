import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Need a hand with signing in? Reach us and we’ll get you sorted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>For now, the fastest way is to open an issue or message the team.</p>
          <Button asChild variant="outline">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
