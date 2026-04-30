import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export interface MailgunSettings {
  domain: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  webhookSigningKeyMasked: string;
  hasWebhookSigningKey: boolean;
  source: "firestore" | "env" | "mixed" | "none";
}

export interface UpdateMailgunSettingsInput {
  apiKey?: string;
  domain?: string;
  webhookSigningKey?: string;
}

export interface DnsCheckResult {
  name: string;
  expected: string;
  actual: string[];
  status: "ok" | "warn" | "missing";
  message?: string;
}

export interface DnsCheckResponse {
  domain: string;
  apex: string;
  checks: DnsCheckResult[];
}

const getCallable = httpsCallable<void, MailgunSettings>(functions, "getMailgunSettings");
const updateCallable = httpsCallable<UpdateMailgunSettingsInput, { success: boolean }>(
  functions,
  "updateMailgunSettings"
);
const checkDnsCallable = httpsCallable<{ domain: string }, DnsCheckResponse>(
  functions,
  "checkMailgunDns"
);

export async function getMailgunSettings(): Promise<MailgunSettings> {
  const res = await getCallable();
  return res.data;
}

export async function updateMailgunSettings(
  input: UpdateMailgunSettingsInput
): Promise<void> {
  await updateCallable(input);
}

export async function checkMailgunDns(domain: string): Promise<DnsCheckResponse> {
  const res = await checkDnsCallable({ domain });
  return res.data;
}
