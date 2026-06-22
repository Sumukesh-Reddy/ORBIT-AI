import { Router } from 'express';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { hashPassword, verifyPassword } from '../utils/hashing.js';
import { createAccessToken } from '../utils/jwt.js';
import { settings } from '../config.js';
import { sendOtpEmail, sendWelcomeEmail } from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email and password are required.' });
  }

  try {
    const db = getDb();
    
    // Check duplicate email
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ detail: 'An account with this email already exists.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const pendingDoc = {
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashPassword(password),
      otp,
      expiresAt
    };

    // Upsert pending registration
    await db.collection('pending_registrations').updateOne(
      { email: pendingDoc.email },
      { $set: pendingDoc },
      { upsert: true }
    );

    // Send OTP email
    await sendOtpEmail(pendingDoc.email, pendingDoc.name, otp);

    return res.status(200).json({
      message: 'Verification code sent to your email. Please enter the OTP to complete registration.',
      email: pendingDoc.email
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ detail: 'Failed to initiate registration.' });
  }
});

// POST /verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ detail: 'Email and OTP code are required.' });
  }

  try {
    const db = getDb();
    const emailLower = email.toLowerCase();

    // Find pending registration
    const pending = await db.collection('pending_registrations').findOne({ email: emailLower });
    if (!pending) {
      return res.status(400).json({ detail: 'No pending registration found for this email. Please sign up again.' });
    }

    // Check expiration
    if (new Date() > new Date(pending.expiresAt)) {
      return res.status(400).json({ detail: 'Verification code has expired. Please request a new one.' });
    }

    // Verify OTP
    if (pending.otp !== otp) {
      return res.status(400).json({ detail: 'Invalid verification code.' });
    }

    // Insert user
    const userDoc = {
      name: pending.name,
      email: pending.email,
      password: pending.password,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let userId;
    try {
      const result = await db.collection('users').insertOne(userDoc);
      userId = result.insertedId.toString();
    } catch (e) {
      return res.status(409).json({ detail: 'An account with this email already exists.' });
    }

    // Delete pending registration
    await db.collection('pending_registrations').deleteOne({ email: emailLower });

    // Send welcome email
    await sendWelcomeEmail(userDoc.email, userDoc.name);

    // Create token
    const token = createAccessToken({ sub: userId, email: userDoc.email });

    return res.status(201).json({
      user: {
        id: userId,
        name: userDoc.name,
        email: userDoc.email,
        createdAt: userDoc.createdAt
      },
      token: {
        access_token: token,
        token_type: 'bearer',
        expires_in: settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
      },
      message: 'Email verified and account created successfully.'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ detail: 'Failed to verify verification code.' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required.' });
  }

  try {
    const db = getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const userId = user._id.toString();
    const token = createAccessToken({ sub: userId, email: user.email });

    return res.status(200).json({
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token: {
        access_token: token,
        token_type: 'bearer',
        expires_in: settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
      },
      message: 'Login successful.'
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ detail: 'An error occurred during login.' });
  }
});

// POST /google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ detail: 'Google credential is required.' });
  }

  try {
    // Verify Google credential with OAuth endpoint
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${credential}` } }
    );

    if (response.status !== 200) {
      return res.status(401).json({ detail: 'Invalid Google credentials.' });
    }

    const idinfo = response.data;
    const email = idinfo.email.toLowerCase();
    const name = idinfo.name || '';

    const db = getDb();
    let user = await db.collection('users').findOne({ email });
    const now = new Date();

    let userId;
    if (!user) {
      // Register user
      const userDoc = {
        name,
        email,
        password: hashPassword(credential.slice(0, 16)), // Dummy password
        createdAt: now,
        updatedAt: now
      };
      const result = await db.collection('users').insertOne(userDoc);
      userId = result.insertedId.toString();
      user = await db.collection('users').findOne({ _id: result.insertedId });
      
      // Welcome email
      await sendWelcomeEmail(email, name);
    } else {
      userId = user._id.toString();
    }

    const token = createAccessToken({ sub: userId, email });

    return res.status(200).json({
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token: {
        access_token: token,
        token_type: 'bearer',
        expires_in: settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
      },
      message: 'Google Login successful.'
    });
  } catch (error) {
    console.error('Google login error:', error.message);
    return res.status(401).json({ detail: 'Invalid Google credentials.' });
  }
});

// GET /me
router.get('/me', authenticateToken, async (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    createdAt: req.user.createdAt
  });
});

// POST /logout
router.post('/logout', authenticateToken, async (req, res) => {
  return res.status(200).json({ message: 'Logged out successfully. Please discard your token.' });
});

export default router;
