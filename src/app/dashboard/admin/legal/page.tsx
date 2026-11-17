"use client";

import * as React from "react";
import Link from "next/link";

import {
  ExternalLink,
  Eye,
  FileCheck,
  FileClock,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

import {
  useCreateLegalPageMutation,
  useDeleteLegalPageMutation,
  useLegalPagesQuery,
  useUpdateLegalPageMutation
} from "@/hooks";

import { DashboardTableCard, PageHeader, StatCard, type TableColumn } from "@/widgets";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from "@/ui";
import type { ILegalPage } from "@/types";

export default function AdminLegalManagementPage() {
  const { data: legalPages = [], isLoading, isFetching, refetch } = useLegalPagesQuery();
  const createMutation = useCreateLegalPageMutation();
  const updateMutation = useUpdateLegalPageMutation();
  const deleteMutation = useDeleteLegalPageMutation();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingDoc, setEditingDoc] = React.useState<ILegalPage | null>(null);
  const [deletingDoc, setDeletingDoc] = React.useState<ILegalPage | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    content: "",
    isPublished: true
  });

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      isPublished: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: ILegalPage) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      isPublished: doc.isPublished
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingDoc) {
      await updateMutation.mutateAsync({
        id: editingDoc.id,
        payload: {
          title: formData.title.trim(),
          slug: formData.slug.trim() || undefined,
          content: formData.content,
          isPublished: formData.isPublished
        }
      });
    } else {
      await createMutation.mutateAsync({
        title: formData.title.trim(),
        slug: formData.slug.trim() || undefined,
        content: formData.content,
        isPublished: formData.isPublished
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    await deleteMutation.mutateAsync(deletingDoc.id);
    setDeletingDoc(null);
  };

  const filteredPages = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return legalPages;
    return legalPages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
    );
  }, [legalPages, searchTerm]);

  const totalCount = legalPages.length;
  const publishedCount = legalPages.filter((p) => p.isPublished).length;
  const draftCount = totalCount - publishedCount;

  const columns: TableColumn<ILegalPage>[] = [
    {
      header: "DOCUMENT TITLE",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-foreground text-xs font-bold sm:text-sm">{item.title}</span>
          <span className="text-muted-foreground font-mono text-[11px]">/legal/{item.slug}</span>
        </div>
      )
    },
    {
      header: "STATUS",
      sortValue: (item) => (item.isPublished ? "PUBLISHED" : "DRAFT"),
      cell: (item) => (
        <Badge
          variant="outline"
          className={
            item.isPublished
              ? "border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/20 bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400"
          }
        >
          {item.isPublished ? "Published" : "Draft"}
        </Badge>
      )
    },
    {
      header: "LAST UPDATED",
      sortValue: (item) => item.updatedAt,
      cell: (item) => (
        <span className="text-muted-foreground text-xs font-medium">
          {item.updatedAt ? format(new Date(item.updatedAt), "MMM dd, yyyy HH:mm") : "N/A"}
        </span>
      )
    },
    {
      header: "ACTIONS",
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            title="Preview public page"
          >
            <Link href={`/legal/${item.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEdit(item)}
            className="h-8 rounded-lg px-2.5 text-xs font-semibold"
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeletingDoc(item)}
            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
            title="Delete document"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header with New Document Button */}
      <PageHeader
        title="Legal Documents"
        description="Manage terms of service, privacy policies, passenger transport regulations, and legal disclosures."
      >
        <Button
          onClick={handleOpenCreate}
          className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>New Document</span>
        </Button>
      </PageHeader>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Documents"
          value={isLoading ? "..." : totalCount}
          description="Legal & regulatory pages"
          icon={FileText}
        />
        <StatCard
          title="Published & Active"
          value={isLoading ? "..." : publishedCount}
          description="Live on passenger storefront"
          icon={FileCheck}
        />
        <StatCard
          title="Draft / Inactive"
          value={isLoading ? "..." : draftCount}
          description="Hidden from public access"
          icon={FileClock}
        />
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title or slug..."
            className="h-10 rounded-xl pl-9 text-xs"
          />
        </div>
      </div>

      {/* 4. Table Card */}
      <DashboardTableCard
        title="All Legal Documents"
        columns={columns}
        data={filteredPages}
        isLoading={isLoading}
        emptyMessage="No legal documents found. Click 'New Document' to create one."
      />

      {/* 5. Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingDoc ? `Edit Document: ${editingDoc.title}` : "Create New Legal Document"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Content supports Markdown formatting (# Header, * list, **bold**, tables).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Terms of Service"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Slug (URL identifier)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. terms-of-service (leave empty to auto-generate)"
                  className="rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublished: Boolean(checked) })
                }
              />
              <Label htmlFor="isPublished" className="cursor-pointer text-xs font-medium">
                Publish immediately (visible to passengers)
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Content (Markdown) *</Label>
              <textarea
                required
                rows={16}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="# Document Title&#10;&#10;Write policy details here in Markdown..."
                className="border-input bg-muted/20 text-foreground focus-visible:border-ring w-full rounded-2xl border p-4 font-mono text-xs leading-relaxed transition-colors focus-visible:outline-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-9 rounded-xl text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-9 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-700"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                <span>{editingDoc ? "Save Changes" : "Create Document"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Delete Confirmation Modal */}
      <Dialog open={Boolean(deletingDoc)} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive text-base font-bold">
              Delete Legal Document?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deletingDoc?.title}</strong>? This action cannot
              be undone and passengers will no longer be able to view this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeletingDoc(null)}
              className="h-9 rounded-xl text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="h-9 rounded-xl text-xs font-bold"
            >
              {deleteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <span>Delete Document</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
