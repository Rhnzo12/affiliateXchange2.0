import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['creator', 'company', 'admin']);
export const userAccountStatusEnum = pgEnum('user_account_status', ['active', 'suspended', 'banned']);
export const companyStatusEnum = pgEnum('company_status', ['pending', 'approved', 'rejected']);
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'pending_review', 'approved', 'paused', 'archived']);
export const commissionTypeEnum = pgEnum('commission_type', ['per_sale', 'per_lead', 'per_click', 'monthly_retainer', 'hybrid']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'active', 'completed', 'rejected']);
export const payoutMethodEnum = pgEnum('payout_method', ['etransfer', 'wire', 'paypal', 'crypto']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const retainerStatusEnum = pgEnum('retainer_status', ['open', 'in_progress', 'completed', 'cancelled', 'paused']);
export const retainerApplicationStatusEnum = pgEnum('retainer_application_status', ['pending', 'approved', 'rejected']);
export const deliverableStatusEnum = pgEnum('deliverable_status', ['pending_review', 'approved', 'revision_requested', 'rejected']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'application_status_change',
  'new_message',
  'payment_received',
  'offer_approved',
  'offer_rejected',
  'new_application',
  'review_received',
  'system_announcement',
  'registration_approved',
  'registration_rejected',
  'work_completion_approval',
  'priority_listing_expiring'
]);

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  googleId: varchar("google_id").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('creator'),
  accountStatus: userAccountStatusEnum("account_status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [users.id],
    references: [creatorProfiles.userId],
  }),
  companyProfile: one(companyProfiles, {
    fields: [users.id],
    references: [companyProfiles.userId],
  }),
  applications: many(applications),
  messages: many(messages),
  reviews: many(reviews),
  favorites: many(favorites),
}));

// Creator profiles
export const creatorProfiles = pgTable("creator_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  bio: text("bio"),
  youtubeUrl: varchar("youtube_url"),
  tiktokUrl: varchar("tiktok_url"),
  instagramUrl: varchar("instagram_url"),
  youtubeFollowers: integer("youtube_followers"),
  tiktokFollowers: integer("tiktok_followers"),
  instagramFollowers: integer("instagram_followers"),
  niches: text("niches").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creatorProfilesRelations = relations(creatorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [creatorProfiles.userId],
    references: [users.id],
  }),
}));

// Company profiles
export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  legalName: varchar("legal_name").notNull(),
  tradeName: varchar("trade_name"),
  industry: varchar("industry"),
  websiteUrl: varchar("website_url"),
  companySize: varchar("company_size"),
  yearFounded: integer("year_founded"),
  logoUrl: varchar("logo_url"),
  description: text("description"),
  contactName: varchar("contact_name"),
  contactJobTitle: varchar("contact_job_title"),
  phoneNumber: varchar("phone_number"),
  businessAddress: text("business_address"),
  verificationDocumentUrl: varchar("verification_document_url"),
  status: companyStatusEnum("status").notNull().default('pending'),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyProfilesRelations = relations(companyProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [companyProfiles.userId],
    references: [users.id],
  }),
  offers: many(offers),
}));

