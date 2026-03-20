// CSV column definitions for products
export const PRODUCT_CSV_COLUMNS = [
  "name",
  "slug",
  "sku",
  "description",
  "short_description",
  "price",
  "regular_price",
  "sale_price",
  "stock_status",
  "stock_quantity",
  "status",
  "type",
  "categories",   // pipe-separated category names
  "images",       // pipe-separated image URLs (first = featured)
  "attributes",   // JSON: [{"name":"Color","options":["Red","Blue"]}]
] as const;

export type ProductCsvRow = Record<(typeof PRODUCT_CSV_COLUMNS)[number], string>;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
