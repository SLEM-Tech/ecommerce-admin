"use client";

import { useState } from "react";

interface Props {
  prefix: string;
  storeLabel: string;
}

export default function ExportPanel({ prefix, storeLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/export?prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `${prefix}products.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Export Products</h2>
      <p className="text-sm text-gray-500 mb-6">
        Downloads all products for <strong>{storeLabel}</strong> (prefix:{" "}
        <code className="bg-gray-100 px-1 rounded">{prefix}</code>) as a CSV file.
        The CSV includes categories, images, and attributes.
      </p>

      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-md p-4 text-sm">
        <p className="font-medium text-gray-700 mb-2">CSV columns:</p>
        <div className="grid grid-cols-3 gap-1 text-gray-600">
          {[
            "name", "slug", "sku", "description", "short_description",
            "price", "regular_price", "sale_price", "stock_status",
            "stock_quantity", "status", "type", "categories", "images", "attributes",
          ].map((col) => (
            <span key={col} className="font-mono text-xs bg-white border border-gray-200 px-2 py-1 rounded">
              {col}
            </span>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p><strong>categories</strong> — pipe-separated names, e.g. <code>Electronics|Phones</code></p>
          <p><strong>images</strong> — pipe-separated URLs, first is the featured image</p>
          <p><strong>attributes</strong> — JSON, e.g. <code>{`[{"name":"Color","options":["Red","Blue"]}]`}</code></p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-md text-sm transition-colors"
      >
        {loading ? "Exporting..." : "Download CSV"}
      </button>
    </div>
  );
}
