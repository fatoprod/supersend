import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import {
  getContactLists,
  getContactList,
  createContactList,
  updateContactList,
  deleteContactList,
  getContactsInList,
  createContactInList,
  updateContactInList,
  deleteContactFromList,
  deleteContactsFromList,
  importContactsToList,
} from "../lib/services/contactLists";
import type { ContactListFormData, ContactFormData } from "../types";

// Contact Lists hooks
export function useContactLists() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["contactLists", userId],
    queryFn: () => getContactLists(userId!),
    enabled: !!userId,
  });
}

export function useContactList(listId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["contactList", userId, listId],
    queryFn: () => getContactList(userId!, listId!),
    enabled: !!userId && !!listId,
  });
}

export function useCreateContactList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (data: ContactListFormData) => createContactList(user!.uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateContactList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: Partial<ContactListFormData> }) =>
      updateContactList(user!.uid, listId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["contactList"] });
    },
  });
}

export function useDeleteContactList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (listId: string) => deleteContactList(user!.uid, listId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Contacts within a List hooks
export function useContactsInList(listId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["contactsInList", userId, listId],
    queryFn: () => getContactsInList(userId!, listId!),
    enabled: !!userId && !!listId,
  });
}

export function useCreateContactInList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: ContactFormData }) =>
      createContactInList(user!.uid, listId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["contactsInList"] });
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["contactList", variables.listId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateContactInList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, contactId, data }: { listId: string; contactId: string; data: Partial<ContactFormData> }) =>
      updateContactInList(user!.uid, listId, contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactsInList"] });
    },
  });
}

export function useDeleteContactFromList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, contactId }: { listId: string; contactId: string }) =>
      deleteContactFromList(user!.uid, listId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactsInList"] });
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteContactsFromList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, contactIds }: { listId: string; contactIds: string[] }) =>
      deleteContactsFromList(user!.uid, listId, contactIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactsInList"] });
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useImportContactsToList() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ listId, contacts }: { listId: string; contacts: ContactFormData[] }) =>
      importContactsToList(user!.uid, listId, contacts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactsInList"] });
      qc.invalidateQueries({ queryKey: ["contactLists"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
