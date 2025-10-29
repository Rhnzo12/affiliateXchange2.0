import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Send,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import type { User } from "@shared/schema";

type PaymentStatus =
  | "pending"
  | "pending_approval"
  | "scheduled"
  | "approved"
  | "completed"
  | "failed"
  | "disputed";

type CreatorPayment = {
  id: string;
  offer: string;
  company: string;
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  status: PaymentStatus;
  method: string;
  scheduledDate?: string;
  completedDate?: string;
  proof?: string;
};

type CompanyPayout = {
  id: string;
  creator: string;
  offer: string;
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  totalDue: number;
  status: PaymentStatus;
  proofSubmitted?: string;
  workCompleted?: string;
  scheduledDate?: string;
  approvedDate?: string;
  completedDate?: string;
  disputeReason?: string;
  proof?: string;
};

type PaymentMethod = {
  id: number;
  payoutMethod: string;
  payoutEmail?: string;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  paypalEmail?: string;
  cryptoWalletAddress?: string;
  cryptoNetwork?: string;
  isDefault?: boolean;
};

type AdminFundingMethod = {
  id: number;
  name: string;
  type: "bank" | "wallet" | "card";
  last4: string;
  status: "active" | "pending" | "disabled";
  isPrimary?: boolean;
};

const creatorPayments: CreatorPayment[] = [
  {
    id: "PAY-001",
    offer: "FitApp Premium",
    company: "FitTech Inc",
    grossAmount: 500,
    platformFee: 20,
    processingFee: 15,
    netAmount: 465,
    status: "completed",
    method: "E-transfer",
    scheduledDate: "2025-10-25",
    completedDate: "2025-10-25",
    proof: "video_link_123.mp4",
  },
  {
    id: "PAY-002",
    offer: "BeautyBox Subscription",
    company: "BeautyBox Co",
    grossAmount: 750,
    platformFee: 30,
    processingFee: 22.5,
    netAmount: 697.5,
    status: "pending",
    method: "PayPal",
    scheduledDate: "2025-11-01",
    proof: "video_link_456.mp4",
  },
  {
    id: "PAY-003",
    offer: "TechGadget Pro",
    company: "TechGear LLC",
    grossAmount: 1200,
    platformFee: 48,
    processingFee: 36,
    netAmount: 1116,
    status: "scheduled",
    method: "Wire Transfer",
    scheduledDate: "2025-11-05",
  },
];

const companyPayouts: CompanyPayout[] = [
  {
    id: "POUT-001",
    creator: "@fitnessJoe",
    offer: "FitApp Premium",
    grossAmount: 500,
    platformFee: 20,
    processingFee: 15,
    totalDue: 535,
    status: "pending_approval",
    proofSubmitted: "2025-10-28",
    workCompleted: "2025-10-27",
    proof: "video_link_123.mp4",
  },
  {
    id: "POUT-002",
    creator: "@beautyQueen",
    offer: "FitApp Premium",
    grossAmount: 750,
    platformFee: 30,
    processingFee: 22.5,
    totalDue: 802.5,
    status: "approved",
    scheduledDate: "2025-11-01",
    workCompleted: "2025-10-25",
    approvedDate: "2025-10-28",
  },
  {
    id: "POUT-003",
    creator: "@techReviewer",
    offer: "FitApp Premium",
    grossAmount: 1200,
    platformFee: 48,
    processingFee: 36,
    totalDue: 1284,
    status: "completed",
    completedDate: "2025-10-20",
    workCompleted: "2025-10-15",
  },
  {
    id: "POUT-004",
    creator: "@lifestyleVlog",
    offer: "FitApp Premium",
    grossAmount: 300,
    platformFee: 12,
    processingFee: 9,
    totalDue: 321,
    status: "disputed",
    disputeReason: "Video quality concerns",
    workCompleted: "2025-10-26",
  },
];

const adminFundingMethods: AdminFundingMethod[] = [
  {
    id: 1,
    name: "Primary Operating Account",
    type: "bank",
    last4: "4321",
    status: "active",
    isPrimary: true,
  },
  {
    id: 2,
    name: "Reserve Treasury Wallet",
    type: "wallet",
    last4: "9fae",
    status: "active",
  },
  {
    id: 3,
    name: "Backup Settlement Card",
    type: "card",
    last4: "7788",
    status: "pending",
  },
];

