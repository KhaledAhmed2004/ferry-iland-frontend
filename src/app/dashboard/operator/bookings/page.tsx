"use client";

import * as React from "react";

import { CalendarClock } from "lucide-react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Ship,
  Ticket,
  Users
} from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";


import { useDebounce, useOperatorBookingsQuery, useOperatorCheckInMutation } from "@/hooks";

import {
  BookingDetailsModal,
  BookingRequestsPanel,
  BookingsViewSwitch,
  DashboardTableCard,
  StatCard,
  StatusBadge,
  TablePagination,
  TableToolbar,
  type BookingsView,
  type TableColumn,
  type TableToolbarTab,
  MoveBookingDialog,
  isMovableBooking,
  type IMoveBookingTarget
} from "@/widgets";
import { Badge, Button } from "@/ui";
import type { IOperatorBookingItem } from "@/types";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" }
];

type BookingFilterTab = "all" | "confirmed" | "checked-in" | "cancelled" | "pending";

export default function OperatorBookingsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);

  // Spec 0004: change requests live on their own tab beside the bookings table.
  const [view, setView] = React.useState<BookingsView>("bookings");
  const [activeTab, setActiveTab] = React.useState<BookingFilterTab>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedBooking, setSelectedBooking] = React.useState<IOperatorBookingItem | null>(null);
  const [checkingInId, setCheckingInId] = React.useState<string | null>(null);
  const [movingBooking, setMovingBooking] = React.useState<IMoveBookingTarget | null>(null);

  // Status mapping for the API query
  const statusParam = React.useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "checked-in") return "CHECKED_IN";
    return activeTab.toUpperCase();
  }, [activeTab]);

  // Reset to first page when search query or filter tab changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab, pageSize]);

  // Fetch live bookings for this operator
  const { data, isLoading, isError, error, refetch, isFetching } = useOperatorBookingsQuery({
    page,
    limit: pageSize,
    search: debouncedSearch.trim() || undefined,
    status: statusParam
  });

  const checkInMutation = useOperatorCheckInMutation();

  const bookings = data?.bookings ?? [];
  const meta = data?.meta ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1
  };

  const totalCount = meta.total ?? bookings.length;
  const totalPages = Math.max(1, meta.totalPages ?? Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Quick stat counts from the current dataset
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const checkedInCount = bookings.filter((b) => b.status === "CHECKED_IN").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const formatDateSafe = (dateString?: string, formatStr: string = "MMM dd, yyyy") => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (isValid(d)) return format(d, formatStr);
      return dateString;
    } catch {
      return dateString;
    }
  };

  const handleCheckIn = (item: IOperatorBookingItem) => {
    setCheckingInId(item.id);
    checkInMutation.mutate(item.id, {
      onSuccess: () => {
        if (selectedBooking?.id === item.id) {
          setSelectedBooking((prev) => (prev ? { ...prev, status: "CHECKED_IN" } : null));
        }
        setCheckingInId(null);
      },
      onError: () => {
        setCheckingInId(null);
      }
    });
  };

  // Tab configurations with live counts
  const filterTabs: TableToolbarTab<BookingFilterTab>[] = React.useMemo(
    () => [
      { value: "all", label: "All Bookings", count: totalCount },
      {
        value: "confirmed",
        label: "Confirmed",
        count: activeTab === "confirmed" ? totalCount : confirmedCount
      },
      {
        value: "checked-in",
        label: "Checked In",
        count: activeTab === "checked-in" ? totalCount : checkedInCount
      },
      {
        value: "cancelled",
        label: "Cancelled",
        count: activeTab === "cancelled" ? totalCount : cancelledCount
      },
      {
        value: "pending",
        label: "Pending",
        count: activeTab === "pending" ? totalCount : pendingCount
      }
    ],
    [totalCount, confirmedCount, checkedInCount, cancelledCount, pendingCount, activeTab]
  );

  const bookingColumns: TableColumn<IOperatorBookingItem>[] = [
    {
      header: "BOOKING REFERENCE",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBooking(item)}
                className="text-foreground cursor-pointer text-left font-mono text-xs font-bold transition-colors hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
              >
                {item.reference}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(item.reference, "Reference")}
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Copy Reference"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              {formatDateSafe(item.createdAt)}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "PASSENGER",
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
        const arr = schedule?.route?.destinationPort?.name || "Destination Jetty";
        return (
          <div className="max-w-[190px] space-y-0.5">
            <div className="text-foreground flex items-center gap-1 text-xs font-medium">
              <MapPin className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
      header: "FERRY INFO",
      cell: (item) => {
        const schedule = item.schedule;
        const ferryName = schedule?.ferry?.name || "Fleet Vessel";
        const ferryInfo = schedule?.ferry?.type;
        return (
          <div className="max-w-[150px] space-y-0.5">
            <div className="text-foreground flex items-center gap-1 truncate text-xs font-semibold">
              <Ship className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{ferryName}</span>
            </div>
            {ferryInfo && (
              <div className="text-muted-foreground truncate pl-4.5 font-mono text-[11px]">
                {ferryInfo}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "DEPARTURE",
      cell: (item) => {
        const time = item.schedule?.departureTime;
        if (!time) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="space-y-0.5">
            <div className="text-foreground text-xs font-semibold">
              {format(new Date(time), "MMM dd, yyyy")}
            </div>
            <div className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
              <Clock className="text-muted-foreground h-2.5 w-2.5" />
              <span>{format(new Date(time), "hh:mm a")}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "PAX",
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
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => {
        const isCheckingThis = checkingInId === item.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {item.status === "CONFIRMED" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isCheckingThis || checkInMutation.isPending}
                onClick={() => handleCheckIn(item)}
                className="h-7 cursor-pointer gap-1 border-emerald-300 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                title="Mark passenger as boarded"
              >
                {isCheckingThis ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Check In</span>
              </Button>
            )}
            {isMovableBooking(item.status) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setMovingBooking({
                    reference: item.reference,
                    leadPassengerName: item.leadPassengerName,
                    passengers: item.adultsCount + item.childrenCount,
                    status: item.status,
                    hasReturn: !!item.tripType && item.tripType !== "ONE_WAY"
                  })
                }
                className="text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1 px-2 text-xs font-semibold"
                title="Move to another trip"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Move</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedBooking(item)}
              className="text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1 px-2 text-xs font-semibold"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Details</span>
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Passenger Bookings
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-300/40 bg-emerald-50 font-mono text-xs font-bold text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-400"
            >
              {totalCount} Total
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Live reservation manifest, ticket verification, and passenger check-in for your ferry
            routes.
          </p>
        </div>
        <BookingsViewSwitch value={view} onChange={setView} />
      </div>

      {view === "requests" ? (
        <BookingRequestsPanel accent="emerald" />
      ) : (
        <>
          {/* KPI Metric Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Bookings"
              value={totalCount}
              description="Assigned to fleet"
              icon={CalendarCheck}
              variant="emerald"
            />

            <StatCard
              title="Confirmed"
              value={`${confirmedCount} Ready`}
              description="Awaiting check-in"
              icon={CheckCircle2}
              variant="emerald"
              colorValue
            />

            <StatCard
              title="Checked In"
              value={`${checkedInCount} Boarded`}
              description="Passes verified"
              icon={Ticket}
              variant="blue"
              colorValue
            />

            <StatCard
              title="Cancelled"
              value={`${cancelledCount} Cancelled`}
              description="Seats restored"
              icon={AlertCircle}
              variant="rose"
              colorValue
            />
          </div>

          {/* Reusable Toolbar: Search Input on left + Filter Tabs on right */}
          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search passenger, reference, route..."
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as BookingFilterTab)}
            tabs={filterTabs}
          />

          {/* Bookings Data Table Card */}
          {isError ? (
            <div className="border-destructive/20 bg-destructive/10 space-y-4 rounded-2xl border p-8 text-center">
              <AlertCircle className="text-destructive mx-auto h-10 w-10" />
              <h2 className="text-foreground text-lg font-bold">
                Failed to Load Operator Bookings
              </h2>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                {error?.message ||
                  "Could not retrieve bookings from the live server. Please verify your connection."}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="border-border/60 bg-muted/20 flex h-96 animate-pulse flex-col items-center justify-center gap-3 rounded-2xl border">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-muted-foreground text-xs font-medium">
                Retrieving live passenger bookings...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <DashboardTableCard
                title="Passenger Manifest"
                columns={bookingColumns}
                data={bookings}
                keyExtractor={(item) => item.id}
                emptyMessage={
                  searchTerm
                    ? `No bookings matched your search query "${searchTerm}".`
                    : activeTab !== "all"
                      ? `No ${activeTab.replace("-", " ")} bookings found for your fleet.`
                      : "No customer bookings have been recorded for your fleet yet."
                }
              />

              {/* Reusable Pagination Controls */}
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                itemName="bookings"
                isLoading={isFetching}
              />
            </div>
          )}
        </>
      )}

      {/* Comprehensive Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
        onCheckIn={(b) => handleCheckIn(b)}
        isCheckingIn={checkingInId === selectedBooking?.id || checkInMutation.isPending}
        onBookingCancelled={() => {
          refetch();
        }}
      />

      {/* Spec 0004: move a booking to another trip (AC-18) */}
      {movingBooking && (
        <MoveBookingDialog
          key={movingBooking.reference}
          booking={movingBooking}
          accent="emerald"
          onOpenChange={(open) => {
            if (!open) setMovingBooking(null);
          }}
        />
      )}
    </div>
  );
}