// Offers
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 100 }).notNull(),
  productName: varchar("product_name").notNull(),
  shortDescription: varchar("short_description", { length: 200 }).notNull(),
  fullDescription: text("full_description").notNull(),
  primaryNiche: varchar("primary_niche").notNull(),
  additionalNiches: text("additional_niches").array().default(sql`ARRAY[]::text[]`),
  productUrl: varchar("product_url").notNull(),
  featuredImageUrl: varchar("featured_image_url"),
  commissionType: commissionTypeEnum("commission_type").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }),
  cookieDuration: integer("cookie_duration"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  minimumPayout: decimal("minimum_payout", { precision: 10, scale: 2 }),
  retainerAmount: decimal("retainer_amount", { precision: 10, scale: 2 }),
  retainerDeliverables: jsonb("retainer_deliverables"),
  paymentSchedule: varchar("payment_schedule"),
  minimumFollowers: integer("minimum_followers"),
  allowedPlatforms: text("allowed_platforms").array().default(sql`ARRAY[]::text[]`),
  geographicRestrictions: text("geographic_restrictions").array().default(sql`ARRAY[]::text[]`),
  ageRestriction: varchar("age_restriction"),
  contentStyleRequirements: text("content_style_requirements"),
  brandSafetyRequirements: text("brand_safety_requirements"),
  customTerms: text("custom_terms"),
  status: offerStatusEnum("status").notNull().default('pending_review'),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const offersRelations = relations(offers, ({ one, many }) => ({
  company: one(companyProfiles, {
    fields: [offers.companyId],
    references: [companyProfiles.id],
  }),
  applications: many(applications),
  videos: many(offerVideos),
  favorites: many(favorites),
}));

// Offer Videos
export const offerVideos = pgTable("offer_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 100 }).notNull(),
  description: varchar("description", { length: 300 }),
  creatorCredit: varchar("creator_credit"),
  originalPlatform: varchar("original_platform"),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  isPrimary: boolean("is_primary").default(false),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offerVideosRelations = relations(offerVideos, ({ one }) => ({
  offer: one(offers, {
    fields: [offerVideos.offerId],
    references: [offers.id],
  }),
}));

// Applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  message: text("message"),
  status: applicationStatusEnum("status").notNull().default('pending'),
  trackingLink: varchar("tracking_link"),
  trackingCode: varchar("tracking_code"),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  autoApprovalScheduledAt: timestamp("auto_approval_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  creator: one(users, {
    fields: [applications.creatorId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [applications.offerId],
    references: [offers.id],
  }),
  reviews: many(reviews),
  analytics: many(analytics),
}));

// Conversations
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp("last_message_at"),
  creatorUnreadCount: integer("creator_unread_count").default(0),
  companyUnreadCount: integer("company_unread_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  application: one(applications, {
    fields: [conversations.applicationId],
    references: [applications.id],
  }),
  creator: one(users, {
    fields: [conversations.creatorId],
    references: [users.id],
  }),
  company: one(companyProfiles, {
    fields: [conversations.companyId],
    references: [companyProfiles.id],
  }),
  messages: many(messages),
}));

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  reviewText: text("review_text"),
  overallRating: integer("overall_rating").notNull(),
  paymentSpeedRating: integer("payment_speed_rating"),
  communicationRating: integer("communication_rating"),
  offerQualityRating: integer("offer_quality_rating"),
  supportRating: integer("support_rating"),
  companyResponse: text("company_response"),
  companyRespondedAt: timestamp("company_responded_at"),
  isEdited: boolean("is_edited").default(false),
  adminNote: text("admin_note"),
  isApproved: boolean("is_approved").default(true),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  application: one(applications, {
    fields: [reviews.applicationId],
    references: [applications.id],
  }),
  creator: one(users, {
    fields: [reviews.creatorId],
    references: [users.id],
  }),
  company: one(companyProfiles, {
    fields: [reviews.companyId],
    references: [companyProfiles.id],
  }),
}));

// Favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favoritesRelations = relations(favorites, ({ one }) => ({
  creator: one(users, {
    fields: [favorites.creatorId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [favorites.offerId],
    references: [offers.id],
  }),
}));

