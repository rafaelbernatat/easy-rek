"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";

export function UserButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          userButton: {
            baseTheme: "light",
            elements: {
              avatarBox: {
                width: "40px",
                height: "40px",
              },
            },
          },
        },
      }}
    />
  );
}
