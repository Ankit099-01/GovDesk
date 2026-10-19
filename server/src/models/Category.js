import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  slug: { type: String, required: true },
  name: { type: String, required: true },
  name_hi: { type: String, default: '' },
  icon: { type: String, default: 'Layers' },
  description: { type: String, default: '' },
  description_hi: { type: String, default: '' },
  color: { type: String, default: 'blue' }
}, {
  timestamps: true
});

export const Category = mongoose.model('Category', categorySchema);
