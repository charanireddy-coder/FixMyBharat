import { SupabaseClient } from '@supabase/supabase-js';

export interface ActionButton {
  label: string;
  href?: string;
  query?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface SafeComplaintCard {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: ActionButton[];
  complaintCards?: SafeComplaintCard[];
  isError?: boolean;
}

export interface AssistantContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  supabase?: SupabaseClient;
}

export interface AssistantResponse {
  reply: string;
  suggestedActions?: ActionButton[];
  complaintCards?: SafeComplaintCard[];
}
