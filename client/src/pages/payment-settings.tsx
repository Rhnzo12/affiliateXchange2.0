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

type CreatorOverviewProps = {
  payments: CreatorPayment[];
};

function CreatorOverview({ payments }: CreatorOverviewProps) {
  const { totalEarnings, pendingEarnings, completedEarnings } = useMemo(() => {
    const totals = payments.reduce(
      (acc, payment) => {
        const amount = payment.netAmount;
        acc.totalEarnings += amount;
        if (payment.status === "completed") {
          acc.completedEarnings += amount;
        }
        if (payment.status === "pending" || payment.status === "scheduled") {
          acc.pendingEarnings += amount;
        }
        return acc;
      },
      { totalEarnings: 0, pendingEarnings: 0, completedEarnings: 0 }
    );

    return totals;
  }, [payments]);
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-green-100">Total Earnings</span>
            <DollarSign className="h-5 w-5 text-green-100" />
          </div>
          <div className="text-3xl font-bold">${totalEarnings.toFixed(2)}</div>
          <div className="mt-1 text-xs text-green-100">All-time</div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Pending</span>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${pendingEarnings.toFixed(2)}</div>
          <div className="mt-1 text-xs text-gray-500">Awaiting payment</div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Paid Out</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${completedEarnings.toFixed(2)}</div>
          <div className="mt-1 text-xs text-gray-500">Completed payments</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Offer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Gross
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Platform Fee (4%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Processing (3%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {payments.map((payment) => (
                <tr key={payment.id} className="transition hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{payment.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{payment.offer}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{payment.company}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    ${payment.grossAmount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">-${payment.platformFee}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">-${payment.processingFee}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-green-600">
                    ${payment.netAmount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {payment.completedDate || payment.scheduledDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type CreatorPaymentSettingsProps = {
  paymentMethods?: PaymentMethod[];
  payoutMethod: string;
  setPayoutMethod: (method: string) => void;
  payoutEmail: string;
  setPayoutEmail: (value: string) => void;
  bankRoutingNumber: string;
  setBankRoutingNumber: (value: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (value: string) => void;
  paypalEmail: string;
  setPaypalEmail: (value: string) => void;
  cryptoWalletAddress: string;
  setCryptoWalletAddress: (value: string) => void;
  cryptoNetwork: string;
  setCryptoNetwork: (value: string) => void;
  onAddPaymentMethod: () => void;
  isSubmitting: boolean;
};

function CreatorPaymentSettings({
  paymentMethods,
  payoutMethod,
  setPayoutMethod,
  payoutEmail,
  setPayoutEmail,
  bankRoutingNumber,
  setBankRoutingNumber,
  bankAccountNumber,
  setBankAccountNumber,
  paypalEmail,
  setPaypalEmail,
  cryptoWalletAddress,
  setCryptoWalletAddress,
  cryptoNetwork,
  setCryptoNetwork,
  onAddPaymentMethod,
  isSubmitting,
}: CreatorPaymentSettingsProps) {
  const isAddDisabled =
    isSubmitting ||
    (payoutMethod === "etransfer" && !payoutEmail) ||
    (payoutMethod === "wire" && (!bankRoutingNumber || !bankAccountNumber)) ||
    (payoutMethod === "paypal" && !paypalEmail) ||
    (payoutMethod === "crypto" && (!cryptoWalletAddress || !cryptoNetwork));

  const getDisplayValue = (method: PaymentMethod) => {
    if (method.payoutMethod === "etransfer") {
      return method.payoutEmail;
    }
    if (method.payoutMethod === "wire") {
      return method.bankAccountNumber;
    }
    if (method.payoutMethod === "paypal") {
      return method.paypalEmail;
    }
    if (method.payoutMethod === "crypto") {
      return method.cryptoWalletAddress;
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
        {!paymentMethods || paymentMethods.length === 0 ? (
          <div className="mt-6 text-center">
            <DollarSign className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No payment methods yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add a payment method to receive payouts</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border-2 border-gray-200 p-4"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium capitalize text-gray-900">
                      {method.payoutMethod.replace("_", " ")}
                    </div>
                    <div className="text-sm text-gray-600">{getDisplayValue(method)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault && <Badge>Default</Badge>}
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900">Add Payment Method</h3>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="method">Payout Method</Label>
            <Select value={payoutMethod} onValueChange={setPayoutMethod}>
              <SelectTrigger id="method" data-testid="select-payout-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etransfer">E-Transfer</SelectItem>
                <SelectItem value="wire">Wire/ACH</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payoutMethod === "etransfer" && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={payoutEmail}
                onChange={(e) => setPayoutEmail(e.target.value)}
                data-testid="input-payout-email"
              />
            </div>
          )}

          {payoutMethod === "wire" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="routing">Bank Routing Number</Label>
                <Input
                  id="routing"
                  placeholder="123456789"
                  value={bankRoutingNumber}
                  onChange={(e) => setBankRoutingNumber(e.target.value)}
                  data-testid="input-routing-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">Bank Account Number</Label>
                <Input
                  id="account"
                  placeholder="123456789012"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  data-testid="input-account-number"
                />
              </div>
            </>
          )}

          {payoutMethod === "paypal" && (
            <div className="space-y-2">
              <Label htmlFor="paypal-email">PayPal Email</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your@paypal.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                data-testid="input-paypal-email"
              />
            </div>
          )}

          {payoutMethod === "crypto" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wallet">Wallet Address</Label>
                <Input
                  id="wallet"
                  placeholder="0x..."
                  value={cryptoWalletAddress}
                  onChange={(e) => setCryptoWalletAddress(e.target.value)}
                  data-testid="input-crypto-wallet"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger id="network" data-testid="select-crypto-network">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum (ERC-20)</SelectItem>
                    <SelectItem value="bsc">Binance Smart Chain (BEP-20)</SelectItem>
                    <SelectItem value="polygon">Polygon (MATIC)</SelectItem>
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                    <SelectItem value="tron">Tron (TRC-20)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={onAddPaymentMethod}
            disabled={isAddDisabled}
            className="gap-2"
            data-testid="button-add-payment"
          >
            {isSubmitting ? "Adding..." : "Add Payment Method"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
        <h4 className="mb-2 font-bold text-blue-900">Payment Fee Breakdown</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>Platform Fee:</span>
            <span className="font-medium">4% of gross earnings</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee:</span>
            <span className="font-medium">3% of gross earnings</span>
          </div>
          <div className="mt-2 flex justify-between border-t-2 border-blue-300 pt-2 font-bold">
            <span>Total Deduction:</span>
            <span>7% of gross earnings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type CompanyPayoutApprovalProps = {
  payouts: CompanyPayout[];
};

function CompanyPayoutApproval({ payouts }: CompanyPayoutApprovalProps) {
  const pendingApprovals = useMemo(
    () => payouts.filter((payout) => payout.status === "pending_approval"),
    [payouts]
  );

  const totalPendingAmount = pendingApprovals.reduce((sum, payout) => sum + payout.totalDue, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6">
        <div className="mb-3 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-bold text-yellow-900">Pending Approvals</h3>
        </div>
        <p className="text-yellow-800">
          You have {pendingApprovals.length} payout{pendingApprovals.length !== 1 ? "s" : ""} pending approval totaling
          ${totalPendingAmount.toFixed(2)}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Payout Requests</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {payouts.map((payout) => (
            <div key={payout.id} className="p-6 transition hover:bg-gray-50">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h4 className="font-bold text-gray-900">{payout.creator}</h4>
                    <StatusBadge status={payout.status} />
                  </div>
                  <p className="text-sm text-gray-600">{payout.offer}</p>
                  {payout.workCompleted && (
                    <p className="mt-1 text-xs text-gray-500">Work completed: {payout.workCompleted}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${payout.totalDue.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total due</div>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <div className="mb-1 text-gray-600">Creator Payment</div>
                    <div className="font-medium text-gray-900">${payout.grossAmount}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-gray-600">Platform Fee (4%)</div>
                    <div className="font-medium text-gray-900">${payout.platformFee}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-gray-600">Processing (3%)</div>
                    <div className="font-medium text-gray-900">${payout.processingFee}</div>
                  </div>
                </div>
              </div>

              {payout.proof && (
                <div className="mb-4">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    View Proof of Work
                  </a>
                </div>
              )}

              {payout.status === "pending_approval" && (
                <div className="flex gap-3">
                  <Button className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Approve Payment
                  </Button>
                  <Button className="flex-1 gap-2 bg-red-600 text-white hover:bg-red-700">
                    <XCircle className="h-4 w-4" />
                    Dispute
                  </Button>
                </div>
              )}

              {payout.status === "disputed" && payout.disputeReason && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">Dispute Reason:</span>
                  </div>
                  <p className="text-sm text-red-800">{payout.disputeReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type CompanyOverviewProps = {
  payouts: CompanyPayout[];
};

function CompanyOverview({ payouts }: CompanyOverviewProps) {
  const totalPaid = payouts
    .filter((payout) => payout.status === "completed")
    .reduce((sum, payout) => sum + payout.totalDue, 0);
  const pendingAmount = payouts
    .filter((payout) => payout.status === "pending_approval" || payout.status === "approved")
    .reduce((sum, payout) => sum + payout.totalDue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Paid Out</span>
            <Send className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${totalPaid.toFixed(2)}</div>
          <div className="mt-1 text-xs text-gray-500">All-time</div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 text-white">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-yellow-100">Pending</span>
            <Clock className="h-5 w-5 text-yellow-100" />
          </div>
          <div className="text-3xl font-bold">${pendingAmount.toFixed(2)}</div>
          <div className="mt-1 text-xs text-yellow-100">Requires action</div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Creators</span>
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{payouts.length}</div>
          <div className="mt-1 text-xs text-gray-500">In your offers</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Creator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Offer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Creator Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Platform Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {payouts.map((payout) => (
                <tr key={payout.id} className="transition hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{payout.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{payout.creator}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{payout.offer}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    ${payout.grossAmount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    ${(payout.platformFee + payout.processingFee).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-red-600">
                    ${payout.totalDue.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={payout.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {payout.completedDate || payout.approvedDate || payout.proofSubmitted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type AdminPaymentDashboardProps = {
  creatorPayments: CreatorPayment[];
  companyPayouts: CompanyPayout[];
};

function AdminPaymentDashboard({ creatorPayments, companyPayouts }: AdminPaymentDashboardProps) {
  const allTransactions = useMemo(() => {
    return [...creatorPayments, ...companyPayouts] as Array<CreatorPayment | CompanyPayout>;
  }, [companyPayouts, creatorPayments]);

  const totalPlatformRevenue = allTransactions.reduce((sum, transaction) => {
    const platformFee = "platformFee" in transaction ? transaction.platformFee : 0;
    const processingFee = "processingFee" in transaction ? transaction.processingFee : 0;
    return sum + platformFee + processingFee;
  }, 0);

  const totalGMV = allTransactions.reduce((sum, transaction) => {
    const gross = "grossAmount" in transaction ? transaction.grossAmount : 0;
    return sum + gross;
  }, 0);

  const disputedPayments = companyPayouts.filter((payout) => payout.status === "disputed");

  const getNetAmount = (transaction: CreatorPayment | CompanyPayout) => {
    if ("netAmount" in transaction) {
      return transaction.netAmount;
    }
    return transaction.grossAmount - transaction.platformFee - transaction.processingFee;
  };

  const getTransactionDate = (transaction: CreatorPayment | CompanyPayout) => {
    if ("completedDate" in transaction && transaction.completedDate) {
      return transaction.completedDate;
    }
    if ("scheduledDate" in transaction && transaction.scheduledDate) {
      return transaction.scheduledDate;
    }
    if ("approvedDate" in transaction && transaction.approvedDate) {
      return transaction.approvedDate;
    }
    if ("proofSubmitted" in transaction && transaction.proofSubmitted) {
      return transaction.proofSubmitted;
    }
    return "—";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-purple-100">Platform Revenue</span>
            <TrendingUp className="h-5 w-5 text-purple-100" />
          </div>
          <div className="text-3xl font-bold">${totalPlatformRevenue.toFixed(2)}</div>
          <div className="mt-1 text-xs text-purple-100">7% of GMV</div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total GMV</span>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${totalGMV.toFixed(2)}</div>
          <div className="mt-1 text-xs text-gray-500">Gross merchandise value</div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Transactions</span>
            <Send className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{allTransactions.length}</div>
          <div className="mt-1 text-xs text-gray-500">All-time</div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-red-100">Disputes</span>
            <AlertTriangle className="h-5 w-5 text-red-100" />
          </div>
          <div className="text-3xl font-bold">{disputedPayments.length}</div>
          <div className="mt-1 text-xs text-red-100">Require resolution</div>
        </div>
      </div>

      {disputedPayments.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Payment Disputes Requiring Action
          </h3>
          <div className="space-y-3">
            {disputedPayments.map((dispute) => (
              <div key={dispute.id} className="rounded-lg border-2 border-red-300 bg-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{dispute.id}</div>
                    <div className="text-sm text-gray-600">
                      {dispute.creator} → {dispute.offer}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${dispute.grossAmount}</div>
                    <div className="text-xs text-gray-500">Creator amount</div>
                  </div>
                </div>
                {dispute.disputeReason && (
                  <div className="mb-3 rounded bg-red-50 p-3">
                    <div className="mb-1 text-xs font-medium text-red-900">Dispute Reason:</div>
                    <div className="text-sm text-red-800">{dispute.disputeReason}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 text-white hover:bg-green-700">Approve Payment</Button>
                  <Button className="flex-1 bg-blue-600 text-white hover:bg-blue-700">Contact Parties</Button>
                  <Button className="flex-1 bg-red-600 text-white hover:bg-red-700">Reject Claim</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Scheduled Payouts</h3>
            <p className="mt-1 text-sm text-gray-600">Process batch payments for approved transactions</p>
          </div>
          <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <Send className="h-4 w-4" />
            Process All Scheduled
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-sm text-blue-800">Due Today</div>
            <div className="text-2xl font-bold text-blue-900">3</div>
            <div className="mt-1 text-xs text-blue-700">$2,412.50 total</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4">
            <div className="text-sm text-yellow-800">Next 7 Days</div>
            <div className="text-2xl font-bold text-yellow-900">8</div>
            <div className="mt-1 text-xs text-yellow-700">$5,678.90 total</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-sm text-green-800">Next 30 Days</div>
            <div className="text-2xl font-bold text-green-900">24</div>
            <div className="mt-1 text-xs text-green-700">$18,234.60 total</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">All Transactions</h3>
            <p className="mt-1 text-sm text-gray-600">Complete platform payment history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  From/To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Gross
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Platform Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Net
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allTransactions.slice(0, 10).map((transaction) => {
                const isCompanyPayout = "creator" in transaction;
                return (
                  <tr key={transaction.id} className="transition hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {transaction.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {isCompanyPayout ? "Company → Creator" : "Platform → Creator"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {isCompanyPayout ? transaction.creator : transaction.company}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      ${transaction.grossAmount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-purple-600">
                      ${((transaction.platformFee ?? 0) + (transaction.processingFee ?? 0)).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                      ${getNetAmount(transaction)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {getTransactionDate(transaction)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Button variant="ghost" className="p-0">
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Financial Reports</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-1 border-2 border-gray-200 bg-white py-4 text-left hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="font-medium text-gray-900">Revenue Report</span>
            <span className="text-sm text-gray-600">Platform fees & listing revenue</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-1 border-2 border-gray-200 bg-white py-4 text-left hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="font-medium text-gray-900">Payout Report</span>
            <span className="text-sm text-gray-600">Creator & company payments</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-1 border-2 border-gray-200 bg-white py-4 text-left hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="font-medium text-gray-900">Outstanding Balances</span>
            <span className="text-sm text-gray-600">Pending & scheduled payments</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

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
