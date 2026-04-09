import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const IMAGE_KEYS = ["image_url", "logo_url", "thumbnail_url", "banner_url", "image", "logo", "thumbnail", "banner"] as const;

const SORT_NONE = "__sort_none__";

function detectImageCell(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  for (const key of IMAGE_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export interface AdminDataTableColumn<T> {
  id: string;
  label: string;
  /** If set, column header is clickable for sorting (sends this as order_by param). Use '-' prefix for default desc. */
  sortKey?: string;
  render?: (row: T) => React.ReactNode;
  /** If set, cell shows a toggle; on confirm calls onToggle(row, newValue) */
  toggle?: {
    getValue: (row: T) => boolean;
    label?: string;
    onConfirm: (row: T, newValue: boolean) => Promise<void> | void;
  };
  /** Mobile card layout overrides (list view below `md` only). */
  mobile?: {
    fullWidth?: boolean;
    hideOnMobile?: boolean;
  };
}

export interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[];
  data: T[];
  keyFn: (row: T) => string | number;
  orderBy?: string;
  onOrderByChange?: (orderBy: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Desktop table only: drag handle column + persist order via onReorder */
  rowDrag?: {
    enabled: boolean;
    onReorder: (orderedRows: T[]) => void | Promise<void>;
  };
}

function renderCellContent<T>(
  row: T,
  col: AdminDataTableColumn<T>,
  onToggleChange: (row: T, column: AdminDataTableColumn<T>, checked: boolean) => void
): React.ReactNode {
  if (col.toggle) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={col.toggle.getValue(row)}
          onCheckedChange={(checked) => onToggleChange(row, col, checked)}
        />
        {col.toggle.label && (
          <span className="text-sm text-muted-foreground">{col.toggle.label}</span>
        )}
      </div>
    );
  }
  if (col.render) return col.render(row);
  return (row as Record<string, unknown>)[col.id] as React.ReactNode;
}

