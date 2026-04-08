import { useParams, Link } from "react-router-dom";
import { useAdminCampaign, useAdminSubmissionList } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDataTable } from "@/components/admin";
import { ArrowLeft, Edit, Users, CheckCircle2, XCircle, Clock, DollarSign, Video } from "lucide-react";

const campaignStatusColor = (s: string) =>
  s === "running" ? "default" : s === "finished" ? "secondary" : s === "deactivate" ? "destructive" : "outline";

const submissionStatusColor = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const cid = id ? parseInt(id, 10) : null;
  const { data: c, isLoading, error } = useAdminCampaign(cid);
  const { data: subsData } = useAdminSubmissionList(
    cid ? { campaign: String(cid), page_size: 10, page: 1, include_summary: 1 } : undefined
  );

  if (!cid || isNaN(cid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !c) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !c) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/campaigns">Back</Link></div>
  );

  const submissions = subsData?.results ?? [];
  const totalSubs = subsData?.count ?? 0;
  const subsApproved = submissions.filter(s => s.status === "approved").length;
  const subsPending = submissions.filter(s => s.status === "pending").length;
  const subsRejected = submissions.filter(s => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/campaigns"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Campaigns</Button></Link>
          <div className="flex items-center gap-3">
            {c.image_url && <img src={c.image_url} alt="" className="h-16 w-16 rounded-lg border object-cover" />}
            <div>
              <h1 className="text-3xl font-bold">{c.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={campaignStatusColor(c.status)} className="capitalize">{c.status_display || c.status}</Badge>
                {c.product_name && <Badge variant="outline">{c.product_name}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <Link to={`/system/campaigns/${c.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Submissions</p>
                <p className="text-2xl font-bold mt-1">{totalSubs}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{subsApproved}</p>
                {totalSubs > 0 && <p className="text-xs text-muted-foreground">{((subsApproved / Math.max(submissions.length, 1)) * 100).toFixed(0)}% of shown</p>}
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{subsPending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200 dark:text-amber-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission</p>
                <p className="text-xl font-bold mt-1">{c.commission_type === "percentage" ? `${c.commission}%` : `रु ${Number(c.commission).toLocaleString()}`}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.commission_type || "—"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Campaign Details */}
        <Card>
          <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${c.id}`],
              ["Name", c.name],
              ["Status", null],
              ["Commission Type", c.commission_type || "—"],
              ["Commission", c.commission_type === "percentage" ? `${c.commission}%` : `रु ${Number(c.commission).toLocaleString()}`],
              ["Linked Product", c.product ? (c.product_name ?? "Product") : "—"],
              ["Created", new Date(c.created_at).toLocaleString()],
              ["Updated", new Date(c.updated_at).toLocaleString()],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Status" ? (
                  <Badge variant={campaignStatusColor(c.status)} className="text-xs capitalize">{c.status_display || c.status}</Badge>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
            {c.product && (
              <Link to={`/system/products/${c.product}`} className="text-xs text-primary underline">View product</Link>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {c.description && (
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{c.description}</p>
              </CardContent>
            </Card>
          )}
          {c.video_link && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-4 w-4" />Video Link</CardTitle></CardHeader>
              <CardContent>
                <a href={c.video_link} target="_blank" rel="noreferrer" className="text-primary underline text-sm break-all">{c.video_link}</a>
              </CardContent>
            </Card>
          )}
          {c.image_url && (
            <Card>
              <CardHeader><CardTitle>Campaign Image</CardTitle></CardHeader>
              <CardContent>
                <img src={c.image_url} alt="" className="max-h-48 rounded-lg border object-contain w-full" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />Recent Submissions ({totalSubs} total)</CardTitle>
            <Link to={`/system/submissions?campaign=${c.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "ID",
                  render: (s) => (
                    <Link to={`/system/submissions/${s.id}`} className="text-primary underline">#{s.id}</Link>
                  ),
                },
                {
                  id: "user",
                  label: "User",
                  render: (s) => (
                    <Link to={`/system/users/${s.user}`} className="text-primary underline text-xs">{s.user_name || `User #${s.user}`}</Link>
                  ),
                },
                {
                  id: "status",
                  label: "Status",
                  render: (s) => (
                    <Badge variant={submissionStatusColor(s.status)} className="text-xs">
                      {s.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                      {s.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                      {s.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                      {s.status_display || s.status}
                    </Badge>
                  ),
                },
                { id: "proofs", label: "Proofs", render: (s) => s.proofs?.length ?? 0 },
                {
                  id: "date",
                  label: "Date",
                  render: (s) => <span className="text-xs">{new Date(s.created_at).toLocaleDateString()}</span>,
                },
                {
                  id: "actions",
                  label: "Actions",
                  render: (s) => (
                    <Link to={`/system/submissions/${s.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link>
                  ),
                },
              ]}
              data={submissions}
              keyFn={(s) => s.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
