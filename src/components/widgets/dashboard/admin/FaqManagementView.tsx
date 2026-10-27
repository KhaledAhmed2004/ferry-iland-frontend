"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit2,
  EyeOff,
  FileQuestion,
  FolderInput,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminFaqsQuery,
  useBulkCategoryFaqsMutation,
  useBulkDeleteFaqsMutation,
  useBulkPublishFaqsMutation,
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useUpdateFaqMutation
} from "@/hooks/use-faqs";
import { FAQ_DATA, type FAQItem } from "@/data/faqs";
import type { IFaqItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from "@/ui";
import {
  DashboardTableCard,
  StatusBadge,
  TablePagination,
  TableToolbar,
  type TableColumn,
  type TableToolbarTab
} from "@/widgets";

export interface ManagedFAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isPublished?: boolean;
  order?: number;
  updatedAt?: string;
}

export function FaqManagementView() {
  // Filters, Search & Pagination
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Bulk Selection States
  const [selectedFaqIds, setSelectedFaqIds] = React.useState<Set<string>>(new Set());
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = React.useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = React.useState("Booking");
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);

  // React Query Hooks
  const { data: faqsResponse, isLoading, isFetching } = useAdminFaqsQuery({
    search: searchTerm,
    category: selectedCategory === "ALL" ? undefined : selectedCategory,
    page,
    limit: pageSize
  });

  const createFaqMutation = useCreateFaqMutation();
  const updateFaqMutation = useUpdateFaqMutation();
  const deleteFaqMutation = useDeleteFaqMutation();
  const bulkPublishMutation = useBulkPublishFaqsMutation();
  const bulkCategoryMutation = useBulkCategoryFaqsMutation();
  const bulkDeleteMutation = useBulkDeleteFaqsMutation();

  const isBulkOperating =
    bulkPublishMutation.isPending ||
    bulkCategoryMutation.isPending ||
    bulkDeleteMutation.isPending;

  React.useEffect(() => {
    setPage(1);
    setSelectedFaqIds(new Set());
  }, [searchTerm, selectedCategory]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ManagedFAQItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<ManagedFAQItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  // Form Fields
  const [formQuestion, setFormQuestion] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("Booking");
  const [formAnswer, setFormAnswer] = React.useState("");
  const [formIsPublished, setFormIsPublished] = React.useState(true);
  const [formErrors, setFormErrors] = React.useState<{
    question?: string;
    category?: string;
    answer?: string;
  }>({});

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormQuestion("");
    setFormCategory("Booking");
    setFormAnswer("");
    setFormIsPublished(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ManagedFAQItem) => {
    setEditingItem(item);
    setFormQuestion(item.question);
    setFormCategory(item.category);
    setFormAnswer(item.answer);
    setFormIsPublished(item.isPublished ?? true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { question?: string; category?: string; answer?: string } = {};

    if (!formQuestion.trim()) {
      errors.question = "Question title is required.";
    }
    if (!formCategory.trim()) {
      errors.category = "Category topic is required.";
    }
    if (!formAnswer.trim()) {
      errors.answer = "Answer content cannot be empty.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingItem) {
      updateFaqMutation.mutate(
        {
          id: editingItem.id,
          payload: {
            question: formQuestion.trim(),
            category: formCategory.trim(),
            answer: formAnswer.trim(),
            isPublished: formIsPublished
          }
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
          }
        }
      );
    } else {
      createFaqMutation.mutate(
        {
          question: formQuestion.trim(),
          category: formCategory.trim(),
          answer: formAnswer.trim(),
          isPublished: formIsPublished
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
          }
        }
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    deleteFaqMutation.mutate(deletingItem.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
      }
    });
  };

  // Faqs list from server response
  const faqs = React.useMemo(() => {
    return faqsResponse?.data ?? [];
  }, [faqsResponse]);

  // Dynamically extract all unique categories for quick suggestions & filtering
  const existingCategories = React.useMemo(() => {
    const defaults = ["Booking", "Cancellation & Refund", "Payment", "Travel Information"];
    const serverCategories = faqsResponse?.categories || [];
    const fromFaqs = faqs.map((f) => (f.category || "").trim()).filter(Boolean);
    return Array.from(new Set([...defaults, ...serverCategories, ...fromFaqs]));
  }, [faqsResponse, faqs]);

  // Selection Computations
  const selectedCount = selectedFaqIds.size;
  const displayedFaqIds = React.useMemo(() => faqs.map((f) => f.id), [faqs]);

  const isAllCurrentPageSelected =
    displayedFaqIds.length > 0 && displayedFaqIds.every((id) => selectedFaqIds.has(id));
  const isSomeCurrentPageSelected =
    displayedFaqIds.some((id) => selectedFaqIds.has(id)) && !isAllCurrentPageSelected;

  const toggleSelectAllCurrentPage = () => {
    setSelectedFaqIds((prev) => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        displayedFaqIds.forEach((id) => next.delete(id));
      } else {
        displayedFaqIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedFaqIds(new Set());
  };

  // Bulk Handlers
  const handleBulkPublish = (publish: boolean) => {
    if (selectedFaqIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedFaqIds);

    bulkPublishMutation.mutate(
      { ids, isPublished: publish },
      {
        onSuccess: () => {
          clearSelection();
        }
      }
    );
  };

  const handleBulkCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFaqIds.size === 0 || !bulkCategoryTarget.trim() || isBulkOperating) return;
    const ids = Array.from(selectedFaqIds);

    bulkCategoryMutation.mutate(
      { ids, category: bulkCategoryTarget.trim() },
      {
        onSuccess: () => {
          setIsBulkCategoryModalOpen(false);
          clearSelection();
        }
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedFaqIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedFaqIds);

    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setIsBulkDeleteModalOpen(false);
        clearSelection();
      }
    });
  };

  // Pagination Calculations directly from server
  const totalCount = faqsResponse?.meta.total ?? faqs.length;
  const totalPages = Math.max(1, faqsResponse?.meta.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Metric Stats
  const stats = React.useMemo(() => {
    const total = totalCount;
    const published = faqs.filter((f) => f.isPublished !== false).length;
    const categoriesCount = existingCategories.length;
    return { total, published, categoriesCount };
  }, [totalCount, faqs, existingCategories]);

  // Table Columns
  const columns: TableColumn<ManagedFAQItem>[] = [
    {
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              isAllCurrentPageSelected
                ? true
                : isSomeCurrentPageSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={toggleSelectAllCurrentPage}
            aria-label="Select all questions on current page"
          />
        </div>
      ),
      headerClassName: "w-10 px-3 text-center",
      className: "w-10 px-3 text-center",
      align: "center",
      cell: (item) => {
        const isChecked = selectedFaqIds.has(item.id);
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectRow(item.id)}
              aria-label={`Select question ${item.question}`}
            />
          </div>
        );
      }
    },
    {
      header: "#",
      className: "w-12 text-center",
      cell: (_, idx) => {
        const itemNumber = (currentPage - 1) * pageSize + idx + 1;
        return (
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            #{itemNumber}
          </span>
        );
      }
    },
    {
      header: "QUESTION & ANSWER",
      headerClassName: "min-w-[280px]",
      className: "whitespace-normal min-w-[280px] max-w-2xl py-3",
      cell: (item) => (
        <div className="space-y-1 py-0.5 max-w-xl">
          <div className="font-bold text-xs sm:text-sm text-foreground leading-snug">
            {item.question}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {item.answer}
          </p>
        </div>
      )
    },
    {
      header: "CATEGORY",
      className: "w-48 whitespace-nowrap",
      cell: (item) => {
        const cat = (item.category || "").toLowerCase();
        const color =
          cat === "booking"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : cat.includes("cancel") || cat.includes("refund")
            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : cat.includes("pay")
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : cat.includes("travel")
            ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";

        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] font-bold rounded-lg px-2.5 py-0.5 whitespace-nowrap", color)}
          >
            {item.category}
          </Badge>
        );
      }
    },
    {
      header: "STATUS",
      className: "w-28 text-center",
      cell: (item) => (
        <StatusBadge status={item.isPublished !== false ? "Active" : "Suspended"} />
      )
    },
    {
      header: "ACTIONS",
      align: "right",
      className: "w-32 text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditModal(item)}
            className="h-8 gap-1 px-2.5 rounded-lg text-xs font-semibold"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeletingItem(item);
              setIsDeleteModalOpen(true);
            }}
            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            title="Delete FAQ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  // Tab configurations for TableToolbar dynamically generated from current FAQs
  const toolbarTabs: TableToolbarTab<string>[] = React.useMemo(() => {
    const activeCategories = Array.from(
      new Set(faqs.map((f) => (f.category || "").trim()).filter(Boolean))
    );

    return [
      { value: "ALL", label: "All Topics", count: faqs.length },
      ...activeCategories.map((cat) => ({
        value: cat,
        label: cat,
        count: faqs.filter(
          (f) => (f.category || "").trim().toLowerCase() === cat.toLowerCase()
        ).length
      }))
    ];
  }, [faqs]);

  return (
    <div className="w-full space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            FAQ Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Create, edit, and organize passenger frequently asked questions ({faqs.length} total).
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 text-xs font-semibold px-3.5 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add FAQ</span>
        </Button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Questions</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FileQuestion className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Published &amp; Active</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.published}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Topic Categories</p>
              <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                {stats.categoriesCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reusable Search & Category Toolbar */}
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search questions or answers..."
        activeTab={selectedCategory}
        onTabChange={setSelectedCategory}
        tabs={toolbarTabs}
      />

      {/* Table Management View */}
      <div className="flex flex-col gap-4">
        {/* Bulk Action Sticky / Floating Toolbar */}
        {selectedCount > 0 && (
          <div className="bg-card/95 dark:bg-card/90 border-blue-500/30 sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white shadow-2xs">
                {selectedCount}
              </span>
              <span className="text-foreground text-xs font-semibold">
                {selectedCount === 1 ? "question selected" : "questions selected"}
              </span>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Publish */}
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkOperating}
                onClick={() => handleBulkPublish(true)}
                className="h-8 cursor-pointer gap-1.5 border-emerald-200 bg-emerald-50/50 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                title="Publish selected FAQs"
              >
                {bulkPublishMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                )}
                <span>Publish</span>
              </Button>

              {/* Bulk Unpublish */}
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkOperating}
                onClick={() => handleBulkPublish(false)}
                className="h-8 cursor-pointer gap-1.5 border-amber-200 bg-amber-50/50 text-xs font-semibold text-amber-700 shadow-2xs hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                title="Unpublish (Draft) selected FAQs"
              >
                {bulkPublishMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                <span>Unpublish</span>
              </Button>

              {/* Bulk Move Category */}
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkOperating}
                onClick={() => setIsBulkCategoryModalOpen(true)}
                className="h-8 cursor-pointer gap-1.5 border-purple-200 bg-purple-50/50 text-xs font-semibold text-purple-700 shadow-2xs hover:bg-purple-100 hover:text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
                title="Reassign category topic for selected FAQs"
              >
                {bulkCategoryMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderInput className="h-3.5 w-3.5" />
                )}
                <span>Change Topic</span>
              </Button>

              {/* Bulk Delete */}
              <Button
                variant="destructive"
                size="sm"
                disabled={isBulkOperating}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="h-8 cursor-pointer gap-1.5 bg-rose-600 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700"
                title="Delete selected FAQs"
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete ({selectedCount})</span>
              </Button>

              {/* Deselect */}
              <Button
                variant="ghost"
                size="sm"
                disabled={isBulkOperating}
                onClick={clearSelection}
                className="h-8 cursor-pointer gap-1 text-xs text-muted-foreground hover:text-foreground"
                title="Deselect all FAQs"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deselect</span>
              </Button>
            </div>
          </div>
        )}

        <DashboardTableCard
          title={
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Questions Directory</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({totalCount} items total)
              </span>
              {isFetching && (
                <span className="text-[10px] text-blue-600 font-medium animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
          }
          columns={columns}
          data={faqs}
          keyExtractor={(item) => item.id}
          emptyMessage={
            isLoading
              ? "Loading questions from database..."
              : "No questions found matching your filter criteria."
          }
        />

        {/* Proper Table Pagination Component */}
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
          pageSizeOptions={[
            { value: "5", label: "5 per page" },
            { value: "10", label: "10 per page" },
            { value: "20", label: "20 per page" },
            { value: "50", label: "50 per page" }
          ]}
          itemName="FAQs"
        />
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveForm}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <FileQuestion className="h-5 w-5 text-blue-600" />
                <span>{editingItem ? "Edit FAQ" : "Add New FAQ"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingItem
                  ? "Update question title, category topic, or explanation."
                  : "Create a new frequently asked question for passenger self-service."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Question Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Question Title *</Label>
                <Input
                  type="text"
                  placeholder="e.g. Can I travel with excess luggage?"
                  value={formQuestion}
                  onChange={(e) => {
                    setFormQuestion(e.target.value);
                    if (formErrors.question) {
                      setFormErrors((prev) => ({ ...prev, question: undefined }));
                    }
                  }}
                  className={cn("h-9 text-xs", formErrors.question && "border-rose-500")}
                />
                {formErrors.question && (
                  <p className="text-[11px] font-medium text-rose-500">{formErrors.question}</p>
                )}
              </div>

              {/* Category Input Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Category Topic *</Label>
                  <span className="text-[10px] text-muted-foreground">Type or select a suggestion</span>
                </div>
                <Input
                  type="text"
                  list="category-options-list"
                  placeholder="e.g. Booking, Luggage, Boarding, Cancellation & Refund..."
                  value={formCategory}
                  onChange={(e) => {
                    setFormCategory(e.target.value);
                    if (formErrors.category) {
                      setFormErrors((prev) => ({ ...prev, category: undefined }));
                    }
                  }}
                  className={cn("h-9 text-xs", formErrors.category && "border-rose-500")}
                />
                <datalist id="category-options-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && (
                  <p className="text-[11px] font-medium text-rose-500">{formErrors.category}</p>
                )}
                {/* Clickable Quick Suggestion Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Quick suggestions:</span>
                  {existingCategories.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormCategory(cat);
                        if (formErrors.category) {
                          setFormErrors((prev) => ({ ...prev, category: undefined }));
                        }
                      }}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                        formCategory === cat
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold"
                          : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Answer Explanation *</Label>
                <textarea
                  rows={4}
                  placeholder="Explain clearly in 2-4 sentences how passengers should resolve this question..."
                  value={formAnswer}
                  onChange={(e) => {
                    setFormAnswer(e.target.value);
                    if (formErrors.answer) {
                      setFormErrors((prev) => ({ ...prev, answer: undefined }));
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all resize-y",
                    formErrors.answer && "border-rose-500"
                  )}
                />
                {formErrors.answer && (
                  <p className="text-[11px] font-medium text-rose-500">{formErrors.answer}</p>
                )}
              </div>

              {/* Status Radio / Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="faq-publish-checkbox"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
                <label
                  htmlFor="faq-publish-checkbox"
                  className="text-xs font-medium text-foreground cursor-pointer select-none"
                >
                  Publish immediately (visible to passengers on Help portal)
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                className="h-9 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createFaqMutation.isPending || updateFaqMutation.isPending
                  ? "Saving..."
                  : editingItem
                  ? "Save Changes"
                  : "Create FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              <span>Delete FAQ</span>
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs">
              <p>
                Are you sure you want to remove the question:{" "}
                <span className="font-bold text-foreground">
                  &ldquo;{deletingItem?.question}&rdquo;
                </span>
                ?
              </p>
              <p className="text-muted-foreground text-[11px]">
                This action will remove the question from the passenger Help portal.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={deleteFaqMutation.isPending}
                className="rounded-xl text-xs font-semibold"
              >
                Keep FAQ
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteFaqMutation.isPending}
              onClick={handleConfirmDelete}
              className="rounded-xl text-xs font-bold"
            >
              {deleteFaqMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK CATEGORY REASSIGN MODAL */}
      <Dialog open={isBulkCategoryModalOpen} onOpenChange={setIsBulkCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleBulkCategory}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <FolderInput className="h-5 w-5 text-purple-600" />
                <span>Move {selectedCount} FAQs to Category</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose or type a new topic category for all {selectedCount} selected questions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Category Topic *</Label>
                <Input
                  type="text"
                  list="bulk-category-options-list"
                  placeholder="e.g. Booking, Luggage, Boarding, Cancellation & Refund..."
                  value={bulkCategoryTarget}
                  onChange={(e) => setBulkCategoryTarget(e.target.value)}
                  className="h-9 text-xs"
                />
                <datalist id="bulk-category-options-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Quick pick:</span>
                  {existingCategories.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBulkCategoryTarget(cat)}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                        bulkCategoryTarget === cat
                          ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-bold"
                          : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bulkCategoryMutation.isPending}
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkCategoryMutation.isPending || !bulkCategoryTarget.trim()}
                className="h-9 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
              >
                {bulkCategoryMutation.isPending ? "Updating..." : `Move ${selectedCount} FAQs`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE CONFIRMATION DIALOG */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              <span>Delete {selectedCount} Selected FAQs</span>
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs">
              <p>
                Are you sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {selectedCount} selected questions
                </span>
                ?
              </p>
              <p className="text-muted-foreground text-[11px]">
                This action cannot be undone and will remove these questions from the passenger Help portal.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkDeleteMutation.isPending}
                className="rounded-xl text-xs font-semibold"
              >
                Keep FAQs
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleteMutation.isPending}
              onClick={handleBulkDelete}
              className="rounded-xl text-xs font-bold"
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete All (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
