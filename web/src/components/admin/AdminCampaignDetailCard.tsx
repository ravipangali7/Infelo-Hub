import { useState } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, ExternalLink } from "lucide-react";

export function AdminCampaignDetailCard({ campaign }: { campaign: Campaign }) {
  const [descOpen, setDescOpen] = useState(false);
  const desc = (campaign.description ?? "").trim();
  const descLong = desc.length > 220;
  const descShown = descOpen || !descLong ? desc : `${desc.slice(0, 220)}…`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Campaign
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/system/campaigns/${campaign.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Open
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {campaign.image_url ? (
            <div className="shrink-0 w-full sm:w-40 aspect-video sm:aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={campaign.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/system/campaigns/${campaign.id}`}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {campaign.name}
              </Link>
              <Badge variant="secondary" className="text-xs">
                {campaign.status_display || campaign.status}
              </Badge>
            </div>
            {desc ? (
              <div className="text-sm text-muted-foreground">
                <p className="whitespace-pre-wrap">{descShown}</p>
                {descLong ? (
                  <button
                    type="button"
                    className="text-xs text-primary mt-1 underline"
                    onClick={() => setDescOpen(!descOpen)}
                  >
                    {descOpen ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between gap-2 border-b border-border/60 pb-1">
            <dt className="text-muted-foreground">Commission</dt>
            <dd className="font-medium text-right">
              {campaign.commission_type ? `${campaign.commission_type}: ` : ""}
              {campaign.commission}
            </dd>
          </div>
          {campaign.product ? (
            <div className="flex justify-between gap-2 border-b border-border/60 pb-1 sm:col-span-2">
              <dt className="text-muted-foreground">Product</dt>
              <dd>
                <Link
                  to={`/system/products/${campaign.product}`}
                  className="text-primary underline font-medium"
                >
                  {campaign.product_name ?? `Product #${campaign.product}`}
                </Link>
              </dd>
            </div>
          ) : null}
          {campaign.video_link ? (
            <div className="flex justify-between gap-2 border-b border-border/60 pb-1 sm:col-span-2">
              <dt className="text-muted-foreground">Video</dt>
              <dd className="truncate max-w-[min(100%,280px)]">
                <a
                  href={campaign.video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs"
                >
                  {campaign.video_link}
                </a>
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2 border-b border-border/60 pb-1 sm:col-span-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{new Date(campaign.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
