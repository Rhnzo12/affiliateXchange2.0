import { randomUUID } from "crypto";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import * as geoip from "geoip-lite";
import {
  users,
  creatorProfiles,
  companyProfiles,
  offers,
  offerVideos,
  applications,
  conversations,
  messages,
  reviews,
  favorites,
  analytics,
  clickEvents,
  paymentSettings,
  payments,
  retainerContracts,
  retainerApplications,
  retainerDeliverables,
  notifications,
  userNotificationPreferences,
  type User,
  type UpsertUser,
  type InsertUser,
  type CreatorProfile,
  type InsertCreatorProfile,
  type CompanyProfile,
  type InsertCompanyProfile,
  type Offer,
  type InsertOffer,
  type OfferVideo,
  type InsertOfferVideo,
  type Application,
  type InsertApplication,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Favorite,
  type InsertFavorite,
  type Analytics,
  type PaymentSetting,
  type InsertPaymentSetting,
  type Payment,
  type InsertPayment,
  type RetainerContract,
  type InsertRetainerContract,
  type RetainerApplication,
  type InsertRetainerApplication,
  type RetainerDeliverable,
  type InsertRetainerDeliverable,
  type Notification,
  type InsertNotification,
  type UserNotificationPreferences,
  type InsertUserNotificationPreferences,
} from "@shared/schema";

function isMissingRelationError(error: unknown, relation: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as { code?: string; message?: unknown };

  if (typeof code === "string" && code === "42P01") {
    return true;
  }

  if (typeof message === "string") {
    const normalized = message.toLowerCase();
    const target = relation.toLowerCase();

    if (normalized.includes(`relation "${target}" does not exist`)) {
      return true;
    }

    const match = normalized.match(/relation "([^"\\]+)" does not exist/);
    if (match) {
      const relationName = match[1];
      if (relationName === target || relationName.endsWith(`.${target}`)) {
        return true;
      }
    }
  }

  return false;
}

