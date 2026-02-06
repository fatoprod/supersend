import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import {
  getUserSettings,
  updateUserSettings,
  changePassword,
} from "../lib/services/settings";
import type { UserSettings } from "../lib/services/settings";

export function useSettings() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["settings", userId],
    queryFn: () => getUserSettings(userId!),
    enabled: !!userId,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (settings: Partial<UserSettings>) =>
      updateUserSettings(user!.uid, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
