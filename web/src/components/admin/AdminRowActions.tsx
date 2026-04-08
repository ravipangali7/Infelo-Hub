import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface AdminRowActionsProps {
  viewHref?: string;
  editHref?: string;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onPassword?: () => void;
  deleteConfirmLabel?: string;
}

export function AdminRowActions({
  viewHref,
  editHref,
  onEdit,
  onDelete,
  onPassword,
  deleteConfirmLabel = "Are you sure you want to delete this item?",
}: AdminRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteOpen(true);
  };

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    try {
      await onDelete?.();
      setDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const hasActions = viewHref || editHref || onEdit || onDelete || onPassword;
  if (!hasActions) return null;

  const iconButtonClass = "h-8 w-8 md:h-9 md:w-9";

  return (
    <>
      <div className="flex items-center gap-0.5 md:gap-1">
        {viewHref && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButtonClass} asChild>
                <Link to={viewHref} aria-label="View">
                  <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>
        )}
        {editHref && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButtonClass} asChild>
                <Link to={editHref} aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        )}
        {onEdit && !editHref && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButtonClass} onClick={onEdit} aria-label="Edit">
                <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        )}
        {onPassword && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButtonClass} onClick={onPassword} aria-label="Change password">
                <Key className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change password</TooltipContent>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${iconButtonClass} text-destructive hover:text-destructive hover:bg-destructive/10`}
                onClick={handleDeleteClick}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirmLabel}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
