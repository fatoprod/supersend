import * as admin from "firebase-admin";

/**
 * Lead payload received from SuperLeed.
 * Mirrors the relevant fields from SuperLeed's `Lead` type.
 */
export interface SuperLeedLeadInput {
  id?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  rating?: number | null;
  googleMapsUrl?: string;
  completenessScore?: number;
  cnpj?: string | null;
  cnpjData?: {
    razaoSocial?: string;
    nomeFantasia?: string;
  } | null;
}

export interface ImportSource {
  searchId?: string;
  query?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  withoutEmail: number;
  duplicates: number;
}

const FIRESTORE_BATCH_LIMIT = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build a Contact document from a SuperLeed Lead.
 */
function buildContactFromLead(
  lead: SuperLeedLeadInput,
  source: ImportSource | undefined
): Record<string, unknown> {
  const company =
    lead.cnpjData?.nomeFantasia ||
    lead.cnpjData?.razaoSocial ||
    lead.name ||
    "";

  const tags = ["superleed"];
  if (source?.query) {
    tags.push(`query:${source.query}`);
  }

  const customFields: Record<string, string> = {
    source: "superleed",
  };
  if (source?.searchId) customFields.searchId = source.searchId;
  if (lead.cnpj) customFields.cnpj = lead.cnpj;
  if (lead.phone) customFields.phone = lead.phone;
  if (lead.website) customFields.website = lead.website;
  if (lead.address) customFields.address = lead.address;
  if (lead.googleMapsUrl) customFields.googleMapsUrl = lead.googleMapsUrl;
  if (typeof lead.completenessScore === "number") {
    customFields.completenessScore = String(lead.completenessScore);
  }
  if (typeof lead.rating === "number") {
    customFields.rating = String(lead.rating);
  }

  return {
    email: (lead.email || "").trim().toLowerCase(),
    firstName: "",
    lastName: "",
    company,
    tags,
    customFields,
    unsubscribed: false,
    bounced: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Imports leads as contacts into a SuperSend contact list.
 *
 * - Filters leads without a valid email.
 * - Dedupes by email (case-insensitive) against existing contacts in the list.
 * - Writes in chunked batches (Firestore limit 500 ops/batch).
 * - Updates the list's contactCount via increment.
 */
export async function importLeadsToList(
  db: FirebaseFirestore.Firestore,
  uid: string,
  listId: string,
  leads: SuperLeedLeadInput[],
  source?: ImportSource
): Promise<ImportResult> {
  const listRef = db
    .collection("users")
    .doc(uid)
    .collection("contactLists")
    .doc(listId);

  const contactsRef = listRef.collection("contacts");

  // Filter to leads with a valid email
  const valid: { lead: SuperLeedLeadInput; email: string }[] = [];
  let withoutEmail = 0;
  for (const lead of leads) {
    const email = (lead.email || "").trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      withoutEmail++;
      continue;
    }
    valid.push({ lead, email });
  }

  // Dedupe within the incoming payload (keep first occurrence)
  const seen = new Set<string>();
  const deduped: { lead: SuperLeedLeadInput; email: string }[] = [];
  let payloadDuplicates = 0;
  for (const item of valid) {
    if (seen.has(item.email)) {
      payloadDuplicates++;
      continue;
    }
    seen.add(item.email);
    deduped.push(item);
  }

  if (deduped.length === 0) {
    return { imported: 0, skipped: withoutEmail + payloadDuplicates, withoutEmail, duplicates: payloadDuplicates };
  }

  // Load existing emails in the list
  const existingSnapshot = await contactsRef.select("email").get();
  const existingEmails = new Set<string>();
  existingSnapshot.forEach((doc) => {
    const e = (doc.get("email") || "").toString().trim().toLowerCase();
    if (e) existingEmails.add(e);
  });

  // Filter out already-existing contacts
  const toInsert = deduped.filter((item) => !existingEmails.has(item.email));
  const listDuplicates = deduped.length - toInsert.length;

  if (toInsert.length === 0) {
    return {
      imported: 0,
      skipped: withoutEmail + payloadDuplicates + listDuplicates,
      withoutEmail,
      duplicates: payloadDuplicates + listDuplicates,
    };
  }

  // Batched writes — leave 1 slot per batch for the list update
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += FIRESTORE_BATCH_LIMIT - 1) {
    const slice = toInsert.slice(i, i + FIRESTORE_BATCH_LIMIT - 1);
    const batch = db.batch();
    for (const item of slice) {
      const ref = contactsRef.doc();
      batch.set(ref, buildContactFromLead(item.lead, source));
    }
    batch.update(listRef, {
      contactCount: admin.firestore.FieldValue.increment(slice.length),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    imported += slice.length;
  }

  return {
    imported,
    skipped: withoutEmail + payloadDuplicates + listDuplicates,
    withoutEmail,
    duplicates: payloadDuplicates + listDuplicates,
  };
}
