"use client";

import type { ReactNode } from "react";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { AuthProvider, QueryProvider } from "@/providers";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </NuqsAdapter>
  );
}
