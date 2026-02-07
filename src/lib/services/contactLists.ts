import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Contact, ContactList, ContactListFormData, ContactFormData } from "../../types";

function listsRef(userId: string) {
  return collection(db, "users", userId, "contactLists");
}

function contactsInListRef(userId: string, listId: string) {
  return collection(db, "users", userId, "contactLists", listId, "contacts");
}

// Contact Lists CRUD
export async function getContactLists(userId: string): Promise<ContactList[]> {
  const q = query(listsRef(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ContactList[];
}

export async function getContactList(userId: string, listId: string): Promise<ContactList | null> {
  const docRef = doc(db, "users", userId, "contactLists", listId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as ContactList;
}

export async function createContactList(userId: string, data: ContactListFormData): Promise<string> {
  const docRef = await addDoc(listsRef(userId), {
    name: data.name,
    description: data.description || "",
    contactCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContactList(
  userId: string,
  listId: string,
  data: Partial<ContactListFormData>
): Promise<void> {
  const docRef = doc(db, "users", userId, "contactLists", listId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContactList(userId: string, listId: string): Promise<void> {
  // Delete all contacts in the list first
  const contactsSnapshot = await getDocs(contactsInListRef(userId, listId));
  const batch = writeBatch(db);
  
  contactsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  // Delete the list itself
  batch.delete(doc(db, "users", userId, "contactLists", listId));
  await batch.commit();
}

// Contacts within a List
export async function getContactsInList(userId: string, listId: string): Promise<Contact[]> {
  const q = query(contactsInListRef(userId, listId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contact[];
}

export async function getContactInList(
  userId: string,
  listId: string,
  contactId: string
): Promise<Contact | null> {
  const docRef = doc(db, "users", userId, "contactLists", listId, "contacts", contactId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Contact;
}

export async function createContactInList(
  userId: string,
  listId: string,
  data: ContactFormData
): Promise<string> {
  const batch = writeBatch(db);
  
  const contactRef = doc(contactsInListRef(userId, listId));
  batch.set(contactRef, {
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
  
  // Increment contact count on the list
  const listRef = doc(db, "users", userId, "contactLists", listId);
  batch.update(listRef, {
    contactCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
  return contactRef.id;
}

export async function updateContactInList(
  userId: string,
  listId: string,
  contactId: string,
  data: Partial<ContactFormData>
): Promise<void> {
  const docRef = doc(db, "users", userId, "contactLists", listId, "contacts", contactId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContactFromList(
  userId: string,
  listId: string,
  contactId: string
): Promise<void> {
  const batch = writeBatch(db);
  
  batch.delete(doc(db, "users", userId, "contactLists", listId, "contacts", contactId));
  
  // Decrement contact count
  const listRef = doc(db, "users", userId, "contactLists", listId);
  batch.update(listRef, {
    contactCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
}

export async function deleteContactsFromList(
  userId: string,
  listId: string,
  contactIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const id of contactIds) {
    batch.delete(doc(db, "users", userId, "contactLists", listId, "contacts", id));
  }
  
  // Decrement contact count
  const listRef = doc(db, "users", userId, "contactLists", listId);
  batch.update(listRef, {
    contactCount: increment(-contactIds.length),
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
}

export async function importContactsToList(
  userId: string,
  listId: string,
  contacts: ContactFormData[]
): Promise<{ imported: number; skipped: number }> {
  // Get existing emails to avoid duplicates
  const existing = await getContactsInList(userId, listId);
  const existingEmails = new Set(existing.map((c) => c.email.toLowerCase()));

  const batch = writeBatch(db);
  let imported = 0;
  let skipped = 0;

  for (const contact of contacts) {
    if (existingEmails.has(contact.email.toLowerCase())) {
      skipped++;
      continue;
    }

    const docRef = doc(contactsInListRef(userId, listId));
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
      // Update count before committing
      const listRef = doc(db, "users", userId, "contactLists", listId);
      batch.update(listRef, {
        contactCount: increment(imported),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }
  }

  if (imported > 0) {
    const listRef = doc(db, "users", userId, "contactLists", listId);
    batch.update(listRef, {
      contactCount: increment(imported % 450 || imported),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  return { imported, skipped };
}

export async function searchContactsInList(
  userId: string,
  listId: string,
  searchTerm: string
): Promise<Contact[]> {
  const contacts = await getContactsInList(userId, listId);
  const term = searchTerm.toLowerCase();
  return contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(term) ||
      (c.firstName?.toLowerCase() || "").includes(term) ||
      (c.lastName?.toLowerCase() || "").includes(term) ||
      (c.company?.toLowerCase() || "").includes(term)
  );
}

export async function searchContactLists(userId: string, searchTerm: string): Promise<ContactList[]> {
  const lists = await getContactLists(userId);
  const term = searchTerm.toLowerCase();
  return lists.filter((l) => l.name.toLowerCase().includes(term));
}
