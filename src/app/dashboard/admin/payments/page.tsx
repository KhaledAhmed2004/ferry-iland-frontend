"use client";

import { PageHeader } from "@/widgets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui";

import { usePaymentsFilters, type PaymentsTab as Tab } from "./_components/payments-shared";
import { PaymentsTab } from "./_components/PaymentsTab";
import { PayoutsTab } from "./_components/PayoutsTab";
import { RefundsTab } from "./_components/RefundsTab";

/** Spec 0006: Payments, Refunds and Operator payouts, sharing one filter bar. */
export default function AdminPaymentsPage() {
  const filters = usePaymentsFilters();

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Payments & Payouts"
        description="Stripe payments, refunds, and what each ferry operator earned from sailed trips."
      />

      <Tabs
        value={filters.tab}
        onValueChange={(value) => filters.setState({ tab: value as Tab })}
        className="space-y-4"
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="payouts">Operator payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-0">
          <PaymentsTab filters={filters} />
        </TabsContent>
        <TabsContent value="refunds" className="mt-0">
          <RefundsTab filters={filters} />
        </TabsContent>
        <TabsContent value="payouts" className="mt-0">
          <PayoutsTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
