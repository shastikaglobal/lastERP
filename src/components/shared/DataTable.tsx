import { ReactNode, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys,
  pageSize = 10,
  onRowClick,
  emptyMessage = "No records found",
  toolbar,
  showSearch = true,
  showFilters = false,
}: {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
  showSearch?: boolean;
  showFilters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query || !searchKeys) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="erp-card overflow-hidden">
      {(showSearch || showFilters || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
          {showSearch && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="pl-9 h-9"
              />
            </div>
          )}
          {showFilters && (
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Filters
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((c) => (
                <th key={c.key} className={cn("text-left font-medium text-xs uppercase tracking-wider text-muted-foreground px-4 py-2.5", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</td></tr>
            ) : paged.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border last:border-0 hover:bg-muted/40 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
        <span>
          Showing {paged.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{(currentPage - 1) * pageSize + paged.length} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
