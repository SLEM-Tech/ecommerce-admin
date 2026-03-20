"use client";

import { useEffect, useState } from "react";
import ExportPanel from "@/components/ExportPanel";
import ImportPanel from "@/components/ImportPanel";

interface Store {
  label: string;
  prefix: string;
  source: "env" | "custom";
}

type Tab = "export" | "import";

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [tab, setTab] = useState<Tab>("export");
  const [search, setSearch] = useState("");

  // Add-store form
  const [newLabel, setNewLabel] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadStores = () =>
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data: Store[]) => {
        setStores(data);
        if (data.length && !selectedPrefix) setSelectedPrefix(data[0].prefix);
      });

  useEffect(() => { loadStores(); }, []);

  const effectivePrefix = customPrefix.trim() || selectedPrefix;
  const selectedStore = stores.find((s) => s.prefix === selectedPrefix);

  const filteredStores = stores.filter(
    (s) =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.prefix.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, prefix: newPrefix }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add store"); return; }
      setNewLabel("");
      setNewPrefix("");
      setShowAddForm(false);
      await loadStores();
      setSelectedPrefix(newPrefix.trim());
      setCustomPrefix("");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteStore(prefix: string) {
    const res = await fetch(`/api/stores?prefix=${encodeURIComponent(prefix)}`, { method: "DELETE" });
    setConfirmDelete(null);
    if (!res.ok) return;
    const next = stores.find((s) => s.prefix !== prefix);
    if (selectedPrefix === prefix) setSelectedPrefix(next?.prefix ?? "");
    await loadStores();
  }

  const customCount = stores.filter((s) => s.source === "custom").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Ecommerce Admin</h1>
        <p className="text-xs text-gray-500 mt-0.5">Multi-store product CSV import &amp; export</p>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">

          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${stores.length} stores…`}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Store list */}
          <div className="flex-1 overflow-y-auto">
            {filteredStores.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8">No stores match &ldquo;{search}&rdquo;</p>
            ) : (
              <ul>
                {filteredStores.map((s) => (
                  <li key={s.prefix}>
                    <div
                      className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                        s.prefix === selectedPrefix
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent hover:bg-gray-50"
                      }`}
                      onClick={() => { setSelectedPrefix(s.prefix); setCustomPrefix(""); }}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${s.prefix === selectedPrefix ? "text-blue-700" : "text-gray-800"}`}>
                          {s.label}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate">{s.prefix}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {s.source === "custom" && (
                          <>
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">custom</span>
                            {confirmDelete === s.prefix ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteStore(s.prefix); }}
                                  className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600"
                                >Yes</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                  className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-300"
                                >No</button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(s.prefix); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5 rounded"
                                title="Remove store"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: counts + add button */}
          <div className="border-t border-gray-100 p-3 space-y-2">
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>{stores.filter((s) => s.source === "env").length} from config</span>
              <span>{customCount} custom</span>
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Store
            </button>

            {showAddForm && (
              <form onSubmit={handleAddStore} className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Store name"
                  required
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  placeholder="table_prefix_"
                  required
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {addError && <p className="text-xs text-red-500">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {adding ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddError(""); setNewLabel(""); setNewPrefix(""); }}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedPrefix ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a store from the sidebar
            </div>
          ) : (
            <>
              {/* Store header */}
              <div className="mb-5">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedStore?.label}</h2>
                  <code className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{selectedStore?.prefix}</code>
                </div>

                {/* Custom prefix override */}
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Override prefix:</label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder={selectedPrefix}
                    className="border border-gray-200 rounded px-2.5 py-1 text-xs font-mono w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {customPrefix.trim() && (
                    <>
                      <span className="text-xs text-blue-600 font-medium">→ {customPrefix.trim()}</span>
                      <button onClick={() => setCustomPrefix("")} className="text-xs text-gray-400 hover:text-gray-600">clear</button>
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 border-b border-gray-200">
                {(["export", "import"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-2 text-sm font-medium capitalize rounded-t-md transition-colors ${
                      tab === t
                        ? "bg-white border border-b-white border-gray-200 text-blue-600 -mb-px"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Panel */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {tab === "export" ? (
                  <ExportPanel prefix={effectivePrefix} storeLabel={selectedStore?.label ?? ""} />
                ) : (
                  <ImportPanel prefix={effectivePrefix} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
