/** Must match the `period` keys the backend accepts (`resolvePeriodRange` in dashboard.service.ts). */
export type TimeRangeFilter = "7d" | "15d" | "30d" | "this-month";

export interface TimeRangeOption {
  label: string;
  value: TimeRangeFilter;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 15 Days", value: "15d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month", value: "this-month" }
];

export interface RevenueDataPoint {
  label: string;
  revenue: number;
  commission: number;
  payout: number;
}

export interface BookingsDataPoint {
  label: string;
  bookings: number;
  passengers: number;
}

export interface ProviderFerry {
  id: string;
  name: string;
  type: string;
  capacity: number;
  yearBuilt: number;
  status: "In Service" | "Maintenance" | "Docked";
}

export interface RecentPaymentItem {
  id: string;
  bookingReference: string;
  provider: string;
  bookingAmount: number;
  commission: number;
  providerAmount: number;
  paymentStatus: "Completed" | "Pending" | "Failed";
}
