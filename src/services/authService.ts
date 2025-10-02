/**
 * Authentication Service
 * Handles password hashing, JWT tokens, and user authentication
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdminTyped } from '../lib/supabase';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export interface User {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  last_active: string;
}

export interface AuthTokenPayload {
  user_id: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    user_id: user.id,
    username: user.username
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Register new user
 */
export async function registerUser(
  username: string,
  password: string,
  displayName?: string
): Promise<{ user: User; token: string }> {
  // Validate input
  if (!username || username.length < 3 || username.length > 50) {
    throw new Error('Username must be 3-50 characters');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  try {
    // Insert user into database
    const { data, error } = await supabaseAdminTyped
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        display_name: displayName || username
      })
      .select('id, username, display_name, created_at, last_active')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Username already exists');
      }
      throw new Error(`Registration failed: ${error.message}`);
    }

    const user: User = {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      created_at: data.created_at,
      last_active: data.last_active
    };

    // Generate token
    const token = generateToken(user);

    return { user, token };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login user
 */
export async function loginUser(
  username: string,
  password: string
): Promise<{ user: User; token: string }> {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  try {
    // Get user from database
    const { data, error } = await supabaseAdminTyped
      .from('users')
      .select('id, username, password_hash, display_name, created_at, last_active')
      .eq('username', username)
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, data.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Update last_active
    await supabaseAdminTyped
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', data.id);

    const user: User = {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      created_at: data.created_at,
      last_active: new Date().toISOString()
    };

    // Generate token
    const token = generateToken(user);

    return { user, token };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdminTyped
      .from('users')
      .select('id, username, display_name, created_at, last_active')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      created_at: data.created_at,
      last_active: data.last_active
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Validate authentication token from request headers
 */
export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Middleware to authenticate requests
 */
export async function authenticateRequest(headers: Headers): Promise<User | null> {
  const token = getTokenFromHeaders(headers);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Get fresh user data
  const user = await getUserById(payload.user_id);
  return user;
}