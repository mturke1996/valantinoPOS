"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategory, getState } from "@/lib/data/store";
import type { Category } from "@/types";

const ROOT_CATEGORY_VALUE = "__root__";

function makeSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreated: (category: Category) => void;
}

export function CategoryCreateDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: CategoryCreateDialogProps) {
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState(ROOT_CATEGORY_VALUE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNameAr("");
    setNameEn("");
    setParentId(ROOT_CATEGORY_VALUE);
    setSaving(false);
  }, [open]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const state = getState();
      const category = createCategory({
        branchId: state.settings.branchId,
        parentId: parentId === ROOT_CATEGORY_VALUE ? null : parentId,
        nameAr,
        nameEn: nameEn || null,
        slug: makeSlug(nameEn || nameAr),
        sortOrder: categories.length,
      });
      toast.success("تمت إضافة الفئة");
      onCreated(category);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة الفئة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="size-5 text-gold-400" />
              إضافة فئة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name-ar">الاسم العربي *</Label>
              <Input
                id="category-name-ar"
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                autoFocus
                placeholder="مثال: علب المناسبات"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-name-en">الاسم الإنجليزي</Label>
              <Input
                id="category-name-en"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                dir="ltr"
                placeholder="Event Boxes"
              />
            </div>
            <div className="space-y-2">
              <Label>الفئة الرئيسية</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_CATEGORY_VALUE}>
                    فئة رئيسية
                  </SelectItem>
                  {categories
                    .filter((category) => !category.parentId)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nameAr}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={saving || nameAr.trim().length < 2}>
              {saving ? "جاري الحفظ..." : "إضافة الفئة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
