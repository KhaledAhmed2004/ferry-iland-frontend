import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import authBg from "@/assets/auth/bg.png";

import { BrandLogo } from "@/widgets";

export default function AuthenticationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left Side: Brand Visual with bg.jpg & Maritime Banner */}
      <div className="relative hidden w-full overflow-hidden bg-slate-950 lg:flex lg:w-5/12 xl:w-1/2">
        <Image
          src={authBg}
          alt="Cruise ferry sailing on sea"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center"
        />

        {/* Ocean Deep Blue / Navy Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-slate-950/40" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 lg:p-16">
          {/* Top Logo Watermark / Icon */}
          <BrandLogo
            size="md"
            title={<span className="text-2xl font-black tracking-tight text-white">IslandHop</span>}
          />

          {/* Bottom Headline & Subtitle */}
          <div className="max-w-md space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-white xl:text-5xl">
              Powering <br />
              Seamless <br />
              Maritime <br />
              Journeys.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 xl:text-base">
              The industry standard for managing ferry fleets, optimizing routes, and delivering
              exceptional passenger experiences.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form Container */}
      <div className="bg-background flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Mobile Header Logo */}
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <BrandLogo size="md" />
        </div>

        {/* Form Slot */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-4">
          {children}
        </div>

        {/* Footer Legal & Support Links */}
        <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-6 text-xs">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors">
            Operator Support
          </Link>
        </div>
      </div>
    </div>
  );
}