function AdminMobileRowCard<T>({
  row,
  tableColumns,
  handleToggleClick,
}: {
  row: T;
  tableColumns: AdminDataTableColumn<T>[];
  handleToggleClick: (row: T, column: AdminDataTableColumn<T>, checked: boolean) => void;
}) {
  const visible = tableColumns.filter((c) => !c.mobile?.hideOnMobile);
  const actionsCol = visible.find((c) => c.id === "actions");
  const idCol = visible.find((c) => c.id === "id");
  const statusCol = visible.find((c) => c.id === "status");
  const amountCol = visible.find((c) => c.id === "amount");
  const imageCol = visible.find((c) => c.id === "image");
  const userCols = visible.filter((c) => c.id === "user" || c.id === "user_col");
  const detailCols = visible.filter(
    (c) =>
      c.id !== "actions" &&
      c.id !== "id" &&
      c.id !== "status" &&
      c.id !== "amount" &&
      c.id !== "user" &&
      c.id !== "user_col" &&
      c.id !== "image"
  );

  const showHeader = Boolean(imageCol || idCol || statusCol);
  const hasMetaGrid = detailCols.length > 0;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm space-y-2 text-sm">
      {showHeader ? (
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {imageCol ? (
              <div className="shrink-0 [&_img]:h-11 [&_img]:w-11 [&_img]:rounded-lg">
                {renderCellContent(row, imageCol, handleToggleClick)}
              </div>
            ) : null}
            {idCol ? (
              <div className="min-w-0 text-base font-semibold leading-tight">
                {renderCellContent(row, idCol, handleToggleClick)}
              </div>
            ) : null}
          </div>
          {statusCol ? (
            <div className="shrink-0 pt-0.5">{renderCellContent(row, statusCol, handleToggleClick)}</div>
          ) : null}
        </div>
      ) : null}

      {userCols.length > 0 ? (
        <div className="min-w-0 space-y-1">
          {userCols.map((col) => (
            <div key={col.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{col.label}</span>
              <div className="min-w-0 flex-1 text-sm">{renderCellContent(row, col, handleToggleClick)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {amountCol ? (
        <div className="text-lg font-semibold leading-snug tracking-tight">
          {renderCellContent(row, amountCol, handleToggleClick)}
        </div>
      ) : null}

      {hasMetaGrid ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-0.5">
          {detailCols.map((col) => {
            const full = Boolean(col.toggle || col.mobile?.fullWidth);
            return (
              <div
                key={col.id}
                className={cn("min-w-0 space-y-0.5", full && "col-span-2")}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{col.label}</p>
                <div className="min-w-0 break-words text-sm leading-snug">
                  {renderCellContent(row, col, handleToggleClick)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {actionsCol ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
          {renderCellContent(row, actionsCol, handleToggleClick)}
        </div>
      ) : null}
    </div>
  );
}

function SortableAdminTableRow<T>({
  row,
  rowId,
  tableColumns,
  handleToggleClick,
}: {
  row: T;
  rowId: string;
  tableColumns: AdminDataTableColumn<T>[];
  handleToggleClick: (row: T, column: AdminDataTableColumn<T>, checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowId });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : undefined,
    zIndex: isDragging ? 2 : undefined,
    position: "relative",
  };
  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10 p-1 align-middle">
        <button
          type="button"
          className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      {tableColumns.map((col) => (
        <TableCell key={col.id}>{renderCellContent(row, col, handleToggleClick)}</TableCell>
      ))}
    </TableRow>
  );
}

export function AdminDataTable<T>({
  columns,
  data,
  keyFn,
  orderBy,
  onOrderByChange,
  isLoading = false,
  emptyMessage = "No records found.",
  rowDrag,
}: AdminDataTableProps<T>) {
  const [toggleState, setToggleState] = useState<{
    row: T;
    newValue: boolean;
    columnKey: string;
  } | null>(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const hasImageColumn = columns.some((col) => col.id === "image");
  const hasAnyImage = data.some((row) => !!detectImageCell(row));
  const tableColumns = hasImageColumn || !hasAnyImage
    ? columns
    : [
        {
          id: "image",
          label: "Image",
          render: (row: T) => {
            const src = detectImageCell(row);
            if (!src) return "—";
            return (
              <img
                src={src}
                alt="preview"
                className="h-10 w-10 rounded-md border object-cover bg-muted"
                loading="lazy"
              />
            );
          },
        } as AdminDataTableColumn<T>,
        ...columns,
      ];

  const handleSort = (sortKey: string) => {
    if (!onOrderByChange) return;
    const current = orderBy ?? "";
    if (current === sortKey) onOrderByChange(`-${sortKey}`);
    else if (current === `-${sortKey}`) onOrderByChange("");
    else onOrderByChange(sortKey);
  };

  const handleToggleClick = (row: T, column: AdminDataTableColumn<T>, newValue: boolean) => {
    if (!column.toggle) return;
    setToggleState({ row, newValue, columnKey: column.id });
  };

  const handleToggleConfirm = async () => {
    if (!toggleState) return;
    const col = tableColumns.find((c) => c.id === toggleState.columnKey);
    if (!col?.toggle) return;
    setToggleSubmitting(true);
    try {
      await col.toggle.onConfirm(toggleState.row, toggleState.newValue);
      setToggleState(null);
    } finally {
      setToggleSubmitting(false);
    }
  };

  const sortableCols = onOrderByChange
    ? tableColumns.filter((c): c is AdminDataTableColumn<T> & { sortKey: string } => Boolean(c.sortKey))
    : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showRowDrag = Boolean(rowDrag?.enabled && data.length > 0);
  const colSpan = tableColumns.length + (rowDrag?.enabled ? 1 : 0);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!rowDrag?.enabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.findIndex((r) => String(keyFn(r)) === String(active.id));
    const newIndex = data.findIndex((r) => String(keyFn(r)) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void Promise.resolve(rowDrag.onReorder(arrayMove(data, oldIndex, newIndex)));
  };

  const desktopTable = (
    <Table>
      <TableHeader>
        <TableRow>
          {rowDrag?.enabled && <TableHead className="w-10 p-2" aria-label="Reorder" />}
          {tableColumns.map((col) => (
            <TableHead key={col.id}>
              {col.sortKey && onOrderByChange ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort(col.sortKey!)}
                >
                  {col.label}
                  {orderBy === col.sortKey ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                  ) : orderBy === `-${col.sortKey}` ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              ) : (
                col.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : showRowDrag ? (
          <SortableContext items={data.map((r) => String(keyFn(r)))} strategy={verticalListSortingStrategy}>
            {data.map((row) => (
              <SortableAdminTableRow
                key={keyFn(row)}
                row={row}
                rowId={String(keyFn(row))}
                tableColumns={tableColumns}
                handleToggleClick={handleToggleClick}
              />
            ))}
          </SortableContext>
        ) : (
          data.map((row) => (
            <TableRow key={keyFn(row)}>
              {tableColumns.map((col) => (
                <TableCell key={col.id}>{renderCellContent(row, col, handleToggleClick)}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return null; // parent should show skeleton instead
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        {showRowDrag ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {desktopTable}
          </DndContext>
        ) : (
          desktopTable
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {sortableCols.length > 0 && onOrderByChange && (
          <div className="space-y-1 pb-0.5">
            <Label htmlFor="admin-table-sort" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sort by
            </Label>
            <Select
              value={orderBy && orderBy.length > 0 ? orderBy : SORT_NONE}
              onValueChange={(v) => onOrderByChange(v === SORT_NONE ? "" : v)}
            >
              <SelectTrigger id="admin-table-sort" className="h-9 rounded-lg text-sm">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SORT_NONE}>Default</SelectItem>
                {sortableCols.map((col) => (
                  <Fragment key={col.sortKey}>
                    <SelectItem value={col.sortKey}>{col.label} (asc)</SelectItem>
                    <SelectItem value={`-${col.sortKey}`}>{col.label} (desc)</SelectItem>
                  </Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>
        ) : (
          data.map((row) => (
            <AdminMobileRowCard
              key={keyFn(row)}
              row={row}
              tableColumns={tableColumns}
              handleToggleClick={handleToggleClick}
            />
          ))
        )}
      </div>

      <AlertDialog open={!!toggleState} onOpenChange={(open) => !open && setToggleState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change this? The change will be saved immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleConfirm} disabled={toggleSubmitting}>
              {toggleSubmitting ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
