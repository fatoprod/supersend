import { Timestamp } from "firebase/firestore";

// User types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
}

export interface UserVerification {
  code: string;
  expiresAt: Timestamp;
  attempts: number;
}

// Contact types
export interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags: string[];
  customFields: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  unsubscribed: boolean;
  bounced: boolean;
}

export interface ContactFormData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

// Contact List types
export interface ContactList {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactListFormData {
  name: string;
  description?: string;
}

// Campaign types
export type CampaignStatus = 
  | "draft" 
  | "scheduled" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "paused";

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  from: string;
  replyTo?: string;
  html: string;
  text?: string;
  recipients: string[];
  recipientCount: number;
  status: CampaignStatus;
  scheduledAt?: Timestamp;
  sentAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stats?: CampaignStats;
  error?: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
}

export interface CampaignFormData {
  name: string;
  subject: string;
  from?: string;
  replyTo?: string;
  html: string;
  text?: string;
  recipients: string[];
  scheduledAt?: Date;
}

// Email template types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
  defaultVariables?: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailTemplateFormData {
  name: string;
  subject: string;
  html: string;
  text?: string;
  defaultVariables?: Record<string, string>;
}

// Sent email log
export interface SentEmail {
  id: string;
  campaignId?: string;
  to: string;
  subject: string;
  sentAt: Timestamp;
  status: "sent" | "failed" | "bounced";
  messageId?: string;
  error?: string;
  opened?: boolean;
  openedAt?: Timestamp;
  clicked?: boolean;
  clickedAt?: Timestamp;
}

// API response types
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalContacts: number;
  totalCampaigns: number;
  emailsSent: number;
  emailsThisMonth: number;
  openRate: number;
  clickRate: number;
}
