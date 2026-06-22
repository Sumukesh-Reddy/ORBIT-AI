import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { decodeToken } from '../utils/jwt.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ detail: 'Authorization header missing.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ detail: 'Invalid authorization format. Use Bearer <token>.' });
  }

  const token = parts[1];
  try {
    const payload = decodeToken(token);
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ detail: "Token payload missing 'sub' claim." });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ detail: 'User not found. Token may be stale.' });
    }

    user.id = user._id.toString();
    req.user = user;
    next();
  } catch (error) {
    const status = error.status || 401;
    return res.status(status).json({ detail: error.message });
  }
}
