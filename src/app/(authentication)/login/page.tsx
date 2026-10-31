import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | IslandHop",
  description: "Sign in to access your ferry bookings, tickets, or operator management dashboard."
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
