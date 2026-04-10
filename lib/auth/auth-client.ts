import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import {
  lastLoginMethodClient,
  multiSessionClient,
  twoFactorClient,
} from "better-auth/client/plugins";

import { publicAuthBaseUrl } from "@/utils/constants";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? publicAuthBaseUrl : window.location.origin,
  basePath: "/api/sessions",
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/two-factor";
      },
    }),
    passkeyClient(),
    multiSessionClient(),
    lastLoginMethodClient(),
  ],
});

export const { signUp, signIn, signOut, useSession } = authClient;
