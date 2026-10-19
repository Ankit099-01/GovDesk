import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { OtpVerification, Notification } from '../models/Others.js';
import { JWT_SECRET } from '../middleware/auth.js';

export const register = async (req, res) => {
  try {
    const { name, email, phone, state, city, preferences, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists in MongoDB.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      state: state || 'All India',
      city: city ? city.trim() : '',
      preferences: Array.isArray(preferences) ? preferences : [],
      role: (role === 'admin' || role === 'superadmin') ? 'admin' : 'citizen',
      password_hash
    });

    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Welcome Notification in MongoDB
    await Notification.create({
      user_id: newUser._id.toString(),
      type: 'scheme_alert',
      title: 'Welcome to GovDesk!',
      title_hi: 'गोवडेस्क में आपका स्वागत है!',
      message: 'Explore government schemes, check your eligibility, and track services easily.',
      message_hi: 'सरकारी योजनाओं को खोजें, अपनी पात्रता जांचें और सेवाओं को ट्रैक करें।',
      link: '/services',
      read_status: false
    });

    return res.status(201).json({
      success: true,
      message: 'Citizen account registered in MongoDB successfully.',
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        state: newUser.state,
        city: newUser.city,
        role: newUser.role,
        preferences: newUser.preferences,
        created_at: newUser.created_at
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state,
        city: user.city,
        role: user.role,
        preferences: user.preferences,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed due to server error.' });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone or email is required to send OTP.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await OtpVerification.create({
      identifier: identifier.trim(),
      code,
      expires_at,
      verified: false
    });

    return res.json({
      success: true,
      message: `OTP sent to ${identifier}. Valid for 10 minutes.`,
      otp_code: code // Available for quick user test entry
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP code are required.' });
    }

    const record = await OtpVerification.findOne({
      identifier: identifier.trim(),
      code: code.trim(),
      verified: false,
      expires_at: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    record.verified = true;
    await record.save();

    const user = await User.findOne({ 
      $or: [{ email: identifier.trim().toLowerCase() }, { phone: identifier.trim() }] 
    });

    if (user) {
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        message: 'OTP verified successfully.',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          state: user.state,
          role: user.role,
          preferences: user.preferences
        }
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified. Please complete your registration.',
      identifier: identifier.trim()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state,
        city: user.city,
        role: user.role,
        preferences: user.preferences,
        created_at: user.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, state, city, preferences } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (state !== undefined) updates.state = state;
    if (city !== undefined) updates.city = city.trim();
    if (preferences !== undefined) updates.preferences = preferences;

    const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password_hash');

    return res.json({
      success: true,
      message: 'Profile updated in MongoDB successfully.',
      user: {
        id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        state: updated.state,
        city: updated.city,
        role: updated.role,
        preferences: updated.preferences
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};