const statusConfig: Record<PaymentStatus, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "Pending" },
  pending_approval: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: Clock,
    label: "Pending Approval",
  },
  scheduled: { bg: "bg-blue-100", text: "text-blue-800", icon: Clock, label: "Scheduled" },
  approved: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: "Approved" },
  completed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: "Completed" },
  failed: { bg: "bg-red-100", text: "text-red-800", icon: XCircle, label: "Failed" },
  disputed: { bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle, label: "Disputed" },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// [All component functions remain the same: CreatorOverview, CreatorPaymentSettings, 
// CompanyPayoutApproval, CompanyOverview, AdminPaymentDashboard]
// ... (keeping the same implementations as in your original code)

function AdminPaymentSettings() {
  const [settlementSchedule, setSettlementSchedule] = useState("weekly");
  const [reservePercentage, setReservePercentage] = useState("10");
  const [minimumBalance, setMinimumBalance] = useState("5000");
  const [autoDisburse, setAutoDisburse] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("finance@creatorlink.com");
  const [escalationEmail, setEscalationEmail] = useState("compliance@creatorlink.com");
  const [includeReports, setIncludeReports] = useState(true);

  const typeLabels: Record<AdminFundingMethod["type"], string> = {
    bank: "Bank Account",
    wallet: "Custody Wallet",
    card: "Corporate Card",
  };

  const statusStyles: Record<AdminFundingMethod["status"], string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    disabled: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Disbursement Controls</h3>
          <p className="mt-1 text-sm text-gray-600">
            Configure how platform-wide payouts are released to creators and external partners.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-settlement-schedule">Settlement Schedule</Label>
            <Select value={settlementSchedule} onValueChange={setSettlementSchedule}>
              <SelectTrigger id="admin-settlement-schedule">
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Determines how frequently approved creator payments are bundled for release.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-reserve-percentage">Platform Reserve %</Label>
            <Input
              id="admin-reserve-percentage"
              type="number"
              min={0}
              max={50}
              value={reservePercentage}
              onChange={(event) => setReservePercentage(event.target.value)}
            />
            <p className="text-xs text-gray-500">
              Holdback applied to every payout to maintain compliance and risk buffers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-minimum-balance">Minimum Operating Balance ($)</Label>
            <Input
              id="admin-minimum-balance"
              type="number"
              min={0}
              step="100"
              value={minimumBalance}
              onChange={(event) => setMinimumBalance(event.target.value)}
            />
            <p className="text-xs text-gray-500">
              Payouts pause automatically if platform funds fall below this threshold.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Automatic Disbursement</Label>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable auto-processing</p>
                <p className="text-xs text-gray-500">
                  When disabled, finance must manually trigger every payout batch.
                </p>
              </div>
              <Switch checked={autoDisburse} onCheckedChange={setAutoDisburse} aria-label="Toggle automatic disbursement" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button className="bg-blue-600 text-white hover:bg-blue-700">Update Disbursement Policy</Button>
          <span className="text-xs text-gray-500">
            Last reviewed 2 days ago by Finance Ops.
          </span>
        </div>
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Platform Funding Accounts</h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage the accounts used to fund creator payouts and collect platform fees.
            </p>
          </div>
          <Button variant="outline">Add Funding Source</Button>
        </div>

        <div className="space-y-4">
          {adminFundingMethods.map((method) => (
            <div key={method.id} className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{method.name}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {typeLabels[method.type]} · Ending in {method.last4}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.isPrimary && <Badge>Primary</Badge>}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[method.status]}`}>
                  {method.status === "active"
                    ? "Active"
                    : method.status === "pending"
                    ? "Pending Verification"
                    : "Disabled"}
                </span>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Notifications & Escalation</h3>
          <p className="mt-1 text-sm text-gray-600">
            Control who is notified when payouts process, fail, or require manual review.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-notification-email">Primary Finance Contact</Label>
            <Input
              id="admin-notification-email"
              type="email"
              value={notificationEmail}
              onChange={(event) => setNotificationEmail(event.target.value)}
            />
            <p className="text-xs text-gray-500">Daily settlement summaries are delivered to this inbox.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-escalation-email">Escalation Contact</Label>
            <Input
              id="admin-escalation-email"
              type="email"
              value={escalationEmail}
              onChange={(event) => setEscalationEmail(event.target.value)}
            />
            <p className="text-xs text-gray-500">Disputes and compliance holds are routed here for fast action.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Attach financial reports</Label>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Include CSV exports in alerts</p>
                <p className="text-xs text-gray-500">Automate weekly payout exports for accounting reconciliation.</p>
              </div>
              <Switch
                checked={includeReports}
                onCheckedChange={setIncludeReports}
                aria-label="Toggle report attachments"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">SMS escalation</Label>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Trigger SMS on payout failures</p>
                <p className="text-xs text-gray-500">Sends texts to the escalation contact when urgent action is required.</p>
              </div>
              <Switch aria-label="Toggle SMS escalation" defaultChecked />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button className="bg-blue-600 text-white hover:bg-blue-700">Save Notification Preferences</Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSettings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "approvals" | "dashboard">("overview");

  const [payoutMethod, setPayoutMethod] = useState("etransfer");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");

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

  useEffect(() => {
    if (user?.role === "company" || user?.role === "creator") {
      setActiveTab("overview");
      return;
    }
    if (user?.role === "admin") {
      setActiveTab("dashboard");
    }
  }, [user?.role]);

  const { data: paymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-settings"],
    enabled: isAuthenticated,
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { payoutMethod };

      if (payoutMethod === "etransfer") {
        payload.payoutEmail = payoutEmail;
      } else if (payoutMethod === "wire") {
        payload.bankRoutingNumber = bankRoutingNumber;
        payload.bankAccountNumber = bankAccountNumber;
      } else if (payoutMethod === "paypal") {
        payload.paypalEmail = paypalEmail;
      } else if (payoutMethod === "crypto") {
        payload.cryptoWalletAddress = cryptoWalletAddress;
        payload.cryptoNetwork = cryptoNetwork;
      }

      return await apiRequest("POST", "/api/payment-settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-settings"] });
      toast({
        title: "Success",
        description: "Payment method added successfully",
      });
      setPayoutEmail("");
      setBankRoutingNumber("");
      setBankAccountNumber("");
      setPaypalEmail("");
      setCryptoWalletAddress("");
      setCryptoNetwork("");
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
        description: "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role: User["role"] = user.role;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="mt-1 text-gray-600">Manage your payments and payouts</p>
        </div>

        {role === "creator" && (
          <>
            <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "overview"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Payment History
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "settings"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Payment Methods
                </button>
              </div>
            </div>
            {activeTab === "overview" && <CreatorOverview payments={creatorPayments} />}
            {activeTab === "settings" && (
              <CreatorPaymentSettings
                paymentMethods={paymentMethods}
                payoutMethod={payoutMethod}
                setPayoutMethod={setPayoutMethod}
                payoutEmail={payoutEmail}
                setPayoutEmail={setPayoutEmail}
                bankRoutingNumber={bankRoutingNumber}
                setBankRoutingNumber={setBankRoutingNumber}
                bankAccountNumber={bankAccountNumber}
                setBankAccountNumber={setBankAccountNumber}
                paypalEmail={paypalEmail}
                setPaypalEmail={setPaypalEmail}
                cryptoWalletAddress={cryptoWalletAddress}
                setCryptoWalletAddress={setCryptoWalletAddress}
                cryptoNetwork={cryptoNetwork}
                setCryptoNetwork={setCryptoNetwork}
                onAddPaymentMethod={() => addPaymentMethodMutation.mutate()}
                isSubmitting={addPaymentMethodMutation.isPending}
              />
            )}
          </>
        )}

        {role === "company" && (
          <>
            <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "overview"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("approvals")}
                  className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "approvals"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Pending Approvals
                  <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
                    {companyPayouts.filter((payout) => payout.status === "pending_approval").length}
                  </span>
                </button>
              </div>
            </div>
            {activeTab === "overview" && <CompanyOverview payouts={companyPayouts} />}
            {activeTab === "approvals" && <CompanyPayoutApproval payouts={companyPayouts} />}
          </>
        )}

        {role === "admin" && (
          <>
            <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "dashboard"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Platform Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "settings"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Payment Settings
                </button>
              </div>
            </div>
            {activeTab === "dashboard" && (
              <AdminPaymentDashboard creatorPayments={creatorPayments} companyPayouts={companyPayouts} />
            )}
            {activeTab === "settings" && <AdminPaymentSettings />}
          </>
        )}
      </div>
    </div>
  );
}