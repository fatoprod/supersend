import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export interface Ga4Settings {
  measurementId: string;
  propertyId: string;
  hasServiceAccount: boolean;
  serviceAccountEmail: string;
  enabled: boolean;
}

export interface UpdateGa4SettingsInput {
  measurementId?: string;
  propertyId?: string;
  serviceAccountJson?: string;
  enabled?: boolean;
}

export interface Ga4CampaignStats {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  engagedSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversions: number;
  eventCount: number;
  topPages: Array<{ path: string; sessions: number }>;
  topSources: Array<{ source: string; medium: string; sessions: number }>;
  byDevice: Array<{ category: string; sessions: number }>;
}

const getCallable = httpsCallable<void, Ga4Settings>(functions, "getGa4Settings");
const updateCallable = httpsCallable<UpdateGa4SettingsInput, { success: boolean }>(
  functions,
  "updateGa4Settings",
);
const testCallable = httpsCallable<void, { success: boolean; sampleSessions: number }>(
  functions,
  "testGa4Connection",
);
const statsCallable = httpsCallable<
  { campaignId: string; startDate?: string; endDate?: string },
  Ga4CampaignStats
>(functions, "getGa4CampaignStats");

export async function getGa4Settings(): Promise<Ga4Settings> {
  const res = await getCallable();
  return res.data;
}

export async function updateGa4Settings(input: UpdateGa4SettingsInput): Promise<void> {
  await updateCallable(input);
}

export async function testGa4Connection(): Promise<{ success: boolean; sampleSessions: number }> {
  const res = await testCallable();
  return res.data;
}

export async function getGa4CampaignStats(
  campaignId: string,
  startDate?: string,
  endDate?: string,
): Promise<Ga4CampaignStats> {
  const res = await statsCallable({ campaignId, startDate, endDate });
  return res.data;
}
