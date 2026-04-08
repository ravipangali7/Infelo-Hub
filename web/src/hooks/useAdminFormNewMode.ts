import { useParams, useLocation } from "react-router-dom";

/**
 * True when creating a resource. Edit routes use `.../:id/edit` and expose `id` in params;
 * dedicated create routes use `.../new` with no `:id` param, so `useParams().id` is undefined.
 * We also treat `id === "new"` for routes that encode "new" as a param.
 */
export function useAdminFormNewMode(): boolean {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  if (id === "new") return true;
  return /\/new\/?$/.test(pathname);
}
