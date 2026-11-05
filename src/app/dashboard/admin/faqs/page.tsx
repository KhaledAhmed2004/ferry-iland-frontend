import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/widgets/dashboard/skeletons/DashboardSkeletons";
import { FaqManagementView } from "./_components/FaqManagementView";

export const metadata: Metadata = {
  title: "FAQ Management | Admin Dashboard | IslandHop",
  description: "Create, edit, and organize frequently asked questions for passenger help portal."
};

export default function AdminFaqsPage() {
  return (
    <Suspense
      fallback={<DashboardPageSkeleton statCount={0} />}
    >
      <FaqManagementView />
    </Suspense>
  );
}
