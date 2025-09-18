/**
 * Supabase Client Configuration
 * Provides both client-side and server-side Supabase clients
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client (for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      question_logs: {
        Row: {
          id: number;
          session_id: string;
          timestamp: string;
          text_snippet: string;
          topic: string;
          language: string;
          line_clicked: boolean;
          routed: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          timestamp?: string;
          text_snippet: string;
          topic: string;
          language: string;
          line_clicked?: boolean;
          routed?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          timestamp?: string;
          text_snippet?: string;
          topic?: string;
          language?: string;
          line_clicked?: boolean;
          routed?: string;
        };
      };
      user_feedback: {
        Row: {
          id: number;
          message_id: string;
          session_id: string;
          question_log_id: number | null;
          feedback_type: string;
          selected_text: string | null;
          user_comment: string | null;
          emotional_tone: string | null;
          response_length: string | null;
          cultural_sensitivity: string | null;
          positive_aspects: string[] | null;
          prompt_version: string | null;
          created_at: string;
          is_reviewed: boolean;
          admin_notes: string | null;
        };
        Insert: {
          id?: number;
          message_id: string;
          session_id: string;
          question_log_id?: number | null;
          feedback_type: string;
          selected_text?: string | null;
          user_comment?: string | null;
          emotional_tone?: string | null;
          response_length?: string | null;
          cultural_sensitivity?: string | null;
          positive_aspects?: string[] | null;
          prompt_version?: string | null;
          created_at?: string;
          is_reviewed?: boolean;
          admin_notes?: string | null;
        };
        Update: {
          id?: number;
          message_id?: string;
          session_id?: string;
          question_log_id?: number | null;
          feedback_type?: string;
          selected_text?: string | null;
          user_comment?: string | null;
          emotional_tone?: string | null;
          response_length?: string | null;
          cultural_sensitivity?: string | null;
          positive_aspects?: string[] | null;
          prompt_version?: string | null;
          created_at?: string;
          is_reviewed?: boolean;
          admin_notes?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Typed Supabase clients
export const supabaseTyped = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabaseAdminTyped = createClient<Database>(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);