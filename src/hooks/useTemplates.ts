import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "../lib/services/templates";
import type { EmailTemplateFormData } from "../types";

export function useTemplates() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["templates", userId],
    queryFn: () => getTemplates(userId!),
    enabled: !!userId,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (data: EmailTemplateFormData) => createTemplate(user!.uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Partial<EmailTemplateFormData> }) =>
      updateTemplate(user!.uid, templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (templateId: string) => deleteTemplate(user!.uid, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (templateId: string) => duplicateTemplate(user!.uid, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
