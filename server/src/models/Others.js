import mongoose from 'mongoose';

export const Notification = mongoose.model('Notification', new mongoose.Schema({
  user_id: { type: String, default: null },
  type: { type: String, default: 'scheme_alert' },
  title: { type: String, required: true },
  title_hi: { type: String, default: '' },
  message: { type: String, required: true },
  message_hi: { type: String, default: '' },
  link: { type: String, default: '' },
  read_status: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}));

export const SavedService = mongoose.model('SavedService', new mongoose.Schema({
  user_id: { type: String, required: true },
  service_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}));

export const Feedback = mongoose.model('Feedback', new mongoose.Schema({
  user_id: { type: String, default: 'anonymous' },
  user_name: { type: String, default: 'Citizen' },
  service_id: { type: String, default: null },
  service_name: { type: String, default: 'Platform Feedback' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
}));

export const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  admin_id: { type: String, default: '' },
  admin_name: { type: String, default: 'Admin' },
  action: { type: String, required: true },
  entity: { type: String, default: '' },
  details: { type: String, default: '' },
  ip: { type: String, default: '127.0.0.1' },
  created_at: { type: Date, default: Date.now }
}));

export const OtpVerification = mongoose.model('OtpVerification', new mongoose.Schema({
  identifier: { type: String, required: true },
  code: { type: String, required: true },
  expires_at: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}));
