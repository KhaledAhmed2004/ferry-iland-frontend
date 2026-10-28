"use client";

import * as React from "react";

import {
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
import { cn } from "@/lib/utils";
import {
  useAdminFaqsQuery,
  useBulkCategoryFaqsMutation,
  useBulkDeleteFaqsMutation,
  useBulkPublishFaqsMutation,
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useUpdateFaqMutation
} from "@/hooks/use-faqs";
import {
  DashboardTableCard,
  PageHeader,
  StatCard,
  StatusBadge,
  TablePagination,
  TableToolbar,
  type TableColumn,
  type TableToolbarTab
} from "@/widgets";
import {
  Badge,
  Button,
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
  const {
    data: faqsResponse,
    isLoading,
    isFetching
  } = useAdminFaqsQuery({
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
    bulkPublishMutation.isPending || bulkCategoryMutation.isPending || bulkDeleteMutation.isPending;

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
              isAllCurrentPageSelected ? true : isSomeCurrentPageSelected ? "indeterminate" : false
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
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
          <span className="text-muted-foreground font-mono text-xs font-semibold">
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
        <div className="max-w-xl space-y-1 py-0.5">
          <div className="text-foreground text-xs leading-snug font-bold sm:text-sm">
            {item.question}
          </div>
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
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
            className={cn(
              "rounded-lg px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap",
              color
            )}
          >
            {item.category}
          </Badge>
        );
      }
    },
    {
      header: "STATUS",
      className: "w-28 text-center",
      cell: (item) => <StatusBadge status={item.isPublished !== false ? "Active" : "Suspended"} />
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
            className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold"
          >
            <Edit2 className="text-muted-foreground h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeletingItem(item);
              setIsDeleteModalOpen(true);
            }}
            className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50"
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
        count: faqs.filter((f) => (f.category || "").trim().toLowerCase() === cat.toLowerCase())
          .length
      }))
    ];
  }, [faqs]);

  return (
    <div className="w-full space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      {/* Clean Header */}
      <PageHeader
        title="FAQ Management"
        description={`Create, edit, and organize passenger frequently asked questions (${faqs.length} total).`}
        actions={
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="h-9 gap-1.5 bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add FAQ</span>
          </Button>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard label="Total Questions" value={stats.total} icon={FileQuestion} variant="blue" />
        <StatCard
          label="Published & Active"
          value={stats.published}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="Topic Categories"
          value={stats.categoriesCount}
          icon={Tag}
          variant="purple"
        />
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
          <div className="bg-card/95 dark:bg-card/90 animate-in fade-in slide-in-from-top-2 sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/30 p-3 shadow-lg backdrop-blur-md transition-all duration-200">
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
                className="text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1 text-xs"
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
              <span className="text-foreground text-sm font-bold">Questions Directory</span>
              <span className="text-muted-foreground text-xs font-normal">
                ({totalCount} items total)
              </span>
              {isFetching && (
                <span className="animate-pulse text-[10px] font-medium text-blue-600">
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
              <DialogTitle className="text-foreground flex items-center gap-2 text-base font-bold">
                <FileQuestion className="h-5 w-5 text-blue-600" />
                <span>{editingItem ? "Edit FAQ" : "Add New FAQ"}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
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
                  <span className="text-muted-foreground text-[10px]">
                    Type or select a suggestion
                  </span>
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
                  <span className="text-muted-foreground text-[10px] font-medium">
                    Quick suggestions:
                  </span>
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
                        "cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        formCategory === cat
                          ? "border-blue-500 bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
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
                    "border-input bg-background focus-visible:ring-ring w-full resize-y rounded-xl border p-3 text-xs leading-relaxed transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
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
                  className="border-border h-4 w-4 cursor-pointer rounded text-blue-600 focus:ring-blue-600"
                />
                <label
                  htmlFor="faq-publish-checkbox"
                  className="text-foreground cursor-pointer text-xs font-medium select-none"
                >
                  Publish immediately (visible to passengers on Help portal)
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                className="h-9 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
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
                <span className="text-foreground font-bold">
                  &ldquo;{deletingItem?.question}&rdquo;
                </span>
                ?
              </p>
              <p className="text-muted-foreground text-[11px]">
                This action will remove the question from the passenger Help portal.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 border-t pt-2 sm:gap-0">
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
              <DialogTitle className="text-foreground flex items-center gap-2 text-base font-bold">
                <FolderInput className="h-5 w-5 text-purple-600" />
                <span>Move {selectedCount} FAQs to Category</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
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
                  <span className="text-muted-foreground text-[10px] font-medium">Quick pick:</span>
                  {existingCategories.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBulkCategoryTarget(cat)}
                      className={cn(
                        "cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        bulkCategoryTarget === cat
                          ? "border-purple-500 bg-purple-50 font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                          : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bulkCategoryMutation.isPending}
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkCategoryMutation.isPending || !bulkCategoryTarget.trim()}
                className="h-9 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-700"
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
                <span className="text-foreground font-bold">
                  {selectedCount} selected questions
                </span>
                ?
              </p>
              <p className="text-muted-foreground text-[11px]">
                This action cannot be undone and will remove these questions from the passenger Help
                portal.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 border-t pt-2 sm:gap-0">
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
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete All (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
