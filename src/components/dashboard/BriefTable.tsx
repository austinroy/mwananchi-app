import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Globe, Link2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import type { CivicBrief } from "../../lib/types";
import { updateBriefVisibility } from "../../lib/mockApi";
import { useAuth } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";

const columnHelper = createColumnHelper<CivicBrief>();

export function BriefTable({
  data,
  isLoading,
  globalFilter,
  onGlobalFilterChange,
}: {
  data: CivicBrief[];
  isLoading: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const auth = useAuth();
  const queryClient = useQueryClient();
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
        error instanceof Error ? error.message : t("dashboard.visibilityError"),
      );
    },
  });

  const briefColumns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: t("dashboard.titleColumn"),
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
      columnHelper.accessor("category", {
        header: t("dashboard.categoryColumn"),
      }),
      columnHelper.accessor("jurisdiction", {
        header: t("dashboard.jurisdictionColumn"),
      }),
      columnHelper.accessor("visibility", {
        header: t("dashboard.visibilityColumn"),
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
        header: t("dashboard.createdColumn"),
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
                <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-white/45 bg-white/70 p-1 shadow-lg backdrop-blur-xl">
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
                      toast.success(t("dashboard.linkCopied"));
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
                        const target =
                          document.activeElement?.closest("details");
                        if (target) target.removeAttribute("open");
                      }}
                    >
                      <Globe size={14} />
                      {t("briefActions.makePublic")}
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
                        const target =
                          document.activeElement?.closest("details");
                        if (target) target.removeAttribute("open");
                      }}
                    >
                      <EyeOff size={14} />
                      {t("briefActions.makePrivate")}
                    </button>
                  )}
                </div>
              </details>
            </div>
          );
        },
      }),
    ],
    [t, visibilityMutation],
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
    onGlobalFilterChange,
  });

  return (
    <section className="surface mt-8 rounded-lg">
      <div className="flex flex-col gap-4 border-b border-civic-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <h2 className="text-xl font-bold">{t("dashboard.recent")}</h2>
        <input
          type="text"
          placeholder={t("dashboard.search")}
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
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
                  {t("dashboard.loading")}
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={briefColumns.length}
                  className="p-5 text-center text-slate-600"
                >
                  {t("dashboard.empty")}
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
  );
}
