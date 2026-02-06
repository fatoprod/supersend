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
  // Get total contacts count
  const contactsSnapshot = await getDocs(
    collection(db, "users", userId, "contacts")
  );
  const totalContacts = contactsSnapshot.size;

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

  // Calculate open/click rates from sent emails
  let opened = 0;
  let clicked = 0;
  sentEmailsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.opened) opened++;
    if (data.clicked) clicked++;
  });

  const openRate = emailsSent > 0 ? (opened / emailsSent) * 100 : 0;
  const clickRate = emailsSent > 0 ? (clicked / emailsSent) * 100 : 0;

  return {
    totalContacts,
    totalCampaigns,
    emailsSent,
    emailsThisMonth,
    openRate: Math.round(openRate * 10) / 10,
    clickRate: Math.round(clickRate * 10) / 10,
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
  openRate: number;
  openRateChange: number;
  clickRate: number;
  clickRateChange: number;
  unsubscribeRate: number;
  unsubscribeRateChange: number;
  bounceRate: number;
  bounceRateChange: number;
  topCampaigns: Array<{
    name: string;
    sent: number;
    openRate: number;
    clickRate: number;
  }>;
}

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  // Get all sent emails
  const sentEmailsSnapshot = await getDocs(
    collection(db, "users", userId, "sentEmails")
  );
  const sentEmails = sentEmailsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SentEmail[];

  const totalSent = sentEmails.filter((e) => e.status === "sent").length;
  const totalOpened = sentEmails.filter((e) => e.opened).length;
  const totalClicked = sentEmails.filter((e) => e.clicked).length;
  const totalBounced = sentEmails.filter((e) => e.status === "bounced").length;

  // Get contacts for unsubscribe rate
  const contactsSnapshot = await getDocs(
    collection(db, "users", userId, "contacts")
  );
  const totalContacts = contactsSnapshot.size;
  const unsubscribed = contactsSnapshot.docs.filter(
    (doc) => doc.data().unsubscribed
  ).length;

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const unsubscribeRate =
    totalContacts > 0 ? (unsubscribed / totalContacts) * 100 : 0;

  // Get top campaigns by sent count
  const campaignsSnapshot = await getDocs(
    query(
      collection(db, "users", userId, "campaigns"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
      limit(5)
    )
  );

  const topCampaigns = campaignsSnapshot.docs.map((doc) => {
    const data = doc.data();
    const stats = data.stats || { sent: 0 };
    return {
      name: data.name,
      sent: stats.sent || 0,
      openRate:
        stats.sent > 0 ? Math.round(((stats.opened || 0) / stats.sent) * 1000) / 10 : 0,
      clickRate:
        stats.sent > 0 ? Math.round(((stats.clicked || 0) / stats.sent) * 1000) / 10 : 0,
    };
  });

  return {
    emailsSent: totalSent,
    emailsSentChange: 0, // Would need historical data to calculate
    openRate: Math.round(openRate * 10) / 10,
    openRateChange: 0,
    clickRate: Math.round(clickRate * 10) / 10,
    clickRateChange: 0,
    unsubscribeRate: Math.round(unsubscribeRate * 10) / 10,
    unsubscribeRateChange: 0,
    bounceRate: Math.round(bounceRate * 10) / 10,
    bounceRateChange: 0,
    topCampaigns,
  };
}
