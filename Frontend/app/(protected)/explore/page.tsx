"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
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
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { FileText, Search, User, Compass } from "lucide-react";

export default function ExplorePage() {
  const [bundles, setBundles] = useState<QuestionBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const fetchPublicBundles = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch public bundles, optionally filtering by tags if provided
      let url = "/quizzes/bundles?public=true";
      if (tagFilter) {
        url += `&tags=${encodeURIComponent(tagFilter)}`;
      }
      const res = await api.get(url);
      setBundles(res.data);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to load public bundles");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Adding a small debounce for tag filtering if we wanted, 
    // but here we just fetch when it changes, or user clicks 'Search'
    fetchPublicBundles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPublicBundles();
  };

  // Filter by title locally since backend only filters by tag
  const filteredBundles = bundles.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-2">
            <Compass className="h-8 w-8 text-primary" />
            Explore
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discover public question bundles shared by the community
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8 border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title..."
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-64">
              <Input
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder="Filter by tag (e.g., react)"
              />
            </div>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {loading ? (
        <Loading fullPage message="Loading public bundles..." />
      ) : filteredBundles.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold font-heading">
              No bundles found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBundles.map((bundle) => (
            <Card
              key={bundle.bundleId}
              className="group transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/50"
            >
              <CardHeader className="pb-3">
                <CardTitle className="truncate font-heading">
                  {bundle.title}
                </CardTitle>
                {bundle.description && (
                  <CardDescription className="mt-1 line-clamp-2">
                    {bundle.description}
                  </CardDescription>
                )}
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

                <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{bundle.createdBy?.name || "Unknown Author"}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {bundle.questions?.length || 0} question
                    {(bundle.questions?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  <span>
                    {new Date(bundle.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-4">
                  <Link href={`/quiz/create?bundleId=${bundle.bundleId}`}>
                    <Button variant="secondary" size="sm" className="w-full">
                      Use this Bundle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
