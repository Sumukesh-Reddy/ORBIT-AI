import jwt from 'jsonwebtoken';
import { settings } from '../config.js';

export function createAccessToken(data) {
  return jwt.sign(
    { ...data, type: 'access' },
    settings.JWT_SECRET_KEY,
    { expiresIn: `${settings.ACCESS_TOKEN_EXPIRE_MINUTES}m`, algorithm: settings.JWT_ALGORITHM }
  );
}

export function createRefreshToken(data) {
  return jwt.sign(
    { ...data, type: 'refresh' },
    settings.JWT_SECRET_KEY,
    { expiresIn: `${settings.REFRESH_TOKEN_EXPIRE_DAYS}d`, algorithm: settings.JWT_ALGORITHM }
  );
}

export function decodeToken(token) {
  try {
    return jwt.verify(token, settings.JWT_SECRET_KEY, { algorithms: [settings.JWT_ALGORITHM] });
  } catch (error) {
    const err = new Error('Invalid or expired token.');
    err.status = 401;
    throw err;
  }
}

export function extractUserId(token) {
  const payload = decodeToken(token);
  const userId = payload.sub;
  if (!userId) {
    const err = new Error('Token missing subject claim.');
    err.status = 401;
    throw err;
  }
  return userId;
}
