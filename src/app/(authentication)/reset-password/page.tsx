import { Suspense } from "react";
import type { Metadata } from "next";

import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | IslandHop",
  description: "Reset your IslandHop user or operator password using your verification token."
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading password reset...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

