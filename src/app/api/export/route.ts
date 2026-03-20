import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { tables, getStores } from "@/lib/stores";
import { PRODUCT_CSV_COLUMNS } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix");

  if (!prefix) {
    return NextResponse.json({ message: "prefix is required" }, { status: 400 });
  }

  // Validate the prefix is a known store
  const stores = getStores();
  const store = stores.find((s) => s.prefix === prefix);
  if (!store) {
    return NextResponse.json({ message: "Unknown store prefix" }, { status: 400 });
  }

  const T = tables(prefix);

  try {
    const products = await query<Record<string, unknown>>(`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.description,
        p.short_description,
        p.price,
        p.regular_price,
        p.sale_price,
        p.stock_status,
        p.stock_quantity,
        p.status,
        p.type
      FROM ${T.products} p
      ORDER BY p.id
    `);

    // Fetch related data for each product in bulk
    const productIds = products.map((p) => p.id as number);

    let imageMap: Record<number, string[]> = {};
    let categoryMap: Record<number, string[]> = {};
    let attributeMap: Record<number, unknown[]> = {};

    if (productIds.length > 0) {
      const idList = productIds.join(",");

      const images = await query<{ product_id: number; src: string }>(`
        SELECT product_id, src
        FROM ${T.productImages}
        WHERE product_id IN (${idList})
        ORDER BY product_id, position
      `);
      for (const img of images) {
        (imageMap[img.product_id] ??= []).push(img.src);
      }

      const cats = await query<{ product_id: number; name: string }>(`
        SELECT pc.product_id, c.name
        FROM ${T.productCategories} pc
        JOIN ${T.categories} c ON c.id = pc.category_id
        WHERE pc.product_id IN (${idList})
      `);
      for (const cat of cats) {
        (categoryMap[cat.product_id] ??= []).push(cat.name);
      }

      const attrs = await query<{ product_id: number; name: string; options: string[] }>(`
        SELECT product_id, name, options
        FROM ${T.productAttributes}
        WHERE product_id IN (${idList})
        ORDER BY product_id, position
      `);
      for (const attr of attrs) {
        (attributeMap[attr.product_id] ??= []).push({
          name: attr.name,
          options: attr.options,
        });
      }
    }

    // Build CSV
    const header = PRODUCT_CSV_COLUMNS.join(",");

    const escapeCell = (val: unknown): string => {
      const str = val == null ? "" : String(val);
      // Wrap in quotes if contains comma, newline, or quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = products.map((p) => {
      const id = p.id as number;
      const cols: Record<string, unknown> = {
        name: p.name,
        slug: p.slug,
        sku: p.sku ?? "",
        description: p.description ?? "",
        short_description: p.short_description ?? "",
        price: p.price,
        regular_price: p.regular_price ?? "",
        sale_price: p.sale_price ?? "",
        stock_status: p.stock_status,
        stock_quantity: p.stock_quantity,
        status: p.status,
        type: p.type,
        categories: (categoryMap[id] ?? []).join("|"),
        images: (imageMap[id] ?? []).join("|"),
        attributes: attributeMap[id]?.length
          ? JSON.stringify(attributeMap[id])
          : "",
      };

      return PRODUCT_CSV_COLUMNS.map((col) => escapeCell(cols[col])).join(",");
    });

    const csv = [header, ...rows].join("\r\n");
    const filename = `${store.label}_products_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    console.error("Export error:", err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
