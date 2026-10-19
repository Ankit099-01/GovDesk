import { Service } from '../models/Service.js';
import { Category } from '../models/Category.js';
import { SavedService, Feedback } from '../models/Others.js';

// Keyword synonym dictionary for robust search
const KEYWORD_SYNONYMS = {
  'driving': ['driving', 'license', 'licence', 'dl', 'parivahan', 'sarathi', 'rto'],
  'license': ['driving license', 'driving licence', 'dl', 'sarathi', 'rto'],
  'licence': ['driving license', 'driving licence', 'dl', 'sarathi', 'rto'],
  'dl': ['driving license', 'driving licence', 'sarathi', 'rto'],
  'kisan': ['pm kisan', 'farmer', 'krishi', 'kheti', 'agriculture', 'fasal', 'kcc'],
  'farmer': ['pm kisan', 'agriculture', 'fasal bima', 'kcc', 'krishi'],
  'agriculture': ['pm kisan', 'farmer', 'fasal bima', 'kcc'],
  'ration': ['ration card', 'rashan', 'nfsa', 'onorc', 'food grain'],
  'rashan': ['ration card', 'ration', 'nfsa', 'food grain'],
  'ayushman': ['ayushman bharat', 'pmjay', 'golden card', 'hospital', 'cashless'],
  'pmjay': ['ayushman bharat', 'health card'],
  'scholarship': ['national scholarship portal', 'nsp', 'student', 'matric', 'education'],
  'student': ['scholarship', 'nsp', 'education loan', 'vidyalakshmi'],
  'mudra': ['mudra loan', 'pmmy', 'business loan', 'shishu', 'kishore', 'tarun'],
  'business': ['mudra', 'udyam', 'msme', 'pmegp'],
  'aadhaar': ['aadhaar', 'uidai', 'myaadhaar', 'pvc card', 'identity'],
  'aadhar': ['aadhaar', 'uidai', 'identity'],
  'pan': ['pan card', 'tax', 'nsdl', 'income tax'],
  'pension': ['old age pension', 'widow pension', 'nsap', 'senior citizen'],
  'housing': ['pmay', 'awas', 'pucca house', 'makan'],
  'awas': ['pmay', 'housing', 'pucca house'],
  'passport': ['passport seva', 'psk', 'tatkaal', 'travel'],
  'police': ['police clearance', 'pcc', 'fir', 'complaint'],
  'water': ['jal jeevan', 'tap connection', 'drinking water']
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    const services = await Service.find().select('category_id');

    const enriched = categories.map(cat => {
      const count = services.filter(s => s.category_id === cat.id).length;
      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        name_hi: cat.name_hi,
        icon: cat.icon,
        description: cat.description,
        description_hi: cat.description_hi,
        color: cat.color,
        services_count: count
      };
    });

    return res.json({ success: true, categories: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories: ' + err.message });
  }
};

