"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImgbbUploadResult } from "@/lib/imgbb";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadName?: string;
  previewAlt?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageUploadField({
  label = "صورة المنتج",
  value,
  onChange,
  uploadName = "product",
  previewAlt = "معاينة الصورة",
  disabled = false,
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("name", uploadName);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as ImgbbUploadResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "فشل رفع الصورة");

      onChange(data.displayUrl || data.url);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) void uploadFile(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{label}</Label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed p-4 transition-colors",
          dragOver
            ? "border-gold-400 bg-gold-400/10"
            : "border-cacao-800/15 bg-muted/30",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProductImage
            src={value}
            alt={previewAlt}
            size="hero"
            rounded="xl"
            className="max-w-full sm:max-w-[220px]"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              اسحب صورة هنا أو اختر ملفاً — JPG/PNG/WebP حتى 8MB. تُرفع عبر{" "}
              <a
                href="https://api.imgbb.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 underline-offset-2 hover:underline"
              >
                ImgBB
              </a>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : value ? (
                  <Upload className="size-4" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {uploading ? "جاري الرفع..." : value ? "استبدال الصورة" : "رفع صورة"}
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={disabled || uploading}
                  onClick={() => onChange(null)}
                >
                  <Trash2 className="size-4" />
                  إزالة
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image-url-fallback" className="text-xs text-muted-foreground">
                أو الصق رابط صورة مباشر
              </Label>
              <Input
                id="image-url-fallback"
                value={value ?? ""}
                onChange={(event) =>
                  onChange(event.target.value.trim() || null)
                }
                placeholder="https://i.ibb.co/..."
                dir="ltr"
                className="font-mono text-xs"
                disabled={disabled || uploading}
              />
            </div>
          </div>
        </div>
        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={onFileChange}
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
}
