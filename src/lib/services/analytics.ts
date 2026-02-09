import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { DashboardStats, Campaign, SentEmail } from "../../types";

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  // Get total contacts count from contactLists
  const listsSnapshot = await getDocs(
    collection(db, "users", userId, "contactLists")
  );
  let totalContacts = 0;
  listsSnapshot.docs.forEach((doc) => {
    totalContacts += doc.data().contactCount || 0;
  });

  // Get campaigns
  const campaignsSnapshot = await getDocs(
    collection(db, "users", userId, "campaigns")
  );
  const totalCampaigns = campaignsSnapshot.size;

  // Get sent emails
  const sentEmailsSnapshot = await getDocs(
    collection(db, "users", userId, "sentEmails")
  );
  const emailsSent = sentEmailsSnapshot.size;

  // Calculate emails this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startTimestamp = Timestamp.fromDate(startOfMonth);

  const thisMonthQuery = query(
    collection(db, "users", userId, "sentEmails"),
    where("sentAt", ">=", startTimestamp)
  );
  const thisMonthSnapshot = await getDocs(thisMonthQuery);
  const emailsThisMonth = thisMonthSnapshot.size;

  // Calculate rates from sent emails (using webhook data)
  let opened = 0;
  let clicked = 0;
  let delivered = 0;
  let bounced = 0;
  sentEmailsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.opened) opened++;
    if (data.clicked) clicked++;
    if (data.delivered) delivered++;
    if (data.status === "bounced") bounced++;
  });

  const openRate = emailsSent > 0 ? (opened / emailsSent) * 100 : 0;
  const clickRate = emailsSent > 0 ? (clicked / emailsSent) * 100 : 0;
  const deliveryRate = emailsSent > 0 ? (delivered / emailsSent) * 100 : 0;
  const bounceRate = emailsSent > 0 ? (bounced / emailsSent) * 100 : 0;

  return {
    totalContacts,
    totalCampaigns,
    emailsSent,
    emailsThisMonth,
    openRate: Math.round(openRate * 10) / 10,
    clickRate: Math.round(clickRate * 10) / 10,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    bounceRate: Math.round(bounceRate * 10) / 10,
  };
}

export async function getRecentCampaigns(userId: string): Promise<Campaign[]> {
  const q = query(
    collection(db, "users", userId, "campaigns"),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[];
}

export interface AnalyticsData {
  emailsSent: number;
  emailsSentChange: number;
  delivered: number;
  deliveryRate: number;
  deliveryRateChange: number;
  openRate: number;
  openRateChange: number;
  clickRate: number;
  clickRateChange: number;
  unsubscribeRate: number;
  unsubscribeRateChange: number;
  bounceRate: number;
  bounceRateChange: number;
  complainedRate: number;
  complainedRateChange: number;
  topCampaigns: Array<{
    name: string;
    sent: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }>;
  recipients?: Array<{
    to: string;
    status: string;
    delivered: boolean;
    opened: boolean;
    openCount: number;
    clicked: boolean;
    clickCount: number;
    lastClickedUrl?: string;
    complained: boolean;
    bounceSeverity?: string;
    sentAt: Timestamp;
  }>;
}

export async function getAnalyticsData(userId: string, campaignId?: string): Promise<AnalyticsData> {
  // Get sent emails (optionally filtered by campaign)
  const sentEmailsRef = collection(db, "users", userId, "sentEmails");
  const sentEmailsQuery = campaignId
    ? query(sentEmailsRef, where("campaignId", "==", campaignId))
    : sentEmailsRef;
  const sentEmailsSnapshot = await getDocs(sentEmailsQuery);
  const sentEmails = sentEmailsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SentEmail[];

  const totalSent = sentEmails.length;
  const totalOpened = sentEmails.filter((e) => e.opened).length;
  const totalClicked = sentEmails.filter((e) => e.clicked).length;
  const totalBounced = sentEmails.filter((e) => e.status === "bounced").length;
  const totalDelivered = sentEmails.filter((e) => e.delivered).length;
  const totalComplained = sentEmails.filter((e) => e.complained).length;

  // Get contacts for unsubscribe rate (iterate all contactLists)
  const listsSnapshot = await getDocs(
    collection(db, "users", userId, "contactLists")
  );
  let totalContacts = 0;
  let unsubscribed = 0;
  for (const listDoc of listsSnapshot.docs) {
    const contactsSnapshot = await getDocs(
      collection(db, "users", userId, "contactLists", listDoc.id, "contacts")
    );
    totalContacts += contactsSnapshot.size;
    contactsSnapshot.docs.forEach((doc) => {
      if (doc.data().unsubscribed) unsubscribed++;
    });
  }

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const complainedRate = totalSent > 0 ? (totalComplained / totalSent) * 100 : 0;
  const unsubscribeRate =
    totalContacts > 0 ? (unsubscribed / totalContacts) * 100 : 0;

  // Get top campaigns by sent count
  let topCampaigns: Array<{
    name: string;
    sent: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> = [];

  try {
    const campaignsSnapshot = await getDocs(
      query(
        collection(db, "users", userId, "campaigns"),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc"),
        limit(5)
      )
    );

    // Calculate stats from sentEmails (webhook data) instead of campaign.stats
    // If we already have sentEmails loaded (no campaign filter), use them directly
    // Otherwise fetch all sentEmails for accurate campaign-level stats
    const allSentEmails = campaignId
      ? (await getDocs(collection(db, "users", userId, "sentEmails"))).docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SentEmail[]
      : sentEmails;

    topCampaigns = campaignsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const campaignSentEmails = allSentEmails.filter((e) => e.campaignId === doc.id);
      const sent = campaignSentEmails.length;
      const opened = campaignSentEmails.filter((e) => e.opened).length;
      const clicked = campaignSentEmails.filter((e) => e.clicked).length;
      const bounced = campaignSentEmails.filter((e) => e.status === "bounced").length;
      return {
        name: data.name,
        sent,
        openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0,
      };
    });
  } catch (error) {
    console.warn("Failed to fetch top campaigns (index may be building):", error);
  }

  return {
    emailsSent: totalSent,
    emailsSentChange: 0, // Would need historical data to calculate
    delivered: totalDelivered,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    deliveryRateChange: 0,
    openRate: Math.round(openRate * 10) / 10,
    openRateChange: 0,
    clickRate: Math.round(clickRate * 10) / 10,
    clickRateChange: 0,
    unsubscribeRate: Math.round(unsubscribeRate * 10) / 10,
    unsubscribeRateChange: 0,
    bounceRate: Math.round(bounceRate * 10) / 10,
    bounceRateChange: 0,
    complainedRate: Math.round(complainedRate * 10) / 10,
    complainedRateChange: 0,
    topCampaigns,
    ...(campaignId ? {
      recipients: sentEmails.map((e) => ({
        to: e.to,
        status: e.status,
        delivered: !!e.delivered,
        opened: !!e.opened,
        openCount: e.openCount || 0,
        clicked: !!e.clicked,
        clickCount: e.clickCount || 0,
        lastClickedUrl: e.lastClickedUrl,
        complained: !!e.complained,
        bounceSeverity: e.bounceSeverity,
        sentAt: e.sentAt,
      })),
    } : {}),
  };
}