// Analytics
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  clicks: integer("clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  conversions: integer("conversions").default(0),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default('0'),
  earningsPaid: decimal("earnings_paid", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analyticsRelations = relations(analytics, ({ one }) => ({
  application: one(applications, {
    fields: [analytics.applicationId],
    references: [applications.id],
  }),
}));

// Click Events
export const clickEvents = pgTable("click_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar("ip_address").notNull(),
  userAgent: text("user_agent"),
  referer: text("referer"),
  country: varchar("country"),
  city: varchar("city"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  application: one(applications, {
    fields: [clickEvents.applicationId],
    references: [applications.id],
  }),
}));

// Payment Settings
export const paymentSettings = pgTable("payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  payoutMethod: payoutMethodEnum("payout_method").notNull(),
  payoutEmail: varchar("payout_email"),
  bankRoutingNumber: varchar("bank_routing_number"),
  bankAccountNumber: varchar("bank_account_number"),
  paypalEmail: varchar("paypal_email"),
  cryptoWalletAddress: varchar("crypto_wallet_address"),
  cryptoNetwork: varchar("crypto_network"),
  taxInformation: jsonb("tax_information"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentSettingsRelations = relations(paymentSettings, ({ one }) => ({
  user: one(users, {
    fields: [paymentSettings.userId],
    references: [users.id],
  }),
}));

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(),
  stripeFeeAmount: decimal("stripe_fee_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  status: paymentStatusEnum("status").notNull().default('pending'),
  paymentMethod: varchar("payment_method"),
  description: text("description"),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  application: one(applications, {
    fields: [payments.applicationId],
    references: [applications.id],
  }),
  creator: one(users, {
    fields: [payments.creatorId],
    references: [users.id],
  }),
  company: one(companyProfiles, {
    fields: [payments.companyId],
    references: [companyProfiles.id],
  }),
  offer: one(offers, {
    fields: [payments.offerId],
    references: [offers.id],
  }),
}));

// Retainer Contracts
export const retainerContracts = pgTable("retainer_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  monthlyAmount: decimal("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  videosPerMonth: integer("videos_per_month").notNull(),
  durationMonths: integer("duration_months").notNull(),
  requiredPlatform: varchar("required_platform").notNull(),
  platformAccountDetails: text("platform_account_details"),
  contentGuidelines: text("content_guidelines"),
  brandSafetyRequirements: text("brand_safety_requirements"),
  minimumFollowers: integer("minimum_followers"),
  niches: text("niches").array().default(sql`ARRAY[]::text[]`),
  status: retainerStatusEnum("status").notNull().default('open'),
  assignedCreatorId: varchar("assigned_creator_id").references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerContractsRelations = relations(retainerContracts, ({ one, many }) => ({
  company: one(companyProfiles, {
    fields: [retainerContracts.companyId],
    references: [companyProfiles.id],
  }),
  assignedCreator: one(users, {
    fields: [retainerContracts.assignedCreatorId],
    references: [users.id],
  }),
  applications: many(retainerApplications),
  deliverables: many(retainerDeliverables),
}));

// Retainer Applications
export const retainerApplications = pgTable("retainer_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  portfolioLinks: text("portfolio_links").array().default(sql`ARRAY[]::text[]`),
  proposedStartDate: timestamp("proposed_start_date"),
  status: retainerApplicationStatusEnum("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerApplicationsRelations = relations(retainerApplications, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerApplications.contractId],
    references: [retainerContracts.id],
  }),
  creator: one(users, {
    fields: [retainerApplications.creatorId],
    references: [users.id],
  }),
}));

// Retainer Deliverables
export const retainerDeliverables = pgTable("retainer_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  monthNumber: integer("month_number").notNull(),
  videoNumber: integer("video_number").notNull(),
  videoUrl: varchar("video_url").notNull(),
  platformUrl: varchar("platform_url"),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  viewCount: integer("view_count"),
  engagement: jsonb("engagement"),
  status: deliverableStatusEnum("status").notNull().default('pending_review'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retainerDeliverablesRelations = relations(retainerDeliverables, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerDeliverables.contractId],
    references: [retainerContracts.id],
  }),
  creator: one(users, {
    fields: [retainerDeliverables.creatorId],
    references: [users.id],
  }),
}));

