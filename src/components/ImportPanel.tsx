"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { PRODUCT_CSV_COLUMNS, type ProductCsvRow } from "@/lib/csv";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface Props {
  prefix: string;
}

export default function ImportPanel({ prefix }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProductCsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(null);
    setImportError("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        // Validate required columns
        const missingCols = PRODUCT_CSV_COLUMNS.filter(
          (col) => !(col in (data[0] ?? {}))
        );
        // Only 'name' is truly required; others can be empty
        if (data.length === 0) {
          setParseError("CSV file is empty.");
          setRows([]);
          return;
        }
        if (!("name" in (data[0] ?? {}))) {
          setParseError(`CSV is missing required column: name`);
          setRows([]);
          return;
        }
        setRows(data as ProductCsvRow[]);
      },
      error: (err) => {
        setParseError(err.message);
        setRows([]);
      },
    });
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    setImportError("");

    try {
      const res = await fetch(`/api/import?prefix=${encodeURIComponent(prefix)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Import failed");
      setResult(data as ImportResult);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName("");
    setParseError("");
    setResult(null);
    setImportError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Import Products</h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV file to create or update products. Existing products are matched by{" "}
        <strong>SKU</strong> (if provided) then by <strong>slug</strong>.
      </p>

      {/* File picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />
      </div>

      {parseError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {parseError}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 font-medium">
              Preview — {rows.length} rows from <em>{fileName}</em>
            </p>
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="text-xs min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["name", "sku", "price", "stock_status", "status", "categories"].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {["name", "sku", "price", "stock_status", "status", "categories"].map((col) => (
                      <td key={col} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                        {(row as Record<string, string>)[col] || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 px-3 py-2">
                ...and {rows.length - 10} more rows
              </p>
            )}
          </div>
        </div>
      )}

      {importError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {importError}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mb-6 border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-green-50 border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">Import complete</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-200">
            {[
              { label: "Total", value: result.total },
              { label: "Inserted", value: result.inserted, color: "text-green-600" },
              { label: "Updated", value: result.updated, color: "text-blue-600" },
              { label: "Skipped", value: result.skipped, color: "text-orange-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-red-50">
              <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!result ? (
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-md text-sm transition-colors"
          >
            {importing ? `Importing ${rows.length} rows...` : `Import ${rows.length} Products`}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-md text-sm transition-colors"
          >
            Import Another File
          </button>
        )}
      </div>
    </div>
  );
}
