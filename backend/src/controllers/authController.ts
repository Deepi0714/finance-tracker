import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ── Schemas ──────────────────────────────────────────────
const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  currency: z.string().length(3).optional().default('USD'),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const REFRESH_EXPIRY = () =>
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

// ── Register ─────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existing) throw createError('Email already registered', 409);

    const password_hash = await bcrypt.hash(data.password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: data.name,
        email: data.email,
        password_hash,
        currency: data.currency,
      })
      .select('id, name, email, currency, avatar_url, monthly_income_goal, monthly_savings_goal, timezone, created_at')
      .single();

    if (error) throw createError(error.message, 500);

    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await supabase.from('refresh_tokens').insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: REFRESH_EXPIRY(),
    });

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) { next(err); }
};

// ── Login ────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = LoginSchema.parse(req.body);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.email)
      .single();

    if (!user) throw createError('Invalid credentials', 401);

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) throw createError('Invalid credentials', 401);

    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await supabase.from('refresh_tokens').insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: REFRESH_EXPIRY(),
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) { next(err); }
};

// ── Refresh tokens ───────────────────────────────────────
export const refreshTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError('Refresh token required', 400);

    const { userId } = verifyRefreshToken(refreshToken);

    const { data: stored } = await supabase
      .from('refresh_tokens')
      .select('id')
      .eq('token', refreshToken)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!stored) throw createError('Invalid or expired refresh token', 401);

    // Rotate
    await supabase.from('refresh_tokens').delete().eq('id', stored.id);

    const newAccess  = generateAccessToken(userId);
    const newRefresh = generateRefreshToken(userId);

    await supabase.from('refresh_tokens').insert({
      token: newRefresh,
      user_id: userId,
      expires_at: REFRESH_EXPIRY(),
    });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) { next(err); }
};

// ── Logout ───────────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

// ── Get profile ──────────────────────────────────────────
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, currency, avatar_url, monthly_income_goal, monthly_savings_goal, timezone, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) throw createError('User not found', 404);
    res.json(user);
  } catch (err) { next(err); }
};

// ── Update profile ───────────────────────────────────────
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, currency, monthly_income_goal, monthly_savings_goal, timezone } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ name, currency, monthly_income_goal, monthly_savings_goal, timezone })
      .eq('id', req.userId)
      .select('id, name, email, currency, avatar_url, monthly_income_goal, monthly_savings_goal, timezone')
      .single();

    if (error) throw createError(error.message, 500);
    res.json(user);
  } catch (err) { next(err); }
};
