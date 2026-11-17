import { Suspense } from "react";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | IslandHop",
  description: "Request a password reset token for your IslandHop user or operator account."
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading reset request...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

