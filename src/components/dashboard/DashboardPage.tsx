import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, FileText, Globe, MoreVertical, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { categories } from "../../lib/civicOptions";
import { useAuth } from "../../lib/auth";
import { listBriefs, updateBriefVisibility } from "../../lib/mockApi";
import type { CivicBrief } from "../../lib/types";

const columnHelper = createColumnHelper<CivicBrief>();

export function DashboardPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["briefs", auth.user?.id],
    queryFn: () => listBriefs(auth.user?.id),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({
      briefId,
      visibility,
    }: {
      briefId: string;
      visibility: "private" | "public";
    }) => updateBriefVisibility(briefId, visibility),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["briefs", auth.user?.id] });
      toast.success(`Brief is now ${variables.visibility}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update visibility",
      );
    },
  });

  const [globalFilter, setGlobalFilter] = useState("");

  const briefColumns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <Link
            to="/briefs/$briefId"
            params={{ briefId: info.row.original.id }}
            className="font-semibold text-civic-800 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("category", { header: "Category" }),
      columnHelper.accessor("jurisdiction", { header: "Jurisdiction" }),
      columnHelper.accessor("visibility", {
        header: "Visibility",
        cell: (info) => {
          const val = info.getValue() || "private";
          const style =
            val === "private"
              ? "bg-slate-100 text-slate-700"
              : "bg-civic-100 text-civic-800";
          return (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Created Date",
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const brief = info.row.original;
          return (
            <div className="flex justify-end pr-2">
              <details className="dropdown relative inline-block">
                <summary className="btn-ghost list-none cursor-pointer p-1 outline-none">
                  <MoreVertical size={18} />
                </summary>
                <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    disabled={brief.visibility === "private"}
                    onClick={async (e) => {
                      const target = e.currentTarget.closest("details");
                      if (target) target.removeAttribute("open");

                      const absoluteUrl = new URL(
                        `/share/${brief.id}`,
                        window.location.origin,
                      ).toString();
                      await navigator.clipboard?.writeText(absoluteUrl);
                      toast.success("Link copied to clipboard!");
                    }}
                  >
                    <Link2 size={14} />
                    Copy link
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  {brief.visibility === "private" ? (
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-civic-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={visibilityMutation.isPending}
                      onClick={() => {
                        visibilityMutation.mutate({
                          briefId: brief.id,
                          visibility: "public",
                        });
                        const target = document.activeElement?.closest("details");
                        if (target) target.removeAttribute("open");
                      }}
                    >
                      <Globe size={14} />
                      Make Public
                    </button>
                  ) : (
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      disabled={visibilityMutation.isPending}
                      onClick={() => {
                        visibilityMutation.mutate({
                          briefId: brief.id,
                          visibility: "private",
                        });
                        const target = document.activeElement?.closest("details");
                        if (target) target.removeAttribute("open");
                      }}
                    >
                      <EyeOff size={14} />
                      Make Private
                    </button>
                  )}
                </div>
              </details>
            </div>
          );
        },
      }),
    ],
    [visibilityMutation],
  );

  const table = useReactTable({
    data,
    columns: briefColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-civic-700">
            {auth.isAuthenticated ? "Workspace" : "Testing mode"}
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            Civic briefs
          </h1>
          {!auth.isAuthenticated ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Dashboard access is temporarily open for testing. Sign in later to
              save generated briefs to your workspace.
            </p>
          ) : null}
        </div>
        <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
          <FileText size={16} />
          Start new brief
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.slice(0, 6).map((category) => (
          <div key={category} className="surface rounded-lg p-5">
            <p className="font-semibold text-civic-900">{category}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Track documents, questions, and actions.
            </p>
          </div>
        ))}
      </div>

      <section className="surface mt-8 rounded-lg">
        <div className="flex flex-col gap-4 border-b border-civic-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="text-xl font-bold">Recent briefs</h2>
          <input
            type="text"
            placeholder="Search briefs..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-civic-500 focus:ring-1 focus:ring-civic-500"
          />
        </div>
        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer px-4 py-3 font-medium transition hover:bg-slate-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={briefColumns.length}
                    className="p-5 text-center text-slate-600"
                  >
                    Loading briefs...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={briefColumns.length}
                    className="p-5 text-center text-slate-600"
                  >
                    No briefs found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
