"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WarrantyCard from "@/components/WarrantyCard";
import WarrantyDetail from "@/components/WarrantyDetail";
import WarrantyForm from "@/components/WarrantyForm";
import { deleteWarranty, loadWarranties, saveWarranty } from "@/lib/warranty-storage";
import { getEndDate, getStatus, type Warranty } from "@/lib/warranty-types";

type View =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string };

// Soonest-ending first; expired ones at the bottom.
function sortWarranties(list: Warranty[]) {
  const time = (w: Warranty) => getEndDate(w)?.getTime() ?? Infinity;
  return [...list].sort((a, b) => {
    const aExpired = getStatus(a) === "expired";
    const bExpired = getStatus(b) === "expired";
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return aExpired ? time(b) - time(a) : time(a) - time(b);
  });
}

export default function WarrantyVaultApp() {
  const [warranties, setWarranties] = useState<Warranty[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });

  useEffect(() => {
    loadWarranties()
      .then((list) => setWarranties(list))
      .catch(() => {
        setLoadError(true);
        setWarranties([]);
      });
  }, []);

  async function handleSave(warranty: Warranty) {
    await saveWarranty(warranty);
    setWarranties((list) => [...(list ?? []).filter((w) => w.id !== warranty.id), warranty]);
    setView({ kind: "view", id: warranty.id });
  }

  async function handleDelete(warranty: Warranty) {
    if (!window.confirm(`Delete the "${warranty.item}" warranty? This can't be undone.`)) return;
    await deleteWarranty(warranty.id);
    setWarranties((list) => (list ?? []).filter((w) => w.id !== warranty.id));
    setView({ kind: "list" });
  }

  const list = sortWarranties(warranties ?? []);
  const selected = "id" in view ? list.find((w) => w.id === view.id) : undefined;
  const counts = { active: 0, "ending-soon": 0, expired: 0 };
  list.forEach((w) => counts[getStatus(w)]++);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-beige">Warranty Vault</h1>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel"
        >
          ← Back to home
        </Link>
      </div>

      {view.kind === "add" && (
        <WarrantyForm onSave={handleSave} onCancel={() => setView({ kind: "list" })} />
      )}

      {view.kind === "edit" && selected && (
        <WarrantyForm
          initial={selected}
          onSave={handleSave}
          onCancel={() => setView({ kind: "view", id: selected.id })}
        />
      )}

      {view.kind === "view" && selected && (
        <WarrantyDetail
          warranty={selected}
          onBack={() => setView({ kind: "list" })}
          onEdit={() => setView({ kind: "edit", id: selected.id })}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {view.kind === "list" && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-sand">
              {list.length > 0
                ? `${counts.active} active · ${counts["ending-soon"]} ending soon · ${counts.expired} expired`
                : "Keep every warranty for your home in one place."}
            </p>
            <button
              type="button"
              onClick={() => setView({ kind: "add" })}
              className="rounded-full border border-caramel bg-caramel/10 px-4 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20"
            >
              + Add warranty
            </button>
          </div>

          {loadError && (
            <p className="mb-4 text-sm text-red-400">
              Could not open saved warranties. Your browser may be blocking storage (e.g. private browsing).
            </p>
          )}

          {warranties === null ? (
            <p className="text-sm text-sand">Loading…</p>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-walnut p-10 text-center text-sand">
              No warranties yet. Add your first one.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((w) => (
                <WarrantyCard key={w.id} warranty={w} onOpen={() => setView({ kind: "view", id: w.id })} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
