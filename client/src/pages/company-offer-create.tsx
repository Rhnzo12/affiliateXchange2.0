import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CompanyOfferCreate() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    productName: "",
    shortDescription: "",
    fullDescription: "",
    primaryNiche: "",
    productUrl: "",
    commissionType: "per_sale" as const,
    commissionRate: "",
    commissionAmount: "",
    status: "draft" as const,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to create offers",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const createOfferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Build payload that exactly matches createOfferSchema
      // FIXED: Keep commission values as STRINGS (the API expects strings, not numbers)
      const payload: any = {
        title: data.title,
        productName: data.productName,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        primaryNiche: data.primaryNiche,
        productUrl: data.productUrl,
        commissionType: data.commissionType,
        commissionPercentage: data.commissionType === "per_sale" && data.commissionRate 
          ? data.commissionRate  // Keep as string
          : null,
        commissionAmount: data.commissionType !== "per_sale" && data.commissionAmount 
          ? data.commissionAmount  // Keep as string
          : null,
        status: data.status,
      };
      
      console.log("Sending payload:", payload); // Debug log
      
      return await apiRequest("POST", "/api/offers", payload);
    },
    onSuccess: () => {
      toast({
        title: "Offer Created",
        description: "Your offer has been created successfully",
      });
      setLocation("/company/offers");
    },
    onError: (error: any) => {
      console.error("Error creating offer:", error); // Debug log
      toast({
        title: "Error",
        description: error.message || "Failed to create offer",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an offer title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.productName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a product name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.shortDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a short description",
        variant: "destructive",
      });
      return;
    }

    if (!formData.fullDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a full description",
        variant: "destructive",
      });
      return;
    }

    if (!formData.primaryNiche.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a primary niche",
        variant: "destructive",
      });
      return;
    }

    if (!formData.productUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a product URL",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format and auto-add https:// if missing
    let productUrl = formData.productUrl.trim();
    if (!productUrl.match(/^https?:\/\//i)) {
      if (productUrl.includes('.')) {
        productUrl = 'https://' + productUrl;
        setFormData({ ...formData, productUrl: productUrl });
      } else {
        toast({
          title: "Validation Error",
          description: "Please enter a valid URL (e.g., https://example.com or example.com)",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.commissionType === "per_sale" && !formData.commissionRate) {
      toast({
        title: "Validation Error",
        description: "Please enter a commission rate for per-sale offers",
        variant: "destructive",
      });
      return;
    }

    if (formData.commissionType === "per_sale" && formData.commissionRate) {
      const rate = parseFloat(formData.commissionRate);
      if (isNaN(rate) || rate <= 0 || rate > 100) {
        toast({
          title: "Validation Error",
          description: "Commission rate must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.commissionType !== "per_sale" && !formData.commissionAmount) {
      toast({
        title: "Validation Error",
        description: "Please enter a commission amount",
        variant: "destructive",
      });
      return;
    }

    if (formData.commissionType !== "per_sale" && formData.commissionAmount) {
      const amount = parseFloat(formData.commissionAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Commission amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }
    }

    createOfferMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/offers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Offer</h1>
          <p className="text-muted-foreground mt-1">
            Set up an affiliate offer for creators to promote
          </p>
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Offer Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Premium Fitness App Affiliate Program"
                maxLength={100}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g., FitPro Premium"
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description * (Max 200 characters)</Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief summary for search results and previews..."
                maxLength={200}
                rows={2}
                data-testid="input-short-description"
              />
              <p className="text-xs text-muted-foreground">
                {formData.shortDescription.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Full Description *</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                placeholder="Detailed description of your offer, target audience, benefits, and what makes it special..."
                rows={6}
                data-testid="input-full-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryNiche">Primary Niche *</Label>
              <Select
                value={formData.primaryNiche}
                onValueChange={(value) => setFormData({ ...formData, primaryNiche: value })}
              >
                <SelectTrigger id="primaryNiche" data-testid="select-primary-niche">
                  <SelectValue placeholder="Select a niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fitness">Fitness & Health</SelectItem>
                  <SelectItem value="tech">Technology & Software</SelectItem>
                  <SelectItem value="beauty">Beauty & Fashion</SelectItem>
                  <SelectItem value="food">Food & Cooking</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="finance">Finance & Investing</SelectItem>
                  <SelectItem value="education">Education & Learning</SelectItem>
                  <SelectItem value="travel">Travel & Lifestyle</SelectItem>
                  <SelectItem value="home">Home & Garden</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL *</Label>
              <Input
                id="productUrl"
                value={formData.productUrl}
                onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                placeholder="https://yourproduct.com"
                data-testid="input-product-url"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commissionType">Commission Type *</Label>
                <Select
                  value={formData.commissionType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, commissionType: value })
                  }
                >
                  <SelectTrigger id="commissionType" data-testid="select-commission-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sale">Per Sale (Percentage)</SelectItem>
                    <SelectItem value="per_lead">Per Lead (Flat Rate)</SelectItem>
                    <SelectItem value="per_click">Per Click (CPC)</SelectItem>
                    <SelectItem value="monthly_retainer">Monthly Retainer</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.commissionType === "per_sale" ? (
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: e.target.value })
                    }
                    placeholder="e.g., 10"
                    data-testid="input-commission-rate"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="commissionAmount">Commission Amount ($) *</Label>
                  <Input
                    id="commissionAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.commissionAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionAmount: e.target.value })
                    }
                    placeholder="e.g., 50.00"
                    data-testid="input-commission-amount"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft offers are not visible to creators
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createOfferMutation.isPending}
                data-testid="button-create-offer"
              >
                {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
              </Button>
              <Link href="/company/offers">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-card-border bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> After creating your offer, you'll need to upload 6-12
            promotional videos before it can go live. You can do this from the offer details page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}