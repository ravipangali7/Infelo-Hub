import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface AdminPaginationProps {
  count: number;
  pageSize: number;
  /** 1-based current page */
  page: number;
  /** base path for building links (optional; if not set, uses searchParams only) */
  basePath?: string;
}

export function AdminPagination({ count, pageSize, page, basePath }: AdminPaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  return (
    <div className="flex flex-col gap-3 px-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
        Page {page} of {totalPages}
        <span className="text-muted-foreground/80"> · {count} total</span>
      </p>
      <Pagination className="mx-auto w-full justify-center sm:mx-0 sm:w-auto">
        <PaginationContent className="flex-wrap justify-center gap-0.5">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) setPage(page - 1);
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 py-2 text-xs tabular-nums sm:px-4 sm:text-sm">
              {page} / {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) setPage(page + 1);
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
