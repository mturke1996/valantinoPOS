import * as XLSX from "xlsx";

export interface ProductImportRow {
  nameAr: string;
  nameEn: string | null;
  sku: string;
  barcode: string | null;
  categoryName: string | null;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  minStock: number;
  stockQuantity: number;
  unitType: "piece" | "weight" | "box";
  trackStock: boolean;
}

export interface ProductImportResult {
  rows: ProductImportRow[];
  errors: string[];
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function mapUnit(raw: string): "piece" | "weight" | "box" {
  const v = raw.toLowerCase();
  if (v.includes("وزن") || v.includes("weight") || v === "kg" || v === "g") {
    return "weight";
  }
  if (v.includes("علبة") || v.includes("box")) return "box";
  return "piece";
}

/** Parse CSV or XLSX ArrayBuffer into product rows */
export function parseProductImportFile(
  buffer: ArrayBuffer,
  filename: string,
): ProductImportResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ["الملف لا يحتوي على أوراق"] };
  }
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const rows: ProductImportRow[] = [];
  const errors: string[] = [];

  json.forEach((raw, index) => {
    const line = index + 2;
    const nameAr =
      str(raw["الاسم"] ?? raw["name_ar"] ?? raw["nameAr"] ?? raw["Name"]);
    const sku = str(raw["SKU"] ?? raw["sku"] ?? raw["الكود"]);
    if (!nameAr) {
      errors.push(`سطر ${line}: الاسم مطلوب`);
      return;
    }
    if (!sku) {
      errors.push(`سطر ${line}: SKU مطلوب (${nameAr})`);
      return;
    }

    rows.push({
      nameAr,
      nameEn: str(raw["name_en"] ?? raw["nameEn"] ?? raw["English"]) || null,
      sku: sku.toUpperCase(),
      barcode: str(raw["barcode"] ?? raw["Barcode"] ?? raw["الباركود"]) || null,
      categoryName:
        str(raw["الفئة"] ?? raw["category"] ?? raw["Category"]) || null,
      retailPrice: num(raw["سعر البيع"] ?? raw["retail_price"] ?? raw["price"], 0),
      wholesalePrice: num(
        raw["سعر الجملة"] ?? raw["wholesale_price"] ?? raw["wholesale"],
        0,
      ),
      costPrice: num(raw["التكلفة"] ?? raw["cost_price"] ?? raw["cost"], 0),
      minStock: num(raw["الحد الأدنى"] ?? raw["min_stock"] ?? raw["minStock"], 0),
      stockQuantity: num(
        raw["المخزون"] ?? raw["stock"] ?? raw["stock_quantity"],
        0,
      ),
      unitType: mapUnit(str(raw["الوحدة"] ?? raw["unit"] ?? raw["unit_type"])),
      trackStock: (() => {
        const v = str(raw["تتبع المخزون"] ?? raw["track_stock"] ?? "yes");
        return !["0", "false", "لا", "no"].includes(v.toLowerCase());
      })(),
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push(
      `لا توجد صفوف صالحة. الملف: ${filename}. استخدم أعمدة: الاسم، SKU، سعر البيع…`,
    );
  }

  return { rows, errors };
}

export function buildProductImportTemplate(): Blob {
  const sample = [
    {
      الاسم: "شوكولاتة بلجيكية 250غ",
      name_en: "Belgian Chocolate 250g",
      SKU: "VAL-001",
      الباركود: "6281000000001",
      الفئة: "شوكولاتة فاخرة",
      "سعر البيع": 45,
      "سعر الجملة": 38,
      التكلفة: 22,
      "الحد الأدنى": 10,
      المخزون: 50,
      الوحدة: "قطعة",
      "تتبع المخزون": "نعم",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(sample);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "منتجات");
  const out = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
