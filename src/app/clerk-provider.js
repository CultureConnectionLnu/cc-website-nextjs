"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/themes";

export function ClerkProviderWrapper({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: neobrutalism,
      }}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
