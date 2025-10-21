import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Star, Play, CheckCircle2, DollarSign, Clock, MapPin, Users } from "lucide-react";

export default function OfferDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/offers/:id");
  const offerId = params?.id;

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [preferredCommission, setPreferredCommission] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

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

  const { data: offer, isLoading: offerLoading } = useQuery<any>({
    queryKey: ["/api/offers", offerId],
    enabled: !!offerId && isAuthenticated,
  });

  const { data: isFavorite } = useQuery<boolean>({
    queryKey: ["/api/favorites", offerId],
    enabled: !!offerId && isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${offerId}`);
      } else {
        await apiRequest("POST", "/api/favorites", { offerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", offerId] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/applications", {
        offerId,
        message: applicationMessage,
        preferredCommission,
      });
    },
    onSuccess: () => {
      setShowApplyDialog(false);
      toast({
        title: "Application Submitted!",
        description: "You'll hear back within 4 hours. Check My Applications for updates.",
      });
      setApplicationMessage("");
      setPreferredCommission("");
      setTermsAccepted(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  if (isLoading || offerLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  if (!offer) {
    return <div className="text-center py-12">
      <p className="text-muted-foreground">Offer not found</p>
    </div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Image */}
      <div className="aspect-[21/9] relative bg-muted rounded-lg overflow-hidden">
        {offer.featuredImageUrl ? (
          <img src={offer.featuredImageUrl} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-20 w-20 text-muted-foreground/50" />
          </div>
        )}
        {offer.isPriority && (
          <Badge className="absolute top-4 right-4 bg-primary text-lg px-4 py-2">
            Featured
          </Badge>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {offer.company?.logoUrl && (
              <Avatar className="h-12 w-12">
                <AvatarImage src={offer.company.logoUrl} alt={offer.company.tradeName} />
                <AvatarFallback>{offer.company.tradeName?.[0]}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-3xl font-bold">{offer.title}</h1>
              <p className="text-muted-foreground">{offer.company?.tradeName}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => favoriteMutation.mutate()}
            data-testid="button-favorite"
            className="h-10 w-10"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">Videos ({offer.videos?.length || 0})</TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements">Requirements</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>About This Offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{offer.fullDescription}</p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Commission</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    ${offer.commissionAmount || offer.commissionPercentage + '%'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Commission Type</div>
                  <Badge>{offer.commissionType.replace('_', ' ')}</Badge>
                </div>
                {offer.paymentSchedule && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Payment Schedule</div>
                    <div className="font-semibold">{offer.paymentSchedule}</div>
                  </div>
                )}
                {offer.minimumPayout && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Minimum Payout</div>
                    <div className="font-semibold font-mono">${offer.minimumPayout}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          {!offer.videos || offer.videos.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="p-12 text-center">
                <Play className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No example videos available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {offer.videos.map((video: any) => (
                <Card
                  key={video.id}
                  className="hover-elevate cursor-pointer border-card-border"
                  onClick={() => setSelectedVideo(video)}
                  data-testid={`video-${video.id}`}
                >
                  <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-sm line-clamp-1">{video.title}</h4>
                    {video.creatorCredit && (
                      <p className="text-xs text-muted-foreground mt-1">by {video.creatorCredit}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Creator Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offer.minimumFollowers && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold">Minimum Followers</div>
                    <div className="text-muted-foreground">{offer.minimumFollowers.toLocaleString()}</div>
                  </div>
                </div>
              )}
              {offer.allowedPlatforms && offer.allowedPlatforms.length > 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold">Allowed Platforms</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {offer.allowedPlatforms.map((platform: string) => (
                        <Badge key={platform} variant="secondary">{platform}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {offer.geographicRestrictions && offer.geographicRestrictions.length > 0 && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-semibold">Geographic Restrictions</div>
                    <div className="text-muted-foreground">{offer.geographicRestrictions.join(', ')}</div>
                  </div>
                </div>
              )}
              {offer.contentStyleRequirements && (
                <div className="pt-4 border-t">
                  <div className="font-semibold mb-2">Content Style Requirements</div>
                  <p className="text-muted-foreground">{offer.contentStyleRequirements}</p>
                </div>
              )}
              {offer.brandSafetyRequirements && (
                <div className="pt-4 border-t">
                  <div className="font-semibold mb-2">Brand Safety Requirements</div>
                  <p className="text-muted-foreground">{offer.brandSafetyRequirements}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Creator Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No reviews yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Apply Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-4 z-40">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2" data-testid="button-apply">
                Apply Now
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Apply to {offer.title}</DialogTitle>
                <DialogDescription>
                  Tell the company why you're interested in promoting their offer
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Why are you interested? *</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell the company about your audience and why you'd be a great fit..."
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value.slice(0, 500))}
                    className="min-h-32"
                    data-testid="textarea-application-message"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {applicationMessage.length}/500
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Preferred Commission Model</Label>
                  <Select value={preferredCommission} onValueChange={setPreferredCommission}>
                    <SelectTrigger id="commission" data-testid="select-preferred-commission">
                      <SelectValue placeholder="Select preferred model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard Commission</SelectItem>
                      {offer.commissionType === 'hybrid' && (
                        <>
                          <SelectItem value="per_sale">Per Sale</SelectItem>
                          <SelectItem value="retainer">Monthly Retainer</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    data-testid="checkbox-terms"
                  />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    I accept the terms and conditions and agree to promote this offer ethically
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={!applicationMessage || !termsAccepted || applyMutation.isPending}
                  data-testid="button-submit-application"
                >
                  {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Video Player Dialog */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo.title}</DialogTitle>
              {selectedVideo.description && (
                <DialogDescription>{selectedVideo.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {selectedVideo.videoUrl && (
                <video src={selectedVideo.videoUrl} controls className="w-full h-full" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
