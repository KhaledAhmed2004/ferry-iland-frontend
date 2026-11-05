"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { AlertCircle, Copy, Eye, Mail, MapPin, Phone, RefreshCw, Ship, Ticket } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAdminBookingsQuery, useDebounce } from "@/hooks";

import {
  BookingDetailsModal,
  DashboardPageSkeleton,
  DashboardTableCard,
  DataTableRowActions,
  PageHeader,
  StatusBadge,
  TableToolbar,
  type TableColumn
} from "@/widgets";
import { Badge, Button, Skeleton } from "@/ui";
import type { IAdminBookingItem } from "@/types";

import { BookingKpiGrid } from "./_components/BookingKpiGrid";

type BookingStatusTab = "ALL" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "PENDING" | "EXPIRED";

function AdminBookingsContent() {
  const searchParams = useSearchParams();
  const searchParamVal = searchParams.get("search") || searchParams.get("ref") || "";

  const [searchTerm, setSearchTerm] = React.useState(searchParamVal);
  const debouncedSearch = useDebounce(searchTerm, 350);

  const [activeTab, setActiveTab] = React.useState<BookingStatusTab>("ALL");
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const [selectedBooking, setSelectedBooking] = React.useState<IAdminBookingItem | null>(null);

  // Sync if URL search query changes
  React.useEffect(() => {
    if (searchParamVal && searchParamVal !== searchTerm) {
      setSearchTerm(searchParamVal);
    }
  }, [searchParamVal]);

  // Reset to first page when search query or filter tab changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminBookingsQuery({
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    status: activeTab === "ALL" ? undefined : activeTab
  });

  const bookings = data?.data ?? [];

  // When navigated with a specific reference search, auto-open the booking detail modal
  React.useEffect(() => {
    if (searchParamVal && bookings.length > 0 && !selectedBooking) {
      const match =
        bookings.find((b) => b.reference.toLowerCase() === searchParamVal.toLowerCase()) ||
        bookings[0];
      if (match) {
        setSelectedBooking(match);
      }
    }
  }, [searchParamVal, bookings, selectedBooking]);
  const meta = data?.meta ?? {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  };

  const totalCount = meta.total ?? bookings.length;
  const totalPages = Math.max(1, meta.totalPages ?? Math.ceil(totalCount / limit));

  // Platform-wide counts per status from the API (not just the rows on this page).
  const statusCounts = meta.statusCounts ?? {};
  const confirmedCount = statusCounts.CONFIRMED ?? 0;
  const checkedInCount = statusCounts.CHECKED_IN ?? 0;
  const cancelledCount = statusCounts.CANCELLED ?? 0;
  const pendingCount = statusCounts.PENDING ?? 0;
  const expiredCount = statusCounts.EXPIRED ?? 0;
  const allStatusesCount = meta.statusCounts
    ? Object.values(meta.statusCounts).reduce((sum, n) => sum + (n ?? 0), 0)
    : totalCount;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const bookingColumns: TableColumn<IAdminBookingItem>[] = [
    {
      header: "BOOKING REFERENCE",
      sortValue: (item) => item.reference,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-mono text-xs font-bold">{item.reference}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(item.reference, "Reference")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy Reference"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              {item.createdAt ? format(new Date(item.createdAt), "MMM dd, yyyy") : "—"}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "PASSENGER",
      sortValue: (item) => item.leadPassengerName,
      cell: (item) => (
        <div className="max-w-[180px] space-y-0.5">
          <div className="text-foreground truncate text-xs font-bold">{item.leadPassengerName}</div>
          <div className="text-muted-foreground flex items-center gap-1 truncate font-mono text-[11px]">
            <Mail className="text-muted-foreground h-3 w-3 shrink-0" />
            <span className="truncate">{item.leadPassengerEmail}</span>
          </div>
          {item.leadPassengerPhone && (
            <div className="text-muted-foreground/80 flex items-center gap-1 truncate font-mono text-[10px]">
              <Phone className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
              <span>{item.leadPassengerPhone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "ROUTE & PORTS",
      cell: (item) => {
        const schedule = item.schedule;
        const dep = schedule?.route?.departurePort?.name || "Departure Port";
        const arr = schedule?.route?.destinationPort?.name || "Island Jetty";
        return (
          <div className="max-w-[190px] space-y-0.5">
            <div className="text-foreground flex items-center gap-1 text-xs font-medium">
              <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
              <span className="truncate">{dep}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 pl-3.5 text-[11px]">
              <span>➔</span>
              <span className="truncate">{arr}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "OPERATOR & FERRY",
      cell: (item) => {
        const schedule = item.schedule;
        const opName = schedule?.route?.operator?.companyName || "Commercial Carrier";
        const ferryName = schedule?.ferry?.name || "Express Ferry";
        return (
          <div className="max-w-[150px] space-y-0.5">
            <div className="text-foreground truncate text-xs font-semibold">{opName}</div>
            <div className="text-muted-foreground flex items-center gap-1 truncate text-[11px]">
              <Ship className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate">{ferryName}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "TRAVEL TIME",
      sortValue: (item) =>
        item.schedule?.departureTime ? new Date(item.schedule.departureTime) : undefined,
      cell: (item) => {
        const time = item.schedule?.departureTime;
        if (!time) return <span className="text-muted-foreground text-xs">—</span>;
        const dateObj = new Date(time);
        return (
          <div className="space-y-0.5">
            <div className="text-foreground text-xs font-semibold">
              {format(dateObj, "MMM dd, yyyy")}
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              {format(dateObj, "hh:mm a")}
            </div>
          </div>
        );
      }
    },
    {
      header: "PAX",
      sortValue: (item) => item.adultsCount + item.childrenCount,
      align: "center",
      headerClassName: "text-center",
      cell: (item) => (
        <div className="flex flex-col items-center justify-center">
          <span className="text-foreground text-xs font-bold">
            {item.adultsCount + item.childrenCount}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {item.adultsCount}A{item.childrenCount > 0 ? ` + ${item.childrenCount}C` : ""}
          </span>
        </div>
      )
    },
    {
      header: "AMOUNT",
      sortValue: (item) => Number(item.totalAmount),
      cell: (item) => (
        <div className="text-foreground text-xs font-black">
          ${Number(item.totalAmount).toFixed(2)}
          <span className="text-muted-foreground ml-0.5 text-[10px] font-bold">
            {item.currency || "USD"}
          </span>
        </div>
      )
    },
    {
      header: "STATUS",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => (
        <DataTableRowActions
          actions={[
            { label: "View details", icon: Eye, onSelect: () => setSelectedBooking(item) },
            {
              label: "Copy reference",
              icon: Copy,
              onSelect: () => copyToClipboard(item.reference, "Reference"),
              separatorBefore: true
            }
          ]}
        />
      )
    }
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Page Header */}
      <PageHeader
        title="Platform Bookings"
        badge={
          isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <Badge
              variant="outline"
              className="text-primary border-primary/30 bg-primary/5 font-mono text-xs font-bold"
            >
              {allStatusesCount} Total
            </Badge>
          )
        }
        description="Live centralized reservation manifest across all island transfer routes and operators."
      />

      {/* KPI Metric Summary Cards */}
      <BookingKpiGrid
        totalCount={allStatusesCount}
        confirmedCount={confirmedCount}
        checkedInCount={checkedInCount}
        cancelledCount={cancelledCount}
        isLoading={isLoading}
      />

      {/* Reusable Search & Status Toolbar */}

      {/* Bookings Data Table Card */}
      {isError ? (
        <div className="border-destructive/20 bg-destructive/10 space-y-4 rounded-2xl border p-8 text-center">
          <AlertCircle className="text-destructive mx-auto h-10 w-10" />
          <h2 className="text-foreground text-lg font-bold">Failed to Load Platform Bookings</h2>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            {error?.message ||
              "Could not retrieve bookings from the live server. Please verify your connection."}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <DashboardTableCard
          itemName="bookings"
          toolbar={
            <TableToolbar
              countsLoading={isLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search reference, passenger, or email..."
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { value: "ALL", label: "All Bookings", count: allStatusesCount },
                { value: "CONFIRMED", label: "Confirmed", count: confirmedCount },
                { value: "CHECKED_IN", label: "Checked In", count: checkedInCount },
                { value: "CANCELLED", label: "Cancelled", count: cancelledCount },
                { value: "PENDING", label: "Pending", count: pendingCount },
                { value: "EXPIRED", label: "Expired", count: expiredCount }
              ]}
            />
          }
          pagination={{
            page,
            pageSize: limit,
            totalCount,
            totalPages,
            onPageChange: setPage
          }}
          enableColumnVisibility
          title="Platform Bookings Manifest"
          columns={bookingColumns}
          data={bookings}
          isLoading={isLoading}
          isFetching={isFetching}
          keyExtractor={(item) => item.id}
          emptyMessage={
            searchTerm
              ? `No bookings matched your search query "${searchTerm}".`
              : activeTab !== "ALL"
                ? `No ${activeTab.toLowerCase()} bookings found.`
                : "No platform bookings have been recorded yet."
          }
        />
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
        onBookingCancelled={() => {
          refetch();
        }}
      />
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardPageSkeleton
          statCount={4}
          statGridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        />
      }
    >
      <AdminBookingsContent />
    </React.Suspense>
  );
}
