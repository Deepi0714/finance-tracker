import jwt, { SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'dev-access-secret-change-me!!';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'dev-refresh-secret-change-me!!';
const ACCESS_EXP     = (process.env.JWT_EXPIRES_IN          || '7d')  as SignOptions['expiresIn'];
const REFRESH_EXP    = (process.env.JWT_REFRESH_EXPIRES_IN  || '30d') as SignOptions['expiresIn'];

export interface JwtPayload { userId: string }

export const generateAccessToken  = (userId: string) =>
  jwt.sign({ userId }, ACCESS_SECRET,  { expiresIn: ACCESS_EXP });

export const generateRefreshToken = (userId: string) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });

export const verifyAccessToken  = (token: string): JwtPayload =>
  jwt.verify(token, ACCESS_SECRET)  as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload;