function coerceCount(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function buildEphemeralNotification(notification: InsertNotification): Notification {
  const now = new Date();
  const partial = notification as Partial<Notification>;

  const isRead = partial.isRead ?? false;
  const readAt = isRead ? partial.readAt ?? now : null;

  return {
    id: randomUUID(),
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    linkUrl: notification.linkUrl ?? null,
    metadata: notification.metadata ?? null,
    isRead,
    readAt,
    createdAt: now,
  };
}

function buildEphemeralReview(review: InsertReview): Review {
  const now = new Date();
  const partial = review as Partial<Review>;

  return {
    id: randomUUID(),
    applicationId: review.applicationId,
    creatorId: review.creatorId,
    companyId: review.companyId,
    reviewText: partial.reviewText ?? null,
    overallRating: review.overallRating,
    paymentSpeedRating: partial.paymentSpeedRating ?? null,
    communicationRating: partial.communicationRating ?? null,
    offerQualityRating: partial.offerQualityRating ?? null,
    supportRating: partial.supportRating ?? null,
    companyResponse: partial.companyResponse ?? null,
    companyRespondedAt: partial.companyRespondedAt ?? null,
    isEdited: partial.isEdited ?? false,
    adminNote: partial.adminNote ?? null,
    isApproved: partial.isApproved ?? true,
    approvedBy: partial.approvedBy ?? null,
    approvedAt: partial.approvedAt ?? null,
    isHidden: partial.isHidden ?? false,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

function buildDefaultNotificationPreferences(userId: string): UserNotificationPreferences {
  const now = new Date();

  return {
    id: randomUUID(),
    userId,
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    emailApplicationStatus: true,
    emailNewMessage: true,
    emailPayment: true,
    emailOffer: true,
    emailReview: true,
    emailSystem: true,
    pushApplicationStatus: true,
    pushNewMessage: true,
    pushPayment: true,
    pushSubscription: null,
    createdAt: now,
    updatedAt: now,
  };
}
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Creator Profiles
  getCreatorProfile(userId: string): Promise<CreatorProfile | undefined>;
  createCreatorProfile(profile: InsertCreatorProfile): Promise<CreatorProfile>;
  updateCreatorProfile(userId: string, updates: Partial<InsertCreatorProfile>): Promise<CreatorProfile | undefined>;

  // Company Profiles
  getCompanyProfile(userId: string): Promise<CompanyProfile | undefined>;
  getCompanyProfileById(id: string): Promise<CompanyProfile | undefined>;
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile | undefined>;
  getPendingCompanies(): Promise<CompanyProfile[]>;
  approveCompany(companyId: string): Promise<CompanyProfile | undefined>;
  rejectCompany(companyId: string, reason: string): Promise<CompanyProfile | undefined>;

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffers(filters?: any): Promise<Offer[]>;
  getOffersByCompany(companyId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<void>;
  getPendingOffers(): Promise<Offer[]>;
  approveOffer(offerId: string): Promise<Offer | undefined>;

  // Offer Videos
  getOfferVideos(offerId: string): Promise<OfferVideo[]>;
  createOfferVideo(video: InsertOfferVideo): Promise<OfferVideo>;
  deleteOfferVideo(id: string): Promise<void>;

  // Applications
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByTrackingCode(trackingCode: string): Promise<Application | undefined>;
  getApplicationsByCreator(creatorId: string): Promise<Application[]>;
  getApplicationsByOffer(offerId: string): Promise<Application[]>;
  getAllPendingApplications(): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined>;
  approveApplication(id: string, trackingLink: string, trackingCode: string): Promise<Application | undefined>;
  completeApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCompany(companyId: string): Promise<any[]>;

  // Messages & Conversations
  getConversation(id: string): Promise<any>;
  getConversationsByUser(userId: string, userRole: string, companyProfileId?: string | null): Promise<any[]>;
  createConversation(data: any): Promise<any>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  // Reviews
  getReviewsByCompany(companyId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined>;

  // Favorites
  getFavoritesByCreator(creatorId: string): Promise<Favorite[]>;
  isFavorite(creatorId: string, offerId: string): Promise<boolean>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(creatorId: string, offerId: string): Promise<void>;

  // Analytics
  getAnalyticsByCreator(creatorId: string): Promise<any>;
  getAnalyticsTimeSeriesByCreator(creatorId: string, dateRange: string): Promise<any[]>;
  getAnalyticsByApplication(applicationId: string): Promise<any[]>;
  logTrackingClick(applicationId: string, clickData: { ip: string; userAgent: string; referer: string; timestamp: Date }): Promise<void>;
  recordConversion(applicationId: string, saleAmount?: number): Promise<void>;

  // Payment Settings
  getPaymentSettings(userId: string): Promise<PaymentSetting[]>;
  createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting>;
  deletePaymentSetting(id: string): Promise<void>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByCreator(creatorId: string): Promise<Payment[]>;
  getPaymentsByCompany(companyId: string): Promise<Payment[]>;
  getAllPayments(): Promise<any[]>;
  updatePaymentStatus(id: string, status: string, updates?: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Retainer Contracts
  getRetainerContract(id: string): Promise<any>;
  getRetainerContracts(filters?: any): Promise<any[]>;
  getRetainerContractsByCompany(companyId: string): Promise<any[]>;
  getRetainerContractsByCreator(creatorId: string): Promise<any[]>;
  getOpenRetainerContracts(): Promise<any[]>;
  createRetainerContract(contract: any): Promise<any>;
  updateRetainerContract(id: string, updates: any): Promise<any>;
  deleteRetainerContract(id: string): Promise<void>;

  // Retainer Applications
  getRetainerApplication(id: string): Promise<any>;
  getRetainerApplicationsByContract(contractId: string): Promise<any[]>;
  getRetainerApplicationsByCreator(creatorId: string): Promise<any[]>;
  createRetainerApplication(application: any): Promise<any>;
  updateRetainerApplication(id: string, updates: any): Promise<any>;
  approveRetainerApplication(id: string, contractId: string, creatorId: string): Promise<any>;
  rejectRetainerApplication(id: string): Promise<any>;

  // Retainer Deliverables
  getRetainerDeliverable(id: string): Promise<any>;
  getRetainerDeliverablesByContract(contractId: string): Promise<any[]>;
  getRetainerDeliverablesByCreator(creatorId: string): Promise<any[]>;
  getRetainerDeliverablesForMonth(contractId: string, monthNumber: number): Promise<any[]>;
  createRetainerDeliverable(deliverable: any): Promise<any>;
  updateRetainerDeliverable(id: string, updates: any): Promise<any>;
  approveRetainerDeliverable(id: string, reviewNotes?: string): Promise<any>;
  rejectRetainerDeliverable(id: string, reviewNotes: string): Promise<any>;
  requestRevision(id: string, reviewNotes: string): Promise<any>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;

  // User Notification Preferences
  getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null>;
  createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
  updateUserNotificationPreferences(userId: string, updates: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences | undefined>;

  // Helper methods
  getUserById(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...user,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Creator Profiles
  async getCreatorProfile(userId: string): Promise<CreatorProfile | undefined> {
    const result = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async createCreatorProfile(profile: InsertCreatorProfile): Promise<CreatorProfile> {
    const result = await db.insert(creatorProfiles).values({
      ...profile,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateCreatorProfile(userId: string, updates: Partial<InsertCreatorProfile>): Promise<CreatorProfile | undefined> {
    const result = await db
      .update(creatorProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(creatorProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Company Profiles
  async getCompanyProfile(userId: string): Promise<CompanyProfile | undefined> {
    const result = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async getCompanyProfileById(id: string): Promise<CompanyProfile | undefined> {
    const result = await db.select().from(companyProfiles).where(eq(companyProfiles.id, id)).limit(1);
    return result[0];
  }

  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const result = await db.insert(companyProfiles).values({
      ...profile,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyProfiles.userId, userId))
      .returning();
    return result[0];
  }

  async getPendingCompanies(): Promise<CompanyProfile[]> {
    return await db.select().from(companyProfiles).where(eq(companyProfiles.status, 'pending')).orderBy(desc(companyProfiles.createdAt));
  }

  async approveCompany(companyId: string): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(companyProfiles.id, companyId))
      .returning();
    return result[0];
  }

  async rejectCompany(companyId: string, reason: string): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() })
      .where(eq(companyProfiles.id, companyId))
      .returning();
    return result[0];
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    return result[0];
  }

  async getOffers(filters?: any): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.status, 'approved')).orderBy(desc(offers.createdAt)).limit(100);
  }

  async getOffersByCompany(companyId: string): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.companyId, companyId)).orderBy(desc(offers.createdAt));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    // Generate UUID for the offer ID
    const offerId = randomUUID();
    
    // Generate slug from title
    const slug = offer.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Build commission_details JSONB (required in database)
    const commission_details: any = {
      type: offer.commissionType,
    };
    
    if (offer.commissionType === 'per_sale' && offer.commissionPercentage) {
      commission_details.percentage = offer.commissionPercentage;
    }
    
    if (offer.commissionType !== 'per_sale' && offer.commissionAmount) {
      commission_details.amount = offer.commissionAmount;
    }
    
    // Use raw SQL to insert with database-specific fields (slug, commission_details)
    const result = await db.execute(sql`
      INSERT INTO offers (
        id, company_id, title, slug, short_description, full_description,
        product_name, primary_niche, product_url, commission_type,
        commission_details, commission_percentage, commission_amount,
        status, created_at, updated_at, niches, requirements, featured_image_url,
        is_priority, view_count, application_count, active_creator_count
      ) VALUES (
        ${offerId},
        ${offer.companyId}::uuid,
        ${offer.title},
        ${slug},
        ${offer.shortDescription},
        ${offer.fullDescription},
        ${offer.productName},
        ${offer.primaryNiche},
        ${offer.productUrl},
        ${offer.commissionType},
        ${JSON.stringify(commission_details)}::jsonb,
        ${offer.commissionPercentage || null},
        ${offer.commissionAmount || null},
        ${offer.status || 'pending_review'},
        NOW(),
        NOW(),
        ARRAY[]::varchar[],
        '{}'::jsonb,
        NULL,
        false,
        0,
        0,
        0
      )
      RETURNING *
    `);
    
    return result.rows[0] as Offer;
  }

  async updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return result[0];
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  async getPendingOffers(): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.status, 'pending_review')).orderBy(desc(offers.createdAt));
  }

  async approveOffer(offerId: string): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning();
    return result[0];
  }

  // Offer Videos
  async getOfferVideos(offerId: string): Promise<OfferVideo[]> {
    return await db.select().from(offerVideos).where(eq(offerVideos.offerId, offerId)).orderBy(offerVideos.orderIndex);
  }

  async createOfferVideo(video: InsertOfferVideo): Promise<OfferVideo> {
    const result = await db.insert(offerVideos).values({
      ...video,
      id: randomUUID(),
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async deleteOfferVideo(id: string): Promise<void> {
    await db.delete(offerVideos).where(eq(offerVideos.id, id));
  }

  // Applications
  async getApplication(id: string): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0];
  }

  async getApplicationByTrackingCode(trackingCode: string): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.trackingCode, trackingCode)).limit(1);
    return result[0];
  }

  async getApplicationsByCreator(creatorId: string): Promise<Application[]> {
    try {
      const result = await db.select().from(applications).where(eq(applications.creatorId, creatorId)).orderBy(desc(applications.createdAt));
      return result || [];
    } catch (error) {
      console.error('[getApplicationsByCreator] Error:', error);
      return [];
    }
  }

  async getApplicationsByOffer(offerId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.offerId, offerId)).orderBy(desc(applications.createdAt));
  }

  async getAllPendingApplications(): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.status, 'pending')).orderBy(applications.autoApprovalScheduledAt);
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const autoApprovalTime = new Date();
    autoApprovalTime.setMinutes(autoApprovalTime.getMinutes() + 7); // Auto-approve after 7 minutes

    const result = await db.insert(applications).values({
      ...application,
      id: randomUUID(),
      autoApprovalScheduledAt: autoApprovalTime,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async approveApplication(id: string, trackingLink: string, trackingCode: string): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({
        status: 'approved',
        trackingLink,
        trackingCode,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async completeApplication(id: string): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async getApplicationsByCompany(companyId: string): Promise<any[]> {
    const result = await db
      .select({
        id: applications.id,
        offerId: applications.offerId,
        offerTitle: offers.title,
        creatorId: applications.creatorId,
        creatorName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        creatorEmail: users.email,
        message: applications.message,
        status: applications.status,
        trackingLink: applications.trackingLink,
        trackingCode: applications.trackingCode,
        approvedAt: applications.approvedAt,
        completedAt: applications.completedAt,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        // Include full creator data
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorProfileImageUrl: users.profileImageUrl,
        creatorBio: creatorProfiles.bio,
        creatorYoutubeUrl: creatorProfiles.youtubeUrl,
        creatorTiktokUrl: creatorProfiles.tiktokUrl,
        creatorInstagramUrl: creatorProfiles.instagramUrl,
        creatorNiches: creatorProfiles.niches,
        // Analytics aggregations
        clickCount: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`,
        uniqueClickCount: sql<number>`COALESCE(SUM(${analytics.uniqueClicks}), 0)`,
        conversionCount: sql<number>`COALESCE(SUM(${analytics.conversions}), 0)`,
        totalEarnings: sql<string>`COALESCE(SUM(${analytics.earnings}), 0)`,
      })
      .from(applications)
      .innerJoin(offers, eq(applications.offerId, offers.id))
      .innerJoin(users, eq(applications.creatorId, users.id))
      .leftJoin(creatorProfiles, eq(users.id, creatorProfiles.userId))
      .leftJoin(analytics, eq(applications.id, analytics.applicationId))
      .where(eq(offers.companyId, companyId))
      .groupBy(
        applications.id,
        offers.id,
        users.id,
        creatorProfiles.id
      )
      .orderBy(desc(applications.createdAt));

    // Transform the data to include a nested creator object
    return result.map(app => ({
      id: app.id,
      offerId: app.offerId,
      offerTitle: app.offerTitle,
      creatorId: app.creatorId,
      creatorName: app.creatorName,
      creatorEmail: app.creatorEmail,
      message: app.message,
      status: app.status,
      trackingLink: app.trackingLink,
      trackingCode: app.trackingCode,
      approvedAt: app.approvedAt,
      completedAt: app.completedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      clickCount: app.clickCount,
      conversionCount: app.conversionCount,
      totalEarnings: app.totalEarnings,
      creator: {
        id: app.creatorId,
        firstName: app.creatorFirstName,
        lastName: app.creatorLastName,
        email: app.creatorEmail,
        profileImageUrl: app.creatorProfileImageUrl,
        bio: app.creatorBio,
        youtubeUrl: app.creatorYoutubeUrl,
        tiktokUrl: app.creatorTiktokUrl,
        instagramUrl: app.creatorInstagramUrl,
        niches: app.creatorNiches,
      }
    }));
  }

  // Messages & Conversations
  async getConversation(id: string): Promise<any> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByUser(userId: string, userRole: string, companyProfileId: string | null = null): Promise<any[]> {
    // Build the where clause based on role
    const whereClause = userRole === 'company' && companyProfileId
      ? eq(conversations.companyId, companyProfileId)
      : eq(conversations.creatorId, userId);

    const result = await db
      .select({
        id: conversations.id,
        applicationId: conversations.applicationId,
        creatorId: conversations.creatorId,
        companyId: conversations.companyId,
        offerId: conversations.offerId,
        lastMessageAt: conversations.lastMessageAt,
        creatorUnreadCount: conversations.creatorUnreadCount,
        companyUnreadCount: conversations.companyUnreadCount,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        // Offer info
        offerTitle: offers.title,
        // Creator info
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorEmail: users.email,
        creatorProfileImageUrl: users.profileImageUrl,
        // Company info
        companyLegalName: companyProfiles.legalName,
        companyTradeName: companyProfiles.tradeName,
        companyLogoUrl: companyProfiles.logoUrl,
        companyUserId: companyProfiles.userId,
      })
      .from(conversations)
      .innerJoin(offers, eq(conversations.offerId, offers.id))
      .innerJoin(users, eq(conversations.creatorId, users.id))
      .innerJoin(companyProfiles, eq(conversations.companyId, companyProfiles.id))
      .where(whereClause)
      .orderBy(desc(conversations.lastMessageAt));

    // Transform to include otherUser field based on current user role
    return result.map(conv => ({
      id: conv.id,
      applicationId: conv.applicationId,
      creatorId: conv.creatorId,
      companyId: conv.companyId,
      offerId: conv.offerId,
      offerTitle: conv.offerTitle,
      lastMessageAt: conv.lastMessageAt,
      creatorUnreadCount: conv.creatorUnreadCount,
      companyUnreadCount: conv.companyUnreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      // Set otherUser based on who is viewing
      otherUser: userRole === 'company' ? {
        id: conv.creatorId,
        name: `${conv.creatorFirstName || ''} ${conv.creatorLastName || ''}`.trim() || conv.creatorEmail,
        firstName: conv.creatorFirstName,
        lastName: conv.creatorLastName,
        email: conv.creatorEmail,
        profileImageUrl: conv.creatorProfileImageUrl,
      } : {
        id: conv.companyUserId,
        name: conv.companyTradeName || conv.companyLegalName,
        legalName: conv.companyLegalName,
        tradeName: conv.companyTradeName,
        logoUrl: conv.companyLogoUrl,
      }
    }));
  }

  async createConversation(data: any): Promise<any> {
    const result = await db.insert(conversations).values({
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const result = await db.insert(messages).values(message).returning();

      // Update conversation's last message timestamp
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));

      return result[0];
    } catch (error) {
      console.error('[createMessage] Error:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const result = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
      return result || [];
    } catch (error) {
      console.error('[getMessages] Error:', error);
      return [];
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false)
        )
      );
  }

  // Reviews
  async getReviewsByCompany(companyId: string): Promise<Review[]> {
    try {
      return await db
        .select()
        .from(reviews)
        .where(eq(reviews.companyId, companyId))
        .orderBy(desc(reviews.createdAt));
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while fetching company reviews - returning empty array.");
        return [];
      }
      throw error;
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      const result = await db.insert(reviews).values({
        ...review,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while creating review - returning ephemeral review.");
        return buildEphemeralReview(review);
      }
      throw error;
    }
  }

  async updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined> {
    try {
      const result = await db
        .update(reviews)
        .set({ ...updates, isEdited: true, updatedAt: new Date() })
        .where(eq(reviews.id, id))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while updating review - treating as no-op.");
        return undefined;
      }
      throw error;
    }
  }

  async getAllReviews(): Promise<Review[]> {
    try {
      return await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while fetching all reviews - returning empty array.");
        return [];
      }
      throw error;
    }
  }

  async hideReview(id: string): Promise<Review | undefined> {
    try {
      const result = await db
        .update(reviews)
        .set({ isHidden: true, updatedAt: new Date() })
        .where(eq(reviews.id, id))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while hiding review - treating as no-op.");
        return undefined;
      }
      throw error;
    }
  }

  async deleteReview(id: string): Promise<void> {
    try {
      await db.delete(reviews).where(eq(reviews.id, id));
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while deleting review - skipping operation.");
        return;
      }
      throw error;
    }
  }

  async updateAdminNote(id: string, note: string, adminId: string): Promise<Review | undefined> {
    try {
      const result = await db
        .update(reviews)
        .set({
          adminNote: note,
          updatedAt: new Date()
        })
        .where(eq(reviews.id, id))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while updating admin note - treating as no-op.");
        return undefined;
      }
      throw error;
    }
  }

  async approveReview(id: string, adminId: string): Promise<Review | undefined> {
    try {
      const result = await db
        .update(reviews)
        .set({
          isApproved: true,
          isHidden: false,
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(reviews.id, id))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "reviews")) {
        console.warn("[Storage] reviews relation missing while approving review - treating as no-op.");
        return undefined;
      }
      throw error;
    }
  }

  // Favorites
  async getFavoritesByCreator(creatorId: string): Promise<Favorite[]> {
    try {
      const result = await db.select().from(favorites).where(eq(favorites.creatorId, creatorId));
      return result || [];
    } catch (error) {
      console.error('[getFavoritesByCreator] Error:', error);
      return [];
    }
  }

  async isFavorite(creatorId: string, offerId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.creatorId, creatorId), eq(favorites.offerId, offerId)))
      .limit(1);
    return result.length > 0;
  }

  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const result = await db.insert(favorites).values({
      ...favorite,
      id: randomUUID(),
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async deleteFavorite(creatorId: string, offerId: string): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.creatorId, creatorId), eq(favorites.offerId, offerId)));
  }

  // Analytics
  async getAnalyticsByCreator(creatorId: string): Promise<any> {
    try {
      const result = await db
        .select({
          totalEarnings: sql<number>`COALESCE(SUM(${analytics.earnings}), 0)`,
          totalClicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`,
          uniqueClicks: sql<number>`COALESCE(SUM(${analytics.uniqueClicks}), 0)`,
          conversions: sql<number>`COALESCE(SUM(${analytics.conversions}), 0)`,
        })
        .from(analytics)
        .innerJoin(applications, eq(analytics.applicationId, applications.id))
        .where(eq(applications.creatorId, creatorId));

      return result[0] || {
        totalEarnings: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        conversions: 0,
      };
    } catch (error) {
      console.error('[getAnalyticsByCreator] Error:', error);
      return {
        totalEarnings: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        conversions: 0,
      };
    }
  }

  async getAnalyticsTimeSeriesByCreator(creatorId: string, dateRange: string): Promise<any[]> {
    try {
      // Calculate date filter based on range
      let whereClauses: any[] = [eq(applications.creatorId, creatorId)];

      if (dateRange !== 'all') {
        let daysBack = 30;
        if (dateRange === '7d') daysBack = 7;
        else if (dateRange === '30d') daysBack = 30;
        else if (dateRange === '90d') daysBack = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        whereClauses.push(sql`${analytics.date} >= ${startDate}`);
      }

      const result = await db
        .select({
          date: sql<string>`TO_CHAR(${analytics.date}, 'Mon DD')`,
          clicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`,
        })
        .from(analytics)
        .innerJoin(applications, eq(analytics.applicationId, applications.id))
        .where(and(...whereClauses))
        .groupBy(analytics.date)
        .orderBy(analytics.date);

      return result || [];
    } catch (error) {
      console.error('[getAnalyticsTimeSeriesByCreator] Error:', error);
      return [];
    }
  }

  async getAnalyticsByApplication(applicationId: string): Promise<any[]> {
    return await db.select().from(analytics).where(eq(analytics.applicationId, applicationId)).orderBy(desc(analytics.date));
  }

  async logTrackingClick(applicationId: string, clickData: { ip: string; userAgent: string; referer: string; timestamp: Date }): Promise<void> {
    // Get application to find offerId and creatorId
    const application = await this.getApplication(applicationId);
    if (!application) {
      console.error('[Tracking] Application not found:', applicationId);
      return;
    }

    // Parse user agent for device type and browser (basic detection)
    const deviceType = clickData.userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                       clickData.userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop';
    const browser = clickData.userAgent.includes('Chrome') ? 'Chrome' :
                    clickData.userAgent.includes('Firefox') ? 'Firefox' :
                    clickData.userAgent.includes('Safari') ? 'Safari' : 'Other';

    // Geo-IP lookup
    const geo = geoip.lookup(clickData.ip);
    const country = geo?.country || 'Unknown';
    const city = geo?.city || 'Unknown';

    // Store individual click event with full metadata
    await db.insert(clickEvents).values({
      id: randomUUID(),
      applicationId,
      offerId: application.offerId,
      creatorId: application.creatorId,
      ipAddress: clickData.ip,
      userAgent: clickData.userAgent,
      referer: clickData.referer,
      country,
      city,
      timestamp: new Date(),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count unique IPs for today
    const uniqueIpsToday = await db
      .selectDistinct({ ipAddress: clickEvents.ipAddress })
      .from(clickEvents)
      .where(and(
        eq(clickEvents.applicationId, applicationId),
        sql`${clickEvents.timestamp}::date = ${today}::date`
      ));

    // Check if analytics record exists for today
    const existing = await db
      .select()
      .from(analytics)
      .where(and(
        eq(analytics.applicationId, applicationId),
        eq(analytics.date, today)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record - increment clicks and update unique count
      await db
        .update(analytics)
        .set({
          clicks: sql`${analytics.clicks} + 1`,
          uniqueClicks: uniqueIpsToday.length,
        })
        .where(eq(analytics.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(analytics).values({
        id: randomUUID(),
        applicationId,
        offerId: application.offerId,
        creatorId: application.creatorId,
        date: today,
        clicks: 1,
        uniqueClicks: uniqueIpsToday.length,
        conversions: 0,
        earnings: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[Tracking] Logged click for application ${applicationId} from ${city}, ${country} - IP: ${clickData.ip}`);
  }

  // Record Conversion and Calculate Earnings
  async recordConversion(applicationId: string, saleAmount?: number): Promise<void> {
    // Get application and offer details
    const application = await this.getApplication(applicationId);
    if (!application) {
      console.error('[Conversion] Application not found:', applicationId);
      return;
    }

    const offer = await this.getOffer(application.offerId);
    if (!offer) {
      console.error('[Conversion] Offer not found:', application.offerId);
      return;
    }

    // Calculate earnings based on commission type
    let earnings = 0;

    switch (offer.commissionType) {
      case 'per_sale':
        if (!saleAmount || !offer.commissionPercentage) {
          console.error('[Conversion] Sale amount required for per_sale commission');
          return;
        }
        earnings = (saleAmount * parseFloat(offer.commissionPercentage.toString())) / 100;
        break;

      case 'per_lead':
      case 'per_click':
        if (!offer.commissionAmount) {
          console.error('[Conversion] Commission amount not set');
          return;
        }
        earnings = parseFloat(offer.commissionAmount.toString());
        break;

      case 'monthly_retainer':
        // Retainer payments are handled separately via deliverable approval
        console.log('[Conversion] Retainer payments handled via deliverable approval');
        return;

      case 'hybrid':
        // For hybrid, use commission amount if set, otherwise percentage
        if (offer.commissionAmount) {
          earnings = parseFloat(offer.commissionAmount.toString());
        } else if (saleAmount && offer.commissionPercentage) {
          earnings = (saleAmount * parseFloat(offer.commissionPercentage.toString())) / 100;
        }
        break;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if analytics record exists for today
    const existing = await db
      .select()
      .from(analytics)
      .where(and(
        eq(analytics.applicationId, applicationId),
        eq(analytics.date, today)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record - increment conversions and add earnings
      await db
        .update(analytics)
        .set({
          conversions: sql`${analytics.conversions} + 1`,
          earnings: sql`${analytics.earnings} + ${earnings.toFixed(2)}`,
        })
        .where(eq(analytics.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(analytics).values({
        id: randomUUID(),
        applicationId,
        offerId: application.offerId,
        creatorId: application.creatorId,
        date: today,
        clicks: 0,
        uniqueClicks: 0,
        conversions: 1,
        earnings: earnings.toFixed(2),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create payment record for creator
    await this.createPayment({
      applicationId: applicationId,
      creatorId: application.creatorId,
      companyId: offer.companyId,
      offerId: application.offerId,
      grossAmount: earnings.toFixed(2),
      platformFeeAmount: '0',
      stripeFeeAmount: '0',
      netAmount: earnings.toFixed(2),
      status: 'pending',
      description: `Commission for ${offer.commissionType} conversion`,
    });

    console.log(`[Conversion] Recorded conversion for application ${applicationId} - Earnings: $${earnings.toFixed(2)}`);
  }

  // Payment Settings
  async getPaymentSettings(userId: string): Promise<PaymentSetting[]> {
    return await db.select().from(paymentSettings).where(eq(paymentSettings.userId, userId)).orderBy(desc(paymentSettings.createdAt));
  }

  async createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting> {
    const result = await db.insert(paymentSettings).values({
      ...setting,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async deletePaymentSetting(id: string): Promise<void> {
    await db.delete(paymentSettings).where(eq(paymentSettings.id, id));
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values({
      ...payment,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByCreator(creatorId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.creatorId, creatorId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByCompany(companyId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.companyId, companyId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<any[]> {
    // Simplified query - join details can be added later if needed
    return await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(id: string, status: string, updates?: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db
      .update(payments)
      .set({
        status: status as any,
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  // Retainer Contracts
  async getRetainerContract(id: string): Promise<any> {
    const result = await db
      .select()
      .from(retainerContracts)
      .leftJoin(companyProfiles, eq(retainerContracts.companyId, companyProfiles.id))
      .leftJoin(users, eq(companyProfiles.userId, users.id))
      .where(eq(retainerContracts.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].retainer_contracts,
      company: result[0].company_profiles,
      companyUser: result[0].users,
    };
  }

  async getRetainerContracts(filters?: any): Promise<any[]> {
    let query = db
      .select()
      .from(retainerContracts)
      .leftJoin(companyProfiles, eq(retainerContracts.companyId, companyProfiles.id))
      .leftJoin(users, eq(companyProfiles.userId, users.id));
    
    if (filters?.status) {
      query = query.where(eq(retainerContracts.status, filters.status)) as any;
    }
    
    const results = await query.orderBy(desc(retainerContracts.createdAt));
    
    return results.map((r: any) => ({
      ...r.retainer_contracts,
      company: r.company_profiles,
      companyUser: r.users,
    }));
  }

  async getRetainerContractsByCompany(companyId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerContracts)
      .where(eq(retainerContracts.companyId, companyId))
      .orderBy(desc(retainerContracts.createdAt));
    
    return results;
  }

  async getRetainerContractsByCreator(creatorId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerContracts)
      .leftJoin(companyProfiles, eq(retainerContracts.companyId, companyProfiles.id))
      .where(eq(retainerContracts.assignedCreatorId, creatorId))
      .orderBy(desc(retainerContracts.createdAt));
    
    return results.map((r: any) => ({
      ...r.retainer_contracts,
      company: r.company_profiles,
    }));
  }

  async getOpenRetainerContracts(): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerContracts)
      .leftJoin(companyProfiles, eq(retainerContracts.companyId, companyProfiles.id))
      .leftJoin(users, eq(companyProfiles.userId, users.id))
      .where(eq(retainerContracts.status, 'open'))
      .orderBy(desc(retainerContracts.createdAt));
    
    return results.map((r: any) => ({
      ...r.retainer_contracts,
      company: r.company_profiles,
      companyUser: r.users,
    }));
  }

  async createRetainerContract(contract: InsertRetainerContract): Promise<RetainerContract> {
    const result = await db.insert(retainerContracts).values({
      ...contract,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateRetainerContract(id: string, updates: Partial<InsertRetainerContract>): Promise<RetainerContract | undefined> {
    const result = await db
      .update(retainerContracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(retainerContracts.id, id))
      .returning();
    return result[0];
  }

  async deleteRetainerContract(id: string): Promise<void> {
    await db.delete(retainerContracts).where(eq(retainerContracts.id, id));
  }

  // Retainer Applications
  async getRetainerApplication(id: string): Promise<any> {
    const result = await db
      .select()
      .from(retainerApplications)
      .leftJoin(users, eq(retainerApplications.creatorId, users.id))
      .leftJoin(creatorProfiles, eq(users.id, creatorProfiles.userId))
      .leftJoin(retainerContracts, eq(retainerApplications.contractId, retainerContracts.id))
      .where(eq(retainerApplications.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].retainer_applications,
      creator: result[0].users,
      creatorProfile: result[0].creator_profiles,
      contract: result[0].retainer_contracts,
    };
  }

  async getRetainerApplicationsByContract(contractId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerApplications)
      .leftJoin(users, eq(retainerApplications.creatorId, users.id))
      .leftJoin(creatorProfiles, eq(users.id, creatorProfiles.userId))
      .where(eq(retainerApplications.contractId, contractId))
      .orderBy(desc(retainerApplications.createdAt));
    
    return results.map((r: any) => ({
      ...r.retainer_applications,
      creator: r.users,
      creatorProfile: r.creator_profiles,
    }));
  }

  async getRetainerApplicationsByCreator(creatorId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerApplications)
      .leftJoin(retainerContracts, eq(retainerApplications.contractId, retainerContracts.id))
      .leftJoin(companyProfiles, eq(retainerContracts.companyId, companyProfiles.id))
      .where(eq(retainerApplications.creatorId, creatorId))
      .orderBy(desc(retainerApplications.createdAt));
    
    return results.map((r: any) => ({
      ...r.retainer_applications,
      contract: r.retainer_contracts,
      company: r.company_profiles,
    }));
  }

  async createRetainerApplication(application: InsertRetainerApplication): Promise<RetainerApplication> {
    const result = await db.insert(retainerApplications).values({
      ...application,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateRetainerApplication(id: string, updates: Partial<InsertRetainerApplication>): Promise<RetainerApplication | undefined> {
    const result = await db
      .update(retainerApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(retainerApplications.id, id))
      .returning();
    return result[0];
  }

  async approveRetainerApplication(id: string, contractId: string, creatorId: string): Promise<RetainerApplication | undefined> {
    // Update application status to approved
    const appResult = await db
      .update(retainerApplications)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(retainerApplications.id, id))
      .returning();
    
    // Update contract to assign creator and change status to in_progress
    await db
      .update(retainerContracts)
      .set({
        assignedCreatorId: creatorId,
        status: 'in_progress',
        startDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(retainerContracts.id, contractId));
    
    return appResult[0];
  }

  async rejectRetainerApplication(id: string): Promise<RetainerApplication | undefined> {
    const result = await db
      .update(retainerApplications)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(retainerApplications.id, id))
      .returning();
    return result[0];
  }

  // Retainer Deliverables
  async getRetainerDeliverable(id: string): Promise<any> {
    const result = await db
      .select()
      .from(retainerDeliverables)
      .where(eq(retainerDeliverables.id, id))
      .limit(1);
    return result[0];
  }

  async getRetainerDeliverablesByContract(contractId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerDeliverables)
      .where(eq(retainerDeliverables.contractId, contractId))
      .orderBy(desc(retainerDeliverables.submittedAt));
    return results;
  }

  async getRetainerDeliverablesByCreator(creatorId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerDeliverables)
      .leftJoin(retainerContracts, eq(retainerDeliverables.contractId, retainerContracts.id))
      .where(eq(retainerDeliverables.creatorId, creatorId))
      .orderBy(desc(retainerDeliverables.submittedAt));
    
    return results.map((r: any) => ({
      ...r.retainer_deliverables,
      contract: r.retainer_contracts,
    }));
  }

  async getRetainerDeliverablesForMonth(contractId: string, monthNumber: number): Promise<any[]> {
    const results = await db
      .select()
      .from(retainerDeliverables)
      .where(
        and(
          eq(retainerDeliverables.contractId, contractId),
          eq(retainerDeliverables.monthNumber, monthNumber)
        )
      )
      .orderBy(retainerDeliverables.videoNumber);
    return results;
  }

  async createRetainerDeliverable(deliverable: InsertRetainerDeliverable): Promise<RetainerDeliverable> {
    const result = await db.insert(retainerDeliverables).values({
      ...deliverable,
      id: randomUUID(),
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateRetainerDeliverable(id: string, updates: Partial<InsertRetainerDeliverable>): Promise<RetainerDeliverable | undefined> {
    const result = await db
      .update(retainerDeliverables)
      .set(updates)
      .where(eq(retainerDeliverables.id, id))
      .returning();
    return result[0];
  }

  async approveRetainerDeliverable(id: string, reviewNotes?: string): Promise<RetainerDeliverable | undefined> {
    const result = await db
      .update(retainerDeliverables)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(retainerDeliverables.id, id))
      .returning();
    return result[0];
  }

  async rejectRetainerDeliverable(id: string, reviewNotes: string): Promise<RetainerDeliverable | undefined> {
    const result = await db
      .update(retainerDeliverables)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(retainerDeliverables.id, id))
      .returning();
    return result[0];
  }

  async requestRevision(id: string, reviewNotes: string): Promise<RetainerDeliverable | undefined> {
    const result = await db
      .update(retainerDeliverables)
      .set({
        status: 'revision_requested',
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(retainerDeliverables.id, id))
      .returning();
    return result[0];
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const result = await db.insert(notifications).values({
        ...notification,
        id: randomUUID(),
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while creating notification - returning ephemeral notification.");
        return buildEphemeralNotification(notification);
      }
      throw error;
    }
  }

  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const results = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return results;
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while fetching notifications - returning empty array.");
        return [];
      }
      throw error;
    }
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const results = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
      return results;
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while fetching unread notifications - returning empty array.");
        return [];
      }
      throw error;
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return coerceCount(result[0]?.count ?? 0);
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while counting unread notifications - returning 0.");
        return 0;
      }
      throw error;
    }
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    try {
      const result = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while marking notification as read - treating as already handled.");
        return undefined;
      }
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while marking all notifications as read - skipping operation.");
        return;
      }
      throw error;
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while deleting notification - skipping operation.");
        return;
      }
      throw error;
    }
  }

  async clearAllNotifications(userId: string): Promise<void> {
    try {
      await db.delete(notifications).where(eq(notifications.userId, userId));
    } catch (error) {
      if (isMissingRelationError(error, "notifications")) {
        console.warn("[Storage] notifications relation missing while clearing notifications - skipping operation.");
        return;
      }
      throw error;
    }
  }

  // User Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    try {
      const result = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, userId))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      if (isMissingRelationError(error, "user_notification_preferences")) {
        console.warn("[Storage] user_notification_preferences relation missing while fetching preferences - returning null.");
        return null;
      }
      throw error;
    }
  }

  async createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    try {
      const result = await db.insert(userNotificationPreferences).values({
        ...preferences,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "user_notification_preferences")) {
        console.warn("[Storage] user_notification_preferences relation missing while creating preferences - returning defaults.");
        return {
          ...buildDefaultNotificationPreferences(preferences.userId),
          ...preferences,
        };
      }
      throw error;
    }
  }

  async updateUserNotificationPreferences(userId: string, updates: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences | undefined> {
    try {
      const result = await db
        .update(userNotificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userNotificationPreferences.userId, userId))
        .returning();
      return result[0];
    } catch (error) {
      if (isMissingRelationError(error, "user_notification_preferences")) {
        console.warn("[Storage] user_notification_preferences relation missing while updating preferences - returning merged defaults.");
        return {
          ...buildDefaultNotificationPreferences(userId),
          ...updates,
          userId,
          updatedAt: new Date(),
        } as UserNotificationPreferences;
      }
      throw error;
    }
  }

  // Helper methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(users);
    return results;
  }
}

export const storage = new DatabaseStorage();