export const retainerPayments = pgTable("retainer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  deliverableId: varchar("deliverable_id").notNull().references(() => retainerDeliverables.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default('pending'),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerPaymentsRelations = relations(retainerPayments, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerPayments.contractId],
    references: [retainerContracts.id],
  }),
  deliverable: one(retainerDeliverables, {
    fields: [retainerPayments.deliverableId],
    references: [retainerDeliverables.id],
  }),
  creator: one(users, {
    fields: [retainerPayments.creatorId],
    references: [users.id],
  }),
  company: one(companyProfiles, {
    fields: [retainerPayments.companyId],
    references: [companyProfiles.id],
  }),
}));

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updater: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  linkUrl: varchar("link_url"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// User Notification Preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  inAppNotifications: boolean("in_app_notifications").notNull().default(true),
  emailApplicationStatus: boolean("email_application_status").notNull().default(true),
  emailNewMessage: boolean("email_new_message").notNull().default(true),
  emailPayment: boolean("email_payment").notNull().default(true),
  emailOffer: boolean("email_offer").notNull().default(true),
  emailReview: boolean("email_review").notNull().default(true),
  emailSystem: boolean("email_system").notNull().default(true),
  pushApplicationStatus: boolean("push_application_status").notNull().default(true),
  pushNewMessage: boolean("push_new_message").notNull().default(true),
  pushPayment: boolean("push_payment").notNull().default(true),
  pushSubscription: jsonb("push_subscription"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id],
  }),
}));

// Type exports for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreatorProfileSchema = createInsertSchema(creatorProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true, approvedAt: true });
export const createOfferSchema = createInsertSchema(offers).omit({ id: true, companyId: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true, approvedAt: true, status: true });
export const insertOfferVideoSchema = createInsertSchema(offerVideos).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true, trackingLink: true, trackingCode: true, autoApprovalScheduledAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, updatedAt: true, companyResponse: true, companyRespondedAt: true, isEdited: true, adminNote: true, isApproved: true, approvedBy: true, approvedAt: true, isHidden: true });
export const adminReviewUpdateSchema = createInsertSchema(reviews).pick({ reviewText: true, overallRating: true, paymentSpeedRating: true, communicationRating: true, offerQualityRating: true, supportRating: true }).partial();
export const adminNoteSchema = z.object({ note: z.string() });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true, initiatedAt: true, completedAt: true, failedAt: true, refundedAt: true });
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRetainerContractSchema = createInsertSchema(retainerContracts).omit({ id: true, createdAt: true, updatedAt: true, assignedCreatorId: true, startDate: true, endDate: true });
export const createRetainerContractSchema = createInsertSchema(retainerContracts).omit({ id: true, companyId: true, createdAt: true, updatedAt: true, assignedCreatorId: true, startDate: true, endDate: true, status: true });
export const insertRetainerApplicationSchema = createInsertSchema(retainerApplications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRetainerDeliverableSchema = createInsertSchema(retainerDeliverables).omit({ id: true, createdAt: true, submittedAt: true, reviewedAt: true });
export const insertRetainerPaymentSchema = createInsertSchema(retainerPayments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type OfferVideo = typeof offerVideos.$inferSelect;
export type InsertOfferVideo = z.infer<typeof insertOfferVideoSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertPaymentSetting = z.infer<typeof insertPaymentSettingSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type RetainerContract = typeof retainerContracts.$inferSelect;
export type InsertRetainerContract = z.infer<typeof insertRetainerContractSchema>;
export type RetainerApplication = typeof retainerApplications.$inferSelect;
export type InsertRetainerApplication = z.infer<typeof insertRetainerApplicationSchema>;
export type RetainerDeliverable = typeof retainerDeliverables.$inferSelect;
export type InsertRetainerDeliverable = z.infer<typeof insertRetainerDeliverableSchema>;
export type RetainerPayment = typeof retainerPayments.$inferSelect;
export type InsertRetainerPayment = z.infer<typeof insertRetainerPaymentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;