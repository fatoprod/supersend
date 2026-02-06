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
  writeBatch,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Contact, ContactFormData } from "../../types";

function contactsRef(userId: string) {
  return collection(db, "users", userId, "contacts");
}

export async function getContacts(userId: string): Promise<Contact[]> {
  const q = query(contactsRef(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contact[];
}

export async function getContact(userId: string, contactId: string): Promise<Contact | null> {
  const docRef = doc(db, "users", userId, "contacts", contactId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Contact;
}

export async function createContact(userId: string, data: ContactFormData): Promise<string> {
  const docRef = await addDoc(contactsRef(userId), {
    email: data.email,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    company: data.company || "",
    tags: data.tags || [],
    customFields: data.customFields || {},
    unsubscribed: false,
    bounced: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContact(
  userId: string,
  contactId: string,
  data: Partial<ContactFormData>
): Promise<void> {
  const docRef = doc(db, "users", userId, "contacts", contactId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContact(userId: string, contactId: string): Promise<void> {
  const docRef = doc(db, "users", userId, "contacts", contactId);
  await deleteDoc(docRef);
}

export async function deleteContacts(userId: string, contactIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const id of contactIds) {
    batch.delete(doc(db, "users", userId, "contacts", id));
  }
  await batch.commit();
}

export async function importContacts(
  userId: string,
  contacts: ContactFormData[]
): Promise<{ imported: number; skipped: number }> {
  // Get existing emails to avoid duplicates
  const existing = await getContacts(userId);
  const existingEmails = new Set(existing.map((c) => c.email.toLowerCase()));

  const batch = writeBatch(db);
  let imported = 0;
  let skipped = 0;

  for (const contact of contacts) {
    if (existingEmails.has(contact.email.toLowerCase())) {
      skipped++;
      continue;
    }

    const docRef = doc(contactsRef(userId));
    batch.set(docRef, {
      email: contact.email,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      company: contact.company || "",
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      unsubscribed: false,
      bounced: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    imported++;

    // Firestore batch limit is 500
    if (imported % 450 === 0) {
      await batch.commit();
    }
  }

  if (imported % 450 !== 0) {
    await batch.commit();
  }

  return { imported, skipped };
}

export async function searchContacts(userId: string, searchTerm: string): Promise<Contact[]> {
  // Firestore doesn't support full-text search natively
  // We fetch all and filter client-side for now
  const contacts = await getContacts(userId);
  const term = searchTerm.toLowerCase();
  return contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(term) ||
      (c.firstName?.toLowerCase() || "").includes(term) ||
      (c.lastName?.toLowerCase() || "").includes(term) ||
      (c.company?.toLowerCase() || "").includes(term)
  );
}

export async function getContactsByTag(userId: string, tag: string): Promise<Contact[]> {
  const q = query(contactsRef(userId), where("tags", "array-contains", tag));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contact[];
}
