import mongoose from 'mongoose';

const grievanceSchema = new mongoose.Schema({
  tracking_number: { type: String, required: true, unique: true },
  user_id: { type: String, default: null },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  phone: { type: String, default: '' },
  category: { type: String, required: true },
  service_name: { type: String, default: 'General Service' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Submitted', 'Under Review', 'Escalated', 'Resolved'], default: 'Submitted' },
  admin_response: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Grievance = mongoose.model('Grievance', grievanceSchema);
