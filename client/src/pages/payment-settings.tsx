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
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

type CreatorPayment = {
  id: string;
  offerId: string;
  companyId: string;
  grossAmount: string;
  platformFeeAmount: string;
  stripeFeeAmount: string;
  netAmount: string;
  status: PaymentStatus;
  paymentMethod?: string;
  description?: string;
  completedAt?: string;
  createdAt: string;
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

const statusConfig: Record<PaymentStatus, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "Pending" },
  processing: { bg: "bg-blue-100", text: "text-blue-800", icon: Clock, label: "Processing" },
  completed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: "Completed" },
  failed: { bg: "bg-red-100", text: "text-red-800", icon: XCircle, label: "Failed" },
  refunded: { bg: "bg-gray-100", text: "text-gray-800", icon: AlertTriangle, label: "Refunded" },
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

function CreatorOverview({ payments }: { payments: CreatorPayment[] }) {
  const totalEarnings = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.netAmount), 0);

  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "processing");
  const completedPayments = payments.filter((p) => p.status === "completed");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayments.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
            <p className="mt-1 text-sm text-gray-600">Track your earnings from completed campaigns</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No payment history yet</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{payment.description || `Payment ${payment.id.slice(0, 8)}`}</p>
                      <p className="text-sm text-gray-500">
                        {payment.completedAt
                          ? new Date(payment.completedAt).toLocaleDateString()
                          : new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>Gross: ${parseFloat(payment.grossAmount).toFixed(2)}</span>
                    <span>Platform Fee: ${parseFloat(payment.platformFeeAmount).toFixed(2)}</span>
                    <span>Processing: ${parseFloat(payment.stripeFeeAmount).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${parseFloat(payment.netAmount).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{payment.paymentMethod || "N/A"}</p>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
}: {
  paymentMethods?: PaymentMethod[];
  payoutMethod: string;
  setPayoutMethod: (value: string) => void;
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
}) {
  return (
    <div className="space-y-6">
      {/* Existing Payment Methods */}
      {paymentMethods && paymentMethods.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900">Saved Payment Methods</h3>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {method.payoutMethod === "etransfer" && "E-Transfer"}
                    {method.payoutMethod === "wire" && "Wire Transfer"}
                    {method.payoutMethod === "paypal" && "PayPal"}
                    {method.payoutMethod === "crypto" && "Cryptocurrency"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {method.payoutEmail || method.paypalEmail || method.cryptoWalletAddress || "Bank Account"}
                  </p>
                </div>
                {method.isDefault && <Badge>Default</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Payment Method */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Add Payment Method</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payout-method">Payout Method</Label>
            <Select value={payoutMethod} onValueChange={setPayoutMethod}>
              <SelectTrigger id="payout-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etransfer">E-Transfer</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payoutMethod === "etransfer" && (
            <div className="space-y-2">
              <Label htmlFor="payout-email">Email Address</Label>
              <Input
                id="payout-email"
                type="email"
                placeholder="your@email.com"
                value={payoutEmail}
                onChange={(e) => setPayoutEmail(e.target.value)}
              />
            </div>
          )}

          {payoutMethod === "wire" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="routing-number">Routing Number</Label>
                <Input
                  id="routing-number"
                  placeholder="123456789"
                  value={bankRoutingNumber}
                  onChange={(e) => setBankRoutingNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  placeholder="0000000000"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
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
                placeholder="paypal@email.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
          )}

          {payoutMethod === "crypto" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="crypto-wallet">Wallet Address</Label>
                <Input
                  id="crypto-wallet"
                  placeholder="0x..."
                  value={cryptoWalletAddress}
                  onChange={(e) => setCryptoWalletAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crypto-network">Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger id="crypto-network">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="bsc">BSC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button onClick={onAddPaymentMethod} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding..." : "Add Payment Method"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyPayoutApproval({ payouts }: { payouts: CreatorPayment[] }) {
  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "processing");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve creator payouts for completed work
          </p>
        </div>

        <div className="space-y-4">
          {pendingPayouts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No pending approvals</p>
            </div>
          ) : (
            pendingPayouts.map((payout) => (
              <div
                key={payout.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {payout.description || `Payment ${payout.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span>Amount: ${parseFloat(payout.grossAmount).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm">Approve</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyOverview({ payouts }: { payouts: CreatorPayment[] }) {
  const totalPaid = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.grossAmount), 0);

  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const completedPayouts = payouts.filter((p) => p.status === "completed");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Paid Out</p>
              <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayouts.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedPayouts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payout History</h3>
            <p className="mt-1 text-sm text-gray-600">Track payments to creators</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="space-y-4">
          {payouts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No payout history yet</p>
            </div>
          ) : (
            payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {payout.description || `Payment ${payout.id.slice(0, 8)}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {payout.completedAt
                      ? new Date(payout.completedAt).toLocaleDateString()
                      : new Date(payout.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ${parseFloat(payout.grossAmount).toFixed(2)}
                    </p>
                  </div>
                  <StatusBadge status={payout.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPaymentDashboard({
  creatorPayments,
  companyPayouts,
}: {
  creatorPayments: CreatorPayment[];
  companyPayouts: CreatorPayment[];
}) {
  const allPayments = [...creatorPayments, ...companyPayouts];
  const totalVolume = allPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.grossAmount), 0);

  const pendingCount = allPayments.filter((p) => p.status === "pending" || p.status === "processing").length;
  const completedCount = allPayments.filter((p) => p.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">${totalVolume.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{allPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Payments */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">All Platform Payments</h3>
            <p className="mt-1 text-sm text-gray-600">Monitor all transactions across the platform</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="space-y-4">
          {allPayments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No payment data available</p>
            </div>
          ) : (
            allPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {payment.description || `Payment ${payment.id.slice(0, 8)}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.completedAt
                      ? new Date(payment.completedAt).toLocaleDateString()
                      : new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>Gross: ${parseFloat(payment.grossAmount).toFixed(2)}</span>
                    <span>Net: ${parseFloat(payment.netAmount).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))
          )}
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

  // Fetch payment methods
  const { data: paymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-settings"],
    enabled: isAuthenticated,
  });

  // Fetch payments based on user role
  const { data: creatorPayments = [] } = useQuery<CreatorPayment[]>({
    queryKey: ["/api/payments/creator"],
    enabled: isAuthenticated && user?.role === "creator",
  });

  const { data: companyPayments = [] } = useQuery<CreatorPayment[]>({
    queryKey: ["/api/payments/company"],
    enabled: isAuthenticated && user?.role === "company",
  });

  const { data: allPayments = [] } = useQuery<CreatorPayment[]>({
    queryKey: ["/api/payments/all"],
    enabled: isAuthenticated && user?.role === "admin",
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
                  {companyPayments.filter((p) => p.status === "pending" || p.status === "processing").length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
                      {companyPayments.filter((p) => p.status === "pending" || p.status === "processing").length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            {activeTab === "overview" && <CompanyOverview payouts={companyPayments} />}
            {activeTab === "approvals" && <CompanyPayoutApproval payouts={companyPayments} />}
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
              <AdminPaymentDashboard creatorPayments={allPayments} companyPayouts={allPayments} />
            )}
            {activeTab === "settings" && <AdminPaymentSettings />}
          </>
        )}
      </div>
    </div>
  );
}
