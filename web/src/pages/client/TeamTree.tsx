import { Link } from "react-router-dom";
import { ArrowLeft, User, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTeamTree } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserMinimal } from "@/api/types";

interface TreeNode {
  user: UserMinimal;
  children: TreeNode[];
}

const TreeNodeComponent = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children?.length > 0;
  const u = node.user;
  const name = u?.name || u?.phone || "—";
  const pkg = u?.package_name || "—";

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
          level === 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/50"
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{ marginLeft: level * 16 }}
      >
        {hasChildren && (
          <span className="w-6 h-6 rounded-lg bg-muted/20 flex items-center justify-center flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        )}
        {!hasChildren && <div className="w-6 flex-shrink-0" />}

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            level === 0 ? "bg-white/20" : "bg-primary/10"
          }`}
        >
          <User className={`w-5 h-5 ${level === 0 ? "text-white" : "text-primary"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${level === 0 ? "text-white" : ""}`}>{name}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-[10px] ${level === 0 ? "bg-white/20 text-white" : ""}`}>
              {pkg}
            </Badge>
            {u?.status && u.status !== "active" && (
              <Badge variant="outline" className="text-[10px]">Inactive</Badge>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 space-y-2 border-l-2 border-border ml-6 pl-2">
          {node.children.map((child) => (
            <TreeNodeComponent key={child.user?.id ?? Math.random()} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const TeamTree = () => {
  const { data, isLoading, error } = useTeamTree();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">Failed to load team tree.</p>
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <Link to="/network" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Team Tree</h1>
        </header>
        <div className="client-page-container client-page-content pb-8">
          <Skeleton className="h-16 w-full rounded-xl mb-2" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const root: TreeNode = { user: data.user, children: (data.children ?? []) as TreeNode[] };

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/network" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Team Tree</h1>
      </header>

      <div className="client-page-container client-page-content pb-8">
        {!root.user && !root.children?.length ? (
          <div className="floating-card p-8 text-center text-muted-foreground">
            No team members yet. Refer friends to grow your tree.
          </div>
        ) : (
          <TreeNodeComponent node={root} />
        )}
      </div>
    </div>
  );
};

export default TeamTree;