export const getServices = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      state, 
      scheme_type, 
      mode, 
      popular,
      recommended 
    } = req.query;

    let query = {};

    // Filter by Category
    if (category && category !== 'all') {
      query.category_id = category;
    }

    // Filter by State
    if (state && state !== 'all' && state !== 'All India') {
      query.$or = [
        { state: 'All India' },
        { state: 'All States' },
        { state: new RegExp(`^${state}$`, 'i') }
      ];
    }

    // Filter by Scheme Type (Central / State)
    if (scheme_type && scheme_type !== 'all') {
      query.scheme_type = new RegExp(`^${scheme_type}$`, 'i');
    }

    // Filter by Mode (Online / Offline / Hybrid)
    if (mode && mode !== 'all') {
      query.mode = new RegExp(`^${mode}$`, 'i');
    }

    // Filter by Popular
    if (popular === 'true') {
      query.is_popular = true;
    }

    let services = await Service.find(query);

    // Advanced search with keyword synonyms and relevance score
    if (search && search.trim()) {
      const rawSearch = search.trim().toLowerCase();
      const tokens = rawSearch.split(/\s+/).filter(Boolean);
      
      const expandedTokens = new Set(tokens);
      for (const token of tokens) {
        if (KEYWORD_SYNONYMS[token]) {
          KEYWORD_SYNONYMS[token].forEach(syn => expandedTokens.add(syn.toLowerCase()));
        }
      }

      const scored = [];
      for (const srv of services) {
        let score = 0;
        const title = (srv.title || '').toLowerCase();
        const titleHi = (srv.title_hi || '').toLowerCase();
        const desc = (srv.description || '').toLowerCase();
        const dept = (srv.department || '').toLowerCase();
        const tags = (srv.tags || []).map(t => t.toLowerCase());
        const keywords = (srv.keywords || []).map(k => k.toLowerCase());

        // Exact full phrase in title or keywords
        if (title.includes(rawSearch)) score += 100;
        if (keywords.includes(rawSearch)) score += 90;
        if (titleHi.includes(rawSearch)) score += 80;
        if (tags.includes(rawSearch)) score += 70;
        if (dept.includes(rawSearch)) score += 50;
        if (desc.includes(rawSearch)) score += 30;

        for (const token of expandedTokens) {
          if (title.includes(token)) score += 40;
          if (keywords.some(k => k.includes(token))) score += 35;
          if (tags.some(t => t.includes(token))) score += 25;
          if (desc.includes(token)) score += 10;
        }

        if (score > 0) {
          scored.push({ srv, score });
        }
      }

      // Sort by highest relevance score
      scored.sort((a, b) => b.score - a.score);
      services = scored.map(item => item.srv);
    }

    // Personal recommendations based on user preferences if logged in
    if (recommended === 'true' && req.user && req.user.preferences?.length) {
      services = services.filter(s => req.user.preferences.includes(s.category_id));
    }

    return res.json({
      success: true,
      total: services.length,
      services
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch services: ' + err.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOne({ id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found in MongoDB.' });
    }

    const category = await Category.findOne({ id: service.category_id });
    const feedbackList = await Feedback.find({ service_id: id });
    const avgRating = feedbackList.length 
      ? (feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length).toFixed(1)
      : '4.8';

    let isSaved = false;
    if (req.user) {
      const saved = await SavedService.findOne({ user_id: req.user.id, service_id: id });
      isSaved = !!saved;
    }

    return res.json({
      success: true,
      service: {
        ...service.toObject(),
        category,
        rating: avgRating,
        reviews_count: feedbackList.length,
        is_saved: isSaved
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve service: ' + err.message });
  }
};

export const checkEligibility = async (req, res) => {
  try {
    const { service_id, age, gender, occupation, annual_income, category, state, owns_pucca_house } = req.body;

    const parsedAge = age ? parseInt(age, 10) : null;
    const parsedIncome = annual_income ? parseFloat(annual_income) : null;

    if (service_id) {
      const service = await Service.findOne({ id: service_id });
      if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found for eligibility check.' });
      }

      const rules = service.eligibility_rules || {};
      const checks = [];
      let isEligible = true;

      // Age check
      if (parsedAge !== null) {
        if (rules.min_age !== undefined && parsedAge < rules.min_age) {
          isEligible = false;
          checks.push({
            param: 'Age',
            status: 'failed',
            message: `Minimum age required is ${rules.min_age} years (entered: ${parsedAge}).`
          });
        } else if (rules.max_age !== undefined && parsedAge > rules.max_age) {
          isEligible = false;
          checks.push({
            param: 'Age',
            status: 'failed',
            message: `Maximum age allowed is ${rules.max_age} years (entered: ${parsedAge}).`
          });
        } else {
          checks.push({ param: 'Age', status: 'passed', message: `Age criterion satisfied (${parsedAge} years).` });
        }
      }

      // Income check
      if (parsedIncome !== null && rules.max_annual_income !== undefined) {
        if (parsedIncome > rules.max_annual_income) {
          isEligible = false;
          checks.push({
            param: 'Annual Income',
            status: 'failed',
            message: `Annual household income must not exceed ₹${rules.max_annual_income.toLocaleString('en-IN')} (entered: ₹${parsedIncome.toLocaleString('en-IN')}).`
          });
        } else {
          checks.push({
            param: 'Annual Income',
            status: 'passed',
            message: `Income criterion satisfied (under ₹${rules.max_annual_income.toLocaleString('en-IN')}).`
          });
        }
      }

      // Occupation check
      if (occupation && rules.occupations && rules.occupations.length > 0) {
        const normOcc = occupation.toLowerCase();
        const matches = rules.occupations.some(o => o.toLowerCase().includes(normOcc) || normOcc.includes(o.toLowerCase()));
        if (!matches) {
          isEligible = false;
          checks.push({
            param: 'Occupation',
            status: 'failed',
            message: `Scheme is primarily targeted to: ${rules.occupations.join(', ')}.`
          });
        } else {
          checks.push({ param: 'Occupation', status: 'passed', message: `Occupation matches scheme scope.` });
        }
      }

      // Housing specific check (e.g. PMAY)
      if (service.id === 'srv_pmay' && owns_pucca_house === true) {
        isEligible = false;
        checks.push({
          param: 'Housing Ownership',
          status: 'failed',
          message: 'Applicants owning an existing pucca house anywhere in India are ineligible.'
        });
      }

      let alternatives = [];
      if (!isEligible) {
        alternatives = await Service.find({ id: { $ne: service.id }, category_id: service.category_id }).limit(2);
        if (alternatives.length === 0) {
          alternatives = await Service.find({ id: { $ne: service.id } }).limit(2);
        }
      }

      return res.json({
        success: true,
        service_id: service.id,
        service_title: service.title,
        is_eligible: isEligible,
        checks,
        alternatives: alternatives.map(a => ({
          id: a.id,
          title: a.title,
          category_id: a.category_id,
          benefits: a.benefits
        }))
      });
    }

    // Universal Eligibility Check across all services in MongoDB
    const allServices = await Service.find();
    const results = allServices.map(srv => {
      const rules = srv.eligibility_rules || {};
      let eligible = true;
      const reasons = [];

      if (parsedAge !== null) {
        if (rules.min_age !== undefined && parsedAge < rules.min_age) {
          eligible = false;
          reasons.push(`Minimum age required is ${rules.min_age}`);
        }
        if (rules.max_age !== undefined && parsedAge > rules.max_age) {
          eligible = false;
          reasons.push(`Maximum age is ${rules.max_age}`);
        }
      }

      if (parsedIncome !== null && rules.max_annual_income !== undefined) {
        if (parsedIncome > rules.max_annual_income) {
          eligible = false;
          reasons.push(`Income exceeds cap of ₹${rules.max_annual_income.toLocaleString('en-IN')}`);
        }
      }

      if (occupation && rules.occupations?.length) {
        const normOcc = occupation.toLowerCase();
        const matches = rules.occupations.some(o => o.toLowerCase().includes(normOcc) || normOcc.includes(o.toLowerCase()));
        if (!matches) {
          eligible = false;
          reasons.push(`Required occupation: ${rules.occupations.join(', ')}`);
        }
      }

      return {
        id: srv.id,
        title: srv.title,
        category_id: srv.category_id,
        benefits: srv.benefits,
        scheme_type: srv.scheme_type,
        mode: srv.mode,
        is_eligible: eligible,
        reasons
      };
    });

    const eligibleSchemes = results.filter(r => r.is_eligible);
    const nonEligibleSchemes = results.filter(r => !r.is_eligible);

    return res.json({
      success: true,
      evaluated_count: results.length,
      eligible_count: eligibleSchemes.length,
      eligible: eligibleSchemes,
      non_eligible: nonEligibleSchemes
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Eligibility evaluation failed: ' + err.message });
  }
};

export const compareServices = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ success: false, message: 'Provide service IDs to compare.' });
    }

    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    const services = await Service.find({ id: { $in: idList } });

    return res.json({
      success: true,
      services
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to compare schemes.' });
  }
};

export const toggleSaveService = async (req, res) => {
  try {
    const { service_id } = req.body;
    if (!service_id) {
      return res.status(400).json({ success: false, message: 'service_id is required.' });
    }

    const existing = await SavedService.findOne({ user_id: req.user.id, service_id });

    if (existing) {
      await SavedService.findByIdAndDelete(existing._id);
      return res.json({ success: true, is_saved: false, message: 'Scheme removed from saved bookmarks.' });
    }

    await SavedService.create({
      user_id: req.user.id,
      service_id
    });

    return res.json({ success: true, is_saved: true, message: 'Scheme bookmarked to your profile in MongoDB!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle bookmark: ' + err.message });
  }
};

export const getSavedServices = async (req, res) => {
  try {
    const saved = await SavedService.find({ user_id: req.user.id });
    const serviceIds = saved.map(s => s.service_id);
    const services = await Service.find({ id: { $in: serviceIds } });

    return res.json({ success: true, saved_services: services });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch saved services.' });
  }
};
