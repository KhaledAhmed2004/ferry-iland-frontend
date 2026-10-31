import { BarChart3, Loader2 } from "lucide-react";

/** Shown in place of a dashboard chart when the backend returned no series for the period. */
export function ChartEmptyState({ title, isLoading = false }: { title: string; isLoading?: boolean }) {
  return (
    <div className="bg-card text-card-foreground border-border/80 flex min-h-[260px] flex-col rounded-xl border p-5 shadow-xs md:p-6">
      <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        )}
        <p className="text-xs" role="status">
          {isLoading ? "Loading chart…" : "No data for this period yet."}
        </p>
      </div>
    </div>
  );
}
