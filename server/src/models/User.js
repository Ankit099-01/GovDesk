import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  password_hash: { type: String, required: true },
  state: { type: String, default: 'All India' },
  city: { type: String, default: '' },
  role: { type: String, enum: ['citizen', 'admin', 'superadmin'], default: 'citizen' },
  preferences: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const User = mongoose.model('User', userSchema);
