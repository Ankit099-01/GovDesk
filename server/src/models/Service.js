import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  mandatory: { type: Boolean, default: true },
  sample: String
}, { _id: false });

const stepSchema = new mongoose.Schema({
  step_no: Number,
  title: String,
  description: String
}, { _id: false });

const faqSchema = new mongoose.Schema({
  q: String,
  a: String
}, { _id: false });

const eligibilityRulesSchema = new mongoose.Schema({
  min_age: { type: Number, default: 0 },
  max_age: { type: Number, default: 100 },
  occupations: [{ type: String }],
  max_annual_income: { type: Number },
  exclusions: [{ type: String }]
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  category_id: { type: String, required: true },
  title: { type: String, required: true },
  title_hi: { type: String, default: '' },
  department: { type: String, required: true },
  scheme_type: { type: String, enum: ['Central', 'State'], default: 'Central' },
  mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
  state: { type: String, default: 'All India' },
  benefits: { type: String, required: true },
  benefits_hi: { type: String, default: '' },
  processing_time: { type: String, default: '15 to 30 Days' },
  fee: { type: String, default: 'Free of cost' },
  official_url: { type: String, required: true },
  is_popular: { type: Boolean, default: false },
  description: { type: String, default: '' },
  description_hi: { type: String, default: '' },
  tags: [{ type: String }],
  keywords: [{ type: String }], // Real search keywords e.g. ["driving license", "driving licence", "dl", "rto", "parivahan"]
  eligibility_rules: eligibilityRulesSchema,
  documents: [documentSchema],
  guidance_steps: [stepSchema],
  faqs: [faqSchema]
}, {
  timestamps: true
});

// Text index for search
serviceSchema.index({
  title: 'text',
  title_hi: 'text',
  description: 'text',
  department: 'text',
  tags: 'text',
  keywords: 'text'
});

export const Service = mongoose.model('Service', serviceSchema);
