"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks";

export default function ManageBookingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  // Signed in passengers and guests both see the page; staff go to their own portals.
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const role = (user?.role || "").toUpperCase();
  const isOperator = isAuthenticated && role === "OPERATOR";
  const isAdmin = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");
  const isPassenger = isAuthenticated && (role === "USER" || role === "PASSENGER");

  // Spec 0001 AC-7: guests are allowed here. A guest proves access with the booking reference
  // plus the lead passenger email (the page asks for it), so no login redirect for them.
  React.useEffect(() => {
    if (!mounted || isLoading) return;

    if (isOperator) {
      router.replace("/dashboard/operator");
      return;
    }

    if (isAdmin) {
      router.replace("/dashboard/admin");
      return;
    }
  }, [mounted, isLoading, isOperator, isAdmin, router]);

  if (!mounted || isLoading || isOperator || isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-xs text-muted-foreground font-medium">
            {!mounted || isLoading
              ? "Loading passenger portal..."
              : isOperator
              ? "Redirecting to operator portal..."
              : isAdmin
              ? "Redirecting to admin portal..."
              : "Loading passenger portal..."}
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
