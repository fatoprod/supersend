import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { Campaign, CampaignFormData } from "../../types";

function campaignsRef(userId: string) {
  return collection(db, "users", userId, "campaigns");
}

export async function getCampaigns(userId: string): Promise<Campaign[]> {
  const q = query(campaignsRef(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[];
}

export async function getCampaign(userId: string, campaignId: string): Promise<Campaign | null> {
  const docRef = doc(db, "users", userId, "campaigns", campaignId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Campaign;
}

export async function createCampaign(userId: string, data: CampaignFormData): Promise<string> {
  const docRef = await addDoc(campaignsRef(userId), {
    name: data.name,
    subject: data.subject,
    from: data.from || "noreply@supersend.app",
    replyTo: data.replyTo || null,
    html: data.html,
    text: data.text || "",
    recipients: data.recipients,
    recipientCount: data.recipients.length,
    status: data.scheduledAt ? "scheduled" : "draft",
    scheduledAt: data.scheduledAt ? Timestamp.fromDate(data.scheduledAt) : null,
    sentAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    stats: null,
    error: null,
  });
  return docRef.id;
}

export async function updateCampaign(
  userId: string,
  campaignId: string,
  data: Partial<CampaignFormData>
): Promise<void> {
  const docRef = doc(db, "users", userId, "campaigns", campaignId);
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  // Only include defined fields (Firestore rejects undefined)
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (data.scheduledAt) {
    updateData.scheduledAt = Timestamp.fromDate(data.scheduledAt);
  }

  if (data.recipients) {
    updateData.recipientCount = data.recipients.length;
  }

  await updateDoc(docRef, updateData);
}

export async function deleteCampaign(userId: string, campaignId: string): Promise<void> {
  const docRef = doc(db, "users", userId, "campaigns", campaignId);
  await deleteDoc(docRef);
}

export async function sendCampaign(campaignId: string): Promise<{ success: boolean }> {
  const processCampaign = httpsCallable<{ campaignId: string }, { success: boolean }>(
    functions,
    "processCampaign"
  );
  const result = await processCampaign({ campaignId });
  return result.data;
}

export async function pauseCampaign(userId: string, campaignId: string): Promise<void> {
  const docRef = doc(db, "users", userId, "campaigns", campaignId);
  await updateDoc(docRef, {
    status: "paused",
    updatedAt: serverTimestamp(),
  });
}

export async function duplicateCampaign(userId: string, campaignId: string): Promise<string> {
  const original = await getCampaign(userId, campaignId);
  if (!original) throw new Error("Campaign not found");

  const docRef = await addDoc(campaignsRef(userId), {
    name: `${original.name} (Copy)`,
    subject: original.subject,
    from: original.from,
    replyTo: original.replyTo || null,
    html: original.html,
    text: original.text || "",
    recipients: original.recipients,
    recipientCount: original.recipientCount,
    status: "draft",
    scheduledAt: null,
    sentAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    stats: null,
    error: null,
  });
  return docRef.id;
}
