import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import {
  getDashboardStats,
  getRecentCampaigns,
  getAnalyticsData,
} from "../lib/services/analytics";

export function useDashboardStats() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["dashboard", "stats", userId],
    queryFn: () => getDashboardStats(userId!),
    enabled: !!userId,
  });
}

export function useRecentCampaigns() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["dashboard", "recentCampaigns", userId],
    queryFn: () => getRecentCampaigns(userId!),
    enabled: !!userId,
  });
}

export function useAnalyticsData() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid;

  return useQuery({
    queryKey: ["analytics", userId],
    queryFn: () => getAnalyticsData(userId!),
    enabled: !!userId,
  });
}
