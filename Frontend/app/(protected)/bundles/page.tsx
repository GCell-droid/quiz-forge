"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { QuestionBundle } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageResult, PaginationControls } from "@/components/shared/pagination-controls";
import {
  FolderPlus,
  FileText,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

export default function BundlesPage() {
  const [bundles, setBundles] = useState<QuestionBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [publicOnly, setPublicOnly] = useState(false);

  const fetchBundles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<PageResult<QuestionBundle>>("/bundles", {
        params: { page, pageSize: 12, public: publicOnly },
      });
      setBundles(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      if (page > 1 && page > res.data.totalPages) setPage(Math.max(1, res.data.totalPages));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load bundles"));
    } finally {
      setLoading(false);
    }
  }, [page, publicOnly]);

  const deleteBundle = async (bundleId: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;
    try {
      await api.delete(`/bundles/${bundleId}`);
      await fetchBundles();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete bundle"));
    }
  };

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            {publicOnly ? "Public Bundles" : "My Bundles"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {publicOnly ? "Explore shared question banks" : "Manage your reusable question banks"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={publicOnly ? "outline" : "default"} onClick={() => { setPage(1); setPublicOnly(false); }}>My Bundles</Button>
          <Button variant={publicOnly ? "default" : "outline"} onClick={() => { setPage(1); setPublicOnly(true); }}>Public Bundles</Button>
          <Link href="/bundles/create"><Button><FolderPlus className="mr-2 h-4 w-4" />Create Bundle</Button></Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {loading ? (
        <Loading fullPage message="Loading your bundles..." />
      ) : bundles.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold font-heading">
              {publicOnly ? "No public bundles" : "No bundles yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {publicOnly ? "No shared question banks are available" : "Create your first question bundle to get started"}
            </p>
            {!publicOnly && <Link href="/bundles/create" className="mt-4">
              <Button>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Bundle
              </Button>
            </Link>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Card
              key={bundle.bundleId}
              className="group transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate font-heading">
                      {bundle.title}
                    </CardTitle>
                    {bundle.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {bundle.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant={
                      bundle.visibility === "PUBLIC" ? "default" : "secondary"
                    }
                    className="ml-2 shrink-0"
                  >
                    {bundle.visibility === "PUBLIC" ? (
                      <Eye className="mr-1 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1 h-3 w-3" />
                    )}
                    {bundle.visibility}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tags */}
                {bundle.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {bundle.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {bundle.questions?.length || 0} question
                    {(bundle.questions?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  <span>
                    {new Date(bundle.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/bundles/${bundle.bundleId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      {publicOnly ? "View" : "View / Edit"}
                    </Button>
                  </Link>
                  {!publicOnly && <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteBundle(bundle.bundleId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <PaginationControls page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </div>
  );
}
