"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildProductImportTemplate,
  parseProductImportFile,
  type ProductImportRow,
} from "@/lib/products/import-products";
import {
  createCategory,
  createProduct,
  getCategories,
  getSettings,
} from "@/lib/data/store";
import type { UnitType } from "@/types";

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

function mapUnitType(unit: ProductImportRow["unitType"]): UnitType {
  if (unit === "weight") return "gram";
  if (unit === "box") return "box";
  return "piece";
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "")
      .slice(0, 40) || `cat-${Date.now()}`
  );
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImported,
}: ProductImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setRows([]);
    setErrors([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const downloadTemplate = () => {
    const blob = buildProductImportTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valentino-products-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = parseProductImportFile(buffer, file.name);
      setFileName(file.name);
      setRows(result.rows);
      setErrors(result.errors);
      if (result.rows.length === 0) {
        toast.error(result.errors[0] ?? "لا توجد صفوف صالحة");
      } else if (result.errors.length > 0) {
        toast.warning(
          `تم قراءة ${result.rows.length} صف مع ${result.errors.length} تحذير`,
        );
      } else {
        toast.success(`تم قراءة ${result.rows.length} منتج`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر قراءة الملف",
      );
      reset();
    }
  };

  const resolveCategoryId = (
    categoryName: string | null,
    branchId: string,
  ): string => {
    const categories = getCategories().filter((c) => c.branchId === branchId);
    if (!categoryName) {
      const fallback =
        categories.find((c) => c.slug === "general" || c.nameAr === "عام") ??
        categories[0];
      if (fallback) return fallback.id;
      return createCategory({
        branchId,
        parentId: null,
        nameAr: "عام",
        nameEn: "General",
        slug: "general",
        sortOrder: 0,
      }).id;
    }

    const existing = categories.find(
      (c) => c.nameAr === categoryName.trim(),
    );
    if (existing) return existing.id;

    return createCategory({
      branchId,
      parentId: null,
      nameAr: categoryName.trim(),
      nameEn: null,
      slug: slugify(categoryName),
      sortOrder: categories.length + 1,
    }).id;
  };

  const runImport = async () => {
    if (rows.length === 0) {
      toast.error("لا توجد صفوف للاستيراد");
      return;
    }

    setImporting(true);
    let created = 0;
    const failures: string[] = [];

    try {
      const settings = getSettings();

      for (const row of rows) {
        try {
          const categoryId = resolveCategoryId(
            row.categoryName,
            settings.branchId,
          );
          createProduct({
            branchId: settings.branchId,
            categoryId,
            sku: row.sku,
            barcode: row.barcode ?? "",
            nameAr: row.nameAr,
            nameEn: row.nameEn,
            description: "",
            costPrice: row.costPrice,
            retailPrice: Math.max(row.retailPrice, 0.01),
            wholesalePrice: row.wholesalePrice,
            unitType: mapUnitType(row.unitType),
            weightGrams: null,
            origin: "",
            minStock: 0,
            isBundle: false,
            isActive: true,
            trackStock: false,
          });

          created += 1;
        } catch (error) {
          failures.push(
            `${row.sku}: ${
              error instanceof Error ? error.message : "فشل الإنشاء"
            }`,
          );
        }
      }

      if (created > 0) {
        toast.success(`تم استيراد ${created} منتج`);
        onImported?.();
      }
      if (failures.length > 0) {
        toast.error(
          `فشل ${failures.length} صف: ${failures.slice(0, 2).join(" · ")}`,
        );
      }
      if (created > 0 && failures.length === 0) {
        handleOpenChange(false);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-cacao-800/8 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-gold-400" />
            استيراد منتجات
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 py-5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" />
              تحميل القالب
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              اختيار ملف Excel / CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {fileName ? (
            <p className="text-xs text-muted-foreground">
              الملف: <span className="font-medium text-foreground">{fileName}</span>
              {" · "}
              {rows.length} صف
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="max-h-24 overflow-y-auto rounded-lg border border-caramel-500/30 bg-caramel-500/10 px-3 py-2 text-xs text-cacao-800">
              {errors.slice(0, 8).map((err) => (
                <p key={err}>{err}</p>
              ))}
              {errors.length > 8 ? (
                <p>…و{errors.length - 8} أخرى</p>
              ) : null}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-cacao-800/10">
              <div className="max-h-[min(50vh,28rem)] overflow-auto">
                <table className="w-full min-w-[40rem] border-collapse text-xs">
                  <thead className="sticky top-0 bg-cream-50">
                    <tr className="border-b border-cacao-800/10 text-muted-foreground">
                      <th className="px-3 py-2 text-start font-semibold">الاسم</th>
                      <th className="px-3 py-2 text-start font-semibold">SKU</th>
                      <th className="px-3 py-2 text-start font-semibold">الفئة</th>
                      <th className="px-3 py-2 text-end font-semibold">السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={`${row.sku}-${row.nameAr}`}
                        className="border-b border-cacao-800/8"
                      >
                        <td className="px-3 py-2 font-medium">{row.nameAr}</td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {row.sku}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.categoryName ?? "عام"}
                        </td>
                        <td className="px-3 py-2 text-end tabular-nums">
                          {row.retailPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cacao-800/15 px-4 py-10 text-center text-sm text-muted-foreground">
              حمّل القالب أو اختر ملفاً لمعاينة المنتجات قبل الاستيراد
            </p>
          )}
        </DialogBody>

        <DialogFooter className="border-t border-cacao-800/8 px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={importing || rows.length === 0}
            onClick={() => void runImport()}
          >
            {importing ? "جاري الاستيراد…" : `استيراد ${rows.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
