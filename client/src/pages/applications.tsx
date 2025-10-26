import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, MessageSquare, TrendingUp, FileText, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, any> = {
  pending: { variant: "secondary" as const, icon: Clock },
  approved: { variant: "default" as const, icon: CheckCircle2 },
  active: { variant: "default" as const, icon: TrendingUp },
  completed: { variant: "secondary" as const, icon: CheckCircle2 },
};

// Helper function to format commission display
const formatCommission = (offer: any) => {
  if (!offer) return "$0";
  
  if (offer.commissionAmount) {
    return `$${offer.commissionAmount}`;
  } else if (offer.commissionPercentage) {
    return `${offer.commissionPercentage}%`;
  } else if (offer.commissionRate) {
    return `$${offer.commissionRate}`;
  }
  return "$0";
};

export default function Applications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: applications } = useQuery<any[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
  });

  const copyTrackingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Tracking link copied to clipboard",
    });
  };

  const filteredApplications = applications?.filter(app => {
    if (activeTab === "all") return true;
    return app.status === activeTab;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-1">Track all your affiliate applications in one place</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({applications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {!filteredApplications || filteredApplications.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">Start browsing offers and apply to begin earning</p>
                <Link href="/browse">
                  <Button data-testid="button-browse-offers">Browse Offers</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application: any) => {
              const StatusIcon = STATUS_COLORS[application.status]?.icon || Clock;
              
              return (
                <Card key={application.id} className="border-card-border hover-elevate" data-testid={`application-${application.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Offer Thumbnail */}
                      <div className="md:w-48 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {application.offer?.featuredImageUrl ? (
                          <img
                            src={application.offer.featuredImageUrl}
                            alt={application.offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Application Details */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <Link href={`/offers/${application.offer?.id}`}>
                              <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                                {application.offer?.title || "Untitled Offer"}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {application.offer?.company?.tradeName || "Company"}
                            </p>
                          </div>
                          <Badge {...STATUS_COLORS[application.status]} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {application.status}
                          </Badge>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Applied</div>
                            <div className="font-medium">
                              {new Date(application.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Commission</div>
                            <div className="font-medium font-mono">
                              {formatCommission(application.offer)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Type</div>
                            <Badge variant="secondary" className="mt-1">
                              {application.offer?.commissionType?.replace(/_/g, ' ') || 'Standard'}
                            </Badge>
                          </div>
                        </div>

                        {application.status === 'approved' && application.trackingLink && (
                          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="text-sm font-medium">Your Tracking Link</div>
                            <div className="flex gap-2">
                              <code className="flex-1 text-sm bg-background px-3 py-2 rounded border overflow-x-auto">
                                {application.trackingLink}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyTrackingLink(application.trackingLink)}
                                data-testid={`button-copy-link-${application.id}`}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {application.trackingLink && (
                            <Link href={`/analytics/${application.id}`}>
                              <Button size="sm" variant="outline" data-testid={`button-analytics-${application.id}`} className="gap-2">
                                <TrendingUp className="h-4 w-4" />
                                View Analytics
                              </Button>
                            </Link>
                          )}
                          <Link href={`/messages?application=${application.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-message-${application.id}`} className="gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Message Company
                            </Button>
                          </Link>
                          <Link href={`/offers/${application.offer?.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-offer-${application.id}`} className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              View Offer
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}