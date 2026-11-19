import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  widthClass?: string;
}

export interface BulkAction<T> {
  label: string;
  variant?: 'default' | 'danger';
  onClick: (selectedRows: T[]) => void;
}

interface DataTableProps<T> {
  rows: T[];
  getRowId: (row: T) => string | number;
  columns: DataTableColumn<T>[];
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  filterSlot?: ReactNode;
  bulkActions?: BulkAction<T>[];
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  initialPageSize?: number;
}

export function DataTable<T>({
  rows,
  getRowId,
  columns,
  searchPlaceholder = 'Search records...',
  searchQuery,
  onSearchChange,
  filterSlot,
  bulkActions,
  emptyTitle = 'No matching records found',
  emptySubtitle = 'Adjust your filters or create a new entry to populate this view.',
  emptyAction,
  onRowClick,
  initialPageSize = 10,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const getter = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [rows, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const selectable = Boolean(bulkActions && bulkActions.length > 0);
  const allOnPageSelected =
    selectable &&
    pagedRows.length > 0 &&
    pagedRows.every((r) => selectedIds.has(getRowId(r)));

  const toggleAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      for (const r of pagedRows) next.delete(getRowId(r));
    } else {
      for (const r of pagedRows) next.add(getRowId(r));
    }
    setSelectedIds(next);
  };

  const toggleRow = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(getRowId(r))),
    [rows, selectedIds, getRowId]
  );

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  return (
    <div className="rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] overflow-hidden">
      {(onSearchChange || filterSlot || selectedRows.length > 0) && (
        <div className="px-4 py-3 border-b border-[#E4E6EB] dark:border-[#252A36] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
            {onSearchChange && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] text-[#111315] dark:text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            )}
            {filterSlot}
          </div>

          {selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 bg-[#EFF6FF] dark:bg-[#1E293B] px-3 py-1.5 rounded-lg border border-[#BFDBFE] dark:border-[#334155]">
              <span className="text-xs font-semibold text-[#1D4ED8] dark:text-[#93C5FD] font-mono tabular-nums whitespace-nowrap">
                {selectedRows.length} selected
              </span>
              {bulkActions.map((act) => (
                <button
                  key={act.label}
                  type="button"
                  onClick={() => {
                    act.onClick(selectedRows);
                    setSelectedIds(new Set());
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    act.variant === 'danger'
                      ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                      : 'bg-white dark:bg-[#0F172A] text-[#111315] dark:text-white border border-[#D1D5DB] dark:border-[#475569] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pagedRows.length === 0 ? (
        <div className="py-14 px-6 text-center space-y-3">
          <div className="text-sm font-semibold text-[#111315] dark:text-white">{emptyTitle}</div>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF] max-w-md mx-auto">{emptySubtitle}</p>
          {emptyAction && <div className="pt-1">{emptyAction}</div>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#10131A] text-[11px] font-semibold uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF]">
                {selectable && (
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all rows"
                      className="rounded border-[#D1D5DB] dark:border-[#374151]"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 whitespace-nowrap ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.widthClass || ''}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="inline-flex items-center gap-1 hover:text-[#111315] dark:hover:text-white transition-colors"
                      >
                        <span>{col.header}</span>
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-45" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6EB] dark:divide-[#252A36] text-xs">
              {pagedRows.map((row) => {
                const id = getRowId(row);
                const isSelected = selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-[#EFF6FF]/60 dark:bg-[#1E293B]/60'
                        : 'hover:bg-[#F9FAFB] dark:hover:bg-[#191E29]'
                    }`}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                          className="rounded border-[#D1D5DB] dark:border-[#374151]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 align-middle ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sortedRows.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#10131A] flex flex-wrap items-center justify-between gap-3 text-xs text-[#525866] dark:text-[#9CA3AF]">
          <div className="font-mono tabular-nums">
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, sortedRows.length)} of {sortedRows.length}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="h-7 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-xs text-[#111315] dark:text-white"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-[#E4E6EB] dark:border-[#2C3344] disabled:opacity-40 hover:bg-white dark:hover:bg-[#1F2430]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-[#E4E6EB] dark:border-[#2C3344] disabled:opacity-40 hover:bg-white dark:hover:bg-[#1F2430]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
