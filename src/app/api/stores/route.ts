import { NextRequest, NextResponse } from "next/server";
import { getStores } from "@/lib/stores";
import { readState, writeState, StoreEntry } from "@/lib/s3-state";

/** GET /api/stores — returns env stores + custom stores saved in S3 */
export async function GET() {
  const envStores: StoreEntry[] = getStores().map((s) => ({
    ...s,
    source: "env" as const,
  }));
  const state = await readState();
  // Merge: env stores first, then custom stores (skip duplicates by prefix)
  const envPrefixes = new Set(envStores.map((s) => s.prefix));
  const customStores = state.stores.filter((s) => !envPrefixes.has(s.prefix));
  return NextResponse.json([...envStores, ...customStores]);
}

/** POST /api/stores — add a new custom store to S3 state */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const label: string = (body.label ?? "").trim();
  const prefix: string = (body.prefix ?? "").trim();

  if (!label || !prefix) {
    return NextResponse.json({ error: "label and prefix are required" }, { status: 400 });
  }

  const state = await readState();
  const exists = state.stores.some((s) => s.prefix === prefix);
  if (exists) {
    return NextResponse.json({ error: "A store with that prefix already exists" }, { status: 409 });
  }

  state.stores.push({ label, prefix, source: "custom" });
  await writeState(state);
  return NextResponse.json({ label, prefix, source: "custom" }, { status: 201 });
}

/** DELETE /api/stores?prefix=xxx — remove a custom store from S3 state */
export async function DELETE(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix") ?? "";
  if (!prefix) {
    return NextResponse.json({ error: "prefix query param required" }, { status: 400 });
  }

  const state = await readState();
  const before = state.stores.length;
  state.stores = state.stores.filter((s) => s.prefix !== prefix);

  if (state.stores.length === before) {
    return NextResponse.json({ error: "Store not found in custom list" }, { status: 404 });
  }

  await writeState(state);
  return NextResponse.json({ ok: true });
}
