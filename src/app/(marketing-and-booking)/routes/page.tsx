import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";

import heroBg from "@/assets/routes/route-bg.png";
import { ExploreRoutesGrid, RouteSearchFilterBar } from "@/widgets";
import { AnimatedSection } from "@/ui";

export const metadata: Metadata = {
  title: "Explore Island Routes | IslandHop",
  description:
    "Discover connections between islands and plan your next journey across the Caribbean."
};

export default function RoutesPage() {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* 1. Hero Banner with Ferry Background */}
      <AnimatedSection initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} delay={0}>
        <section className="bg-background relative w-full overflow-hidden pt-12 pb-24 md:pt-16 md:pb-28">
          {/* Background Ferry Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src={heroBg}
              alt="Cruise ferry on turquoise ocean"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="from-background via-background/20 absolute inset-0 bg-gradient-to-r to-transparent md:hidden" />
          </div>

          <div className="relative z-10 container mx-auto max-w-7xl p-4 sm:px-6 md:py-10 lg:px-8 lg:py-20">
            <div className="max-w-xl space-y-4">
              <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Explore our <br />
                <span className="text-primary">ferry routes</span>
              </h1>

              <p className="text-foreground/80 text-sm font-medium sm:text-base">
                Ferry connections across the Caribbean islands.
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* 2. From/To filter — writes ?from=&to= which the grid below reads */}
      <AnimatedSection
        delay={0.05}
        className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <Suspense fallback={null}>
          <RouteSearchFilterBar />
        </Suspense>
      </AnimatedSection>

      {/* 3. Routes grid */}
      <main className="container mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection delay={0.05}>
          <Suspense fallback={null}>
            <ExploreRoutesGrid />
          </Suspense>
        </AnimatedSection>
      </main>
    </div>
  );
}
