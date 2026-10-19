import mongoose from 'mongoose';

const officeLocationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  phone: { type: String, default: '' },
  contact_hours: { type: String, default: 'Mon - Fri: 09:30 AM - 05:30 PM' },
  services_handled: [{ type: String }]
}, {
  timestamps: true
});

officeLocationSchema.index({ city: 1, state: 1, type: 1 });

export const OfficeLocation = mongoose.model('OfficeLocation', officeLocationSchema);
