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
} from "firebase/firestore";
import { db } from "../firebase";
import type { EmailTemplate, EmailTemplateFormData } from "../../types";

function templatesRef(userId: string) {
  return collection(db, "users", userId, "templates");
}

function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

export async function getTemplates(userId: string): Promise<EmailTemplate[]> {
  const q = query(templatesRef(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EmailTemplate[];
}

export async function getTemplate(
  userId: string,
  templateId: string
): Promise<EmailTemplate | null> {
  const docRef = doc(db, "users", userId, "templates", templateId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as EmailTemplate;
}

export async function createTemplate(
  userId: string,
  data: EmailTemplateFormData
): Promise<string> {
  const variables = extractVariables(data.html);
  const docRef = await addDoc(templatesRef(userId), {
    name: data.name,
    subject: data.subject,
    html: data.html,
    text: data.text || "",
    variables,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTemplate(
  userId: string,
  templateId: string,
  data: Partial<EmailTemplateFormData>
): Promise<void> {
  const docRef = doc(db, "users", userId, "templates", templateId);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.html) {
    updateData.variables = extractVariables(data.html);
  }

  await updateDoc(docRef, updateData);
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  const docRef = doc(db, "users", userId, "templates", templateId);
  await deleteDoc(docRef);
}

export async function duplicateTemplate(
  userId: string,
  templateId: string
): Promise<string> {
  const original = await getTemplate(userId, templateId);
  if (!original) throw new Error("Template not found");

  const docRef = await addDoc(templatesRef(userId), {
    name: `${original.name} (Copy)`,
    subject: original.subject,
    html: original.html,
    text: original.text || "",
    variables: original.variables,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
