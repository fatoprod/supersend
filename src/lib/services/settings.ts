import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";

export interface UserSettings {
  displayName?: string;
  photoURL?: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
  replyToEmail?: string;
  unsubscribeLinkText?: string;
  notifications?: {
    campaignCompleted: boolean;
    newSubscriber: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return {};
  const data = userDoc.data();
  return {
    displayName: data.displayName,
    photoURL: data.photoURL,
    defaultFromName: data.defaultFromName,
    defaultFromEmail: data.defaultFromEmail,
    replyToEmail: data.replyToEmail,
    unsubscribeLinkText: data.unsubscribeLinkText,
    notifications: data.notifications,
  };
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not authenticated");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
