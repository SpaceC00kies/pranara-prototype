/**
 * Session Management Service
 * Handles chat sessions, Redis caching, and session limits
 */

import { supabaseAdminTyped } from '../lib/supabase';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  topic?: string;
}

const MAX_SESSIONS_PER_USER = 3;

/**
 * Get all chat sessions for a user
 */
export async function getUserChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const { data, error } = await supabaseAdminTyped
      .from('chat_sessions')
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at,
        chat_messages(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }

    return (data || []).map(session => ({
      id: session.id,
      user_id: session.user_id,
      title: session.title,
      created_at: session.created_at,
      updated_at: session.updated_at,
      message_count: Array.isArray(session.chat_messages) ? session.chat_messages.length : 0
    }));
  } catch (error) {
    console.error('Error in getUserChatSessions:', error);
    return [];
  }
}

/**
 * Create a new chat session for a user
 */
export async function createChatSession(
  userId: string,
  title: string = 'New Chat'
): Promise<ChatSession | null> {
  try {
    // Check if user already has max sessions
    const existingSessions = await getUserChatSessions(userId);
    if (existingSessions.length >= MAX_SESSIONS_PER_USER) {
      throw new Error(`Maximum ${MAX_SESSIONS_PER_USER} chat sessions allowed`);
    }

    const { data, error } = await supabaseAdminTyped
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title.trim() || 'New Chat'
      })
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
      updated_at: data.updated_at,
      message_count: 0
    };
  } catch (error) {
    console.error('Error in createChatSession:', error);
    throw error;
  }
}

/**
 * Delete a chat session (and all its messages)
 */
export async function deleteChatSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify the session belongs to the user
    const { data: session, error: fetchError } = await supabaseAdminTyped
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      throw new Error('Chat session not found or access denied');
    }

    // Delete the session (messages will be deleted via CASCADE)
    const { error: deleteError } = await supabaseAdminTyped
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting chat session:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteChatSession:', error);
    throw error;
  }
}

/**
 * Update chat session title
 */
export async function updateChatSessionTitle(
  sessionId: string,
  userId: string,
  newTitle: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdminTyped
      .from('chat_sessions')
      .update({ 
        title: newTitle.trim() || 'New Chat',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating chat session title:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateChatSessionTitle:', error);
    return false;
  }
}

/**
 * Update chat session (general update function)
 */
export async function updateChatSession(
  sessionId: string,
  userId: string,
  updates: { title?: string }
): Promise<ChatSession | null> {
  try {
    // Verify the session belongs to the user first
    const { data: existingSession, error: fetchError } = await supabaseAdminTyped
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingSession) {
      throw new Error('Chat session not found or access denied');
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title.trim() || 'New Chat';
    }

    // Update the session
    const { data, error } = await supabaseAdminTyped
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat session:', error);
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateChatSession:', error);
    throw error;
  }
}

/**
 * Get chat messages for a session
 */
export async function getChatMessages(
  sessionId: string,
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdminTyped
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new Error('Chat session not found or access denied');
    }

    // Get messages
    const { data, error } = await supabaseAdminTyped
      .from('chat_messages')
      .select('id, session_id, user_id, content, sender, timestamp, topic')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    throw error;
  }
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  sessionId: string,
  userId: string,
  content: string,
  sender: 'user' | 'assistant',
  topic?: string
): Promise<ChatMessage | null> {
  try {
    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdminTyped
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new Error('Chat session not found or access denied');
    }

    // Add the message
    const { data, error } = await supabaseAdminTyped
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: content.trim(),
        sender,
        topic
      })
      .select('id, session_id, user_id, content, sender, timestamp, topic')
      .single();

    if (error) {
      console.error('Error adding chat message:', error);
      return null;
    }

    // Update session's updated_at timestamp
    await supabaseAdminTyped
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return data;
  } catch (error) {
    console.error('Error in addChatMessage:', error);
    throw error;
  }
}

/**
 * Get or create a default session for a user
 */
export async function getOrCreateDefaultSession(userId: string): Promise<ChatSession | null> {
  try {
    // Get existing sessions
    const sessions = await getUserChatSessions(userId);
    
    if (sessions.length > 0) {
      // Return the most recently updated session
      return sessions[0];
    }

    // Create a new session if none exist
    return await createChatSession(userId, 'New Chat');
  } catch (error) {
    console.error('Error in getOrCreateDefaultSession:', error);
    return null;
  }
}

/**
 * Validate session ownership
 */
export async function validateSessionOwnership(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdminTyped
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error validating session ownership:', error);
    return false;
  }
}

/**
 * Validate session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a UUID format (for authenticated users) or 64-char hex (for anonymous users)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexRegex = /^[a-f0-9]{64}$/i;
  
  return uuidRegex.test(sessionId) || hexRegex.test(sessionId);
}

/**
 * Create session hash for analytics
 */
export function createSessionHash(sessionId: string): string {
  // Simple hash function for session analytics
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}