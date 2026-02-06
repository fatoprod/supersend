import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  deleteContacts,
  importContacts,
} from "../lib/services/contacts";
import type { ContactFormData } from "../types";

export function useContacts() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["contacts", userId],
    queryFn: () => getContacts(userId!),
    enabled: !!userId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (data: ContactFormData) => createContact(user!.uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: Partial<ContactFormData> }) =>
      updateContact(user!.uid, contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (contactId: string) => deleteContact(user!.uid, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteContacts() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (contactIds: string[]) => deleteContacts(user!.uid, contactIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useImportContacts() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (contacts: ContactFormData[]) => importContacts(user!.uid, contacts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
