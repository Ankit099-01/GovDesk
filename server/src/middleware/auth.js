import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'govdesk_super_secret_jwt_key_2026';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User associated with token no longer exists in MongoDB.' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      state: user.state,
      city: user.city,
      role: user.role,
      preferences: user.preferences
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password_hash');
      if (user) {
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          state: user.state,
          city: user.city,
          role: user.role,
          preferences: user.preferences
        };
      }
    }
  } catch (err) {
    // Ignore invalid token in optionalAuth
  }
  next();
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const roleList = Array.isArray(roles) ? roles : [roles];
    if (!roleList.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient administrative privileges.' });
    }
    next();
  };
};
