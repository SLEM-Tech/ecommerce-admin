import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { tables, getStores } from "@/lib/stores";
import { slugify, type ProductCsvRow } from "@/lib/csv";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

async function getOrCreateCategory(
  T: ReturnType<typeof tables>,
  name: string
): Promise<number> {
  const existing = await query<{ id: number }>(
    `SELECT id FROM ${T.categories} WHERE name = $1 LIMIT 1`,
    [name]
  );
  if (existing.length) return existing[0].id;

  const slug = slugify(name);
  const [created] = await query<{ id: number }>(
    `INSERT INTO ${T.categories} (name, slug) VALUES ($1, $2) RETURNING id`,
    [name, slug]
  );
  return created.id;
}

async function upsertProduct(
  T: ReturnType<typeof tables>,
  row: ProductCsvRow,
  rowIndex: number
): Promise<{ action: "inserted" | "updated" | "skipped"; error?: string }> {
  const name = row.name?.trim();
  if (!name) return { action: "skipped", error: "name is required" };

  const slug = row.slug?.trim() || slugify(name);
  const price = parseFloat(row.price) || 0;
  const regularPrice = row.regular_price ? parseFloat(row.regular_price) : null;
  const salePrice = row.sale_price ? parseFloat(row.sale_price) : null;
  const stockQty = parseInt(row.stock_quantity, 10) || 0;
  const stockStatus = row.stock_status || "instock";
  const status = row.status || "publish";
  const type = row.type || "simple";
  const sku = row.sku?.trim() || null;

  // Check if product exists by SKU or slug
  let existingId: number | null = null;
  if (sku) {
    const existing = await query<{ id: number }>(
      `SELECT id FROM ${T.products} WHERE sku = $1 LIMIT 1`,
      [sku]
    );
    if (existing.length) existingId = existing[0].id;
  }
  if (!existingId) {
    const existing = await query<{ id: number }>(
      `SELECT id FROM ${T.products} WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (existing.length) existingId = existing[0].id;
  }

  let productId: number;
  let action: "inserted" | "updated";

  if (existingId) {
    await query(
      `UPDATE ${T.products} SET
        name = $1, slug = $2, sku = $3, description = $4, short_description = $5,
        price = $6, regular_price = $7, sale_price = $8, stock_status = $9,
        stock_quantity = $10, status = $11, type = $12, updated_at = NOW()
      WHERE id = $13`,
      [
        name, slug, sku, row.description || "", row.short_description || "",
        price, regularPrice, salePrice, stockStatus, stockQty, status, type,
        existingId,
      ]
    );
    productId = existingId;
    action = "updated";
  } else {
    // Handle slug conflicts by appending a suffix
    let finalSlug = slug;
    const conflicts = await query<{ slug: string }>(
      `SELECT slug FROM ${T.products} WHERE slug LIKE $1`,
      [`${slug}%`]
    );
    if (conflicts.some((r) => r.slug === slug)) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const [created] = await query<{ id: number }>(
      `INSERT INTO ${T.products}
        (name, slug, sku, description, short_description, price, regular_price,
         sale_price, stock_status, stock_quantity, status, type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        name, finalSlug, sku, row.description || "", row.short_description || "",
        price, regularPrice, salePrice, stockStatus, stockQty, status, type,
      ]
    );
    productId = created.id;
    action = "inserted";
  }

  // Sync categories
  const categoryNames = row.categories
    ? row.categories.split("|").map((c) => c.trim()).filter(Boolean)
    : [];
  if (categoryNames.length) {
    await query(`DELETE FROM ${T.productCategories} WHERE product_id = $1`, [productId]);
    for (const catName of categoryNames) {
      const catId = await getOrCreateCategory(T, catName);
      await query(
        `INSERT INTO ${T.productCategories} (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [productId, catId]
      );
    }
  }

  // Sync images
  const imageUrls = row.images
    ? row.images.split("|").map((u) => u.trim()).filter(Boolean)
    : [];
  if (imageUrls.length) {
    await query(`DELETE FROM ${T.productImages} WHERE product_id = $1`, [productId]);
    for (let i = 0; i < imageUrls.length; i++) {
      await query(
        `INSERT INTO ${T.productImages} (product_id, src, position) VALUES ($1,$2,$3)`,
        [productId, imageUrls[i], i]
      );
    }
  }

  // Sync attributes
  if (row.attributes?.trim()) {
    try {
      const attrs = JSON.parse(row.attributes) as { name: string; options: string[] }[];
      await query(`DELETE FROM ${T.productAttributes} WHERE product_id = $1`, [productId]);
      for (let i = 0; i < attrs.length; i++) {
        await query(
          `INSERT INTO ${T.productAttributes} (product_id, name, options, position) VALUES ($1,$2,$3,$4)`,
          [productId, attrs[i].name, attrs[i].options, i]
        );
      }
    } catch {
      // Invalid JSON attributes — skip silently
    }
  }

  return { action };
}

export async function POST(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix");

  if (!prefix) {
    return NextResponse.json({ message: "prefix is required" }, { status: 400 });
  }

  const stores = getStores();
  if (!stores.find((s) => s.prefix === prefix)) {
    return NextResponse.json({ message: "Unknown store prefix" }, { status: 400 });
  }

  const T = tables(prefix);

  let rows: ProductCsvRow[];
  try {
    const body = await req.json();
    rows = body.rows as ProductCsvRow[];
    if (!Array.isArray(rows)) throw new Error("rows must be an array");
  } catch (err) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const result: ImportResult = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const { action, error } = await upsertProduct(T, rows[i], i + 2);
      if (action === "inserted") result.inserted++;
      else if (action === "updated") result.updated++;
      else {
        result.skipped++;
        if (error) result.errors.push({ row: i + 2, message: error });
      }
    } catch (err: unknown) {
      result.skipped++;
      result.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(result);
}
