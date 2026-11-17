"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Printer,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

import { useLegalPageQuery, useLegalPagesQuery } from "@/hooks/use-legals";
import {
  AnimatedSection,
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  Skeleton
} from "@/ui";
import { MarkdownContent } from "@/widgets";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export default function DynamicLegalPage({ params }: LegalPageProps) {
  const { slug } = React.use(params);

  const {
    data: document,
    isLoading: isDocLoading,
    isError: isDocError
  } = useLegalPageQuery(slug);

  const { data: allDocs = [], isLoading: isAllDocsLoading } = useLegalPagesQuery();

  // Filter only published docs for public passenger view
  const publishedDocs = React.useMemo(() => {
    return allDocs.filter((doc) => doc.isPublished);
  }, [allDocs]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Document link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Document Icon mapping helper
  const getDocIcon = (docSlug: string) => {
    if (docSlug.includes("privacy")) return Shield;
    if (docSlug.includes("cancel") || docSlug.includes("refund")) return Scale;
    return FileText;
  };

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC]">
      {/* Printable CSS style to isolate document content when printing */}
      <style jsx global>{`
        @media print {
          header,
          footer,
          nav,
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .printable-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 pb-24">
        {/* Top Breadcrumb & Back Link */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground"
          >
            <Link
              href="/"
              className="hover:text-foreground transition-colors font-medium flex items-center gap-1.5"
            >
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            <span className="text-foreground font-semibold">Legal & Policies</span>
            {document && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span className="text-primary font-medium truncate max-w-[200px]">
                  {document.title}
                </span>
              </>
            )}
          </nav>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/help" className="flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Help Center & FAQs
            </Link>
          </Button>
        </div>

        {/* 2-Column Responsive Layout: Left Sidebar (Document Directory) & Right Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Legal Documents Directory (Sticky on desktop) */}
          <aside className="no-print space-y-6 lg:col-span-4">
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
              <div className="mb-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#003B95]/10 text-[#003B95] dark:bg-blue-950/40 dark:text-blue-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h3 className="text-foreground text-sm font-bold tracking-tight">
                    Policies & Terms
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs">
                  Official maritime agreements, privacy terms, and travel guidelines.
                </p>
              </div>

              <Separator className="my-3 opacity-60" />

              {/* Navigation List */}
              <div className="space-y-1.5">
                {isAllDocsLoading ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ) : publishedDocs.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-muted-foreground dark:bg-slate-900/40">
                    No policies available at this time.
                  </div>
                ) : (
                  publishedDocs.map((item) => {
                    const isActive = item.slug === slug;
                    const ItemIcon = getDocIcon(item.slug);

                    return (
                      <Link
                        key={item.id}
                        href={`/legal/${item.slug}`}
                        className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#003B95] text-white shadow-sm dark:bg-blue-600"
                            : "hover:bg-slate-100 hover:text-foreground text-muted-foreground dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? "text-white"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/80" />
                        )}
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Quick Contact Box */}
              <div className="mt-6 rounded-2xl border border-blue-100 bg-[#F0F7FF] p-4 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 font-bold text-[#003B95] dark:text-blue-300">
                  <Shield className="h-4 w-4" />
                  <span>Regulatory Compliance</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  All ferry routes and tickets follow national maritime transport laws and port
                  security regulations.
                </p>
              </div>
            </Card>
          </aside>

          {/* Right Column: Active Document Content */}
          <main className="lg:col-span-8">
            <AnimatedSection initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}>
              <Card className="printable-content border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-10">
                <CardContent className="p-0">
                  {/* Loading State */}
                  {isDocLoading && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-9 w-3/4 rounded-lg" />
                        <Skeleton className="h-4 w-1/3 rounded-md" />
                      </div>
                      <Separator />
                      <div className="space-y-3 pt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    </div>
                  )}

                  {/* Error / Not Found State */}
                  {!isDocLoading && (isDocError || !document || !document.isPublished) && (
                    <div className="py-12 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                        <ShieldAlert className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-foreground">
                          Policy Document Not Found
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                          The requested policy <span className="font-mono font-medium">/{slug}</span>{" "}
                          does not exist or has not been published yet.
                        </p>
                      </div>

                      {publishedDocs.length > 0 && (
                        <div className="pt-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Available Legal Documents:
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {publishedDocs.map((doc) => (
                              <Button key={doc.id} asChild variant="outline" size="sm">
                                <Link href={`/legal/${doc.slug}`}>{doc.title}</Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Published Document Active State */}
                  {!isDocLoading && document && document.isPublished && (
                    <div>
                      {/* Document Header */}
                      <div className="border-b border-border/70 pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#003B95]/10 text-[#003B95] dark:bg-blue-950/40 dark:text-blue-400 border-none font-semibold text-xs px-2.5 py-0.5">
                              Official Document
                            </Badge>
                            <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
                              /{document.slug}
                            </Badge>
                          </div>

                          {/* Print & Share Action Buttons */}
                          <div className="no-print flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyLink}
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copy Link</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrint}
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Print / PDF</span>
                            </Button>
                          </div>
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                          {document.title}
                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>
                              Last Updated:{" "}
                              <strong className="font-semibold text-foreground">
                                {format(new Date(document.updatedAt), "MMMM d, yyyy")}
                              </strong>
                            </span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1.5">
                            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>IslandHop Maritime Platform Standards</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Dynamic Content (Markdown Rendered) */}
                      <div className="pt-6">
                        <MarkdownContent
                          content={document.content}
                          className="text-foreground leading-relaxed"
                        />
                      </div>

                      {/* Document Bottom Footer Note */}
                      <div className="no-print mt-12 border-t border-border/70 pt-6">
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-0.5 text-xs">
                            <div className="font-bold text-foreground">
                              Questions or Legal Inquiries?
                            </div>
                            <div className="text-muted-foreground">
                              Contact our legal operations team at{" "}
                              <a
                                href="mailto:legal@islandhop.com"
                                className="font-medium text-blue-600 underline dark:text-blue-400"
                              >
                                legal@islandhop.com
                              </a>
                            </div>
                          </div>

                          <Button asChild size="sm" variant="default" className="bg-[#003B95] text-xs">
                            <Link href="/help">Help Center & Support</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedSection>
          </main>
        </div>
      </div>
    </div>
  );
}

