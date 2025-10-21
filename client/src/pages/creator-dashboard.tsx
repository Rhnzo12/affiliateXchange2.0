import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, MessageSquare, Heart, Star, Play } from "lucide-react";
import { Link } from "wouter";

export default function CreatorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/creator/stats"],
    enabled: isAuthenticated,
  });

  const { data: recommendedOffers } = useQuery<any[]>({
    queryKey: ["/api/offers/recommended"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.firstName || 'Creator'}!</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your creator journey</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">${stats?.totalEarnings || '0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +${stats?.monthlyEarnings || '0.00'} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOffers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingApplications || 0} pending applications
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.monthlyClicks || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/browse">
              <Button data-testid="button-browse-offers" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Browse New Offers
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" data-testid="button-view-applications" className="gap-2">
                <FileText className="h-4 w-4" />
                My Applications
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" data-testid="button-view-analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" data-testid="button-messages" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
                {stats?.unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-1">{stats.unreadMessages}</Badge>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Offers */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Recommended For You</CardTitle>
          <p className="text-sm text-muted-foreground">Offers matching your niche and audience</p>
        </CardHeader>
        <CardContent>
          {!recommendedOffers || recommendedOffers.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No recommended offers yet</p>
              <p className="text-sm text-muted-foreground mt-1">Complete your profile to get personalized recommendations</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedOffers.slice(0, 3).map((offer: any) => (
                <Link key={offer.id} href={`/offers/${offer.id}`}>
                  <Card className="hover-elevate cursor-pointer border-card-border h-full">
                    <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                      {offer.featuredImageUrl ? (
                        <img src={offer.featuredImageUrl} alt={offer.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      {offer.isPriority && (
                        <Badge className="absolute top-2 right-2 bg-primary">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{offer.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{offer.shortDescription}</p>
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant="secondary">{offer.commissionType.replace('_', ' ')}</Badge>
                        <span className="font-mono font-semibold text-primary">
                          ${offer.commissionAmount || '0'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
