import { Feedback } from '../models/Others.js';
import { Service } from '../models/Service.js';

export const submitFeedback = async (req, res) => {
  try {
    const { service_id, rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required.' });
    }

    let serviceName = 'Platform Feedback';
    if (service_id) {
      const srv = await Service.findOne({ id: service_id });
      if (srv) serviceName = srv.title;
    }

    const item = await Feedback.create({
      user_id: req.user ? req.user._id : null,
      user_name: req.user ? req.user.name : 'Anonymous Citizen',
      service_id: service_id || null,
      service_name: serviceName,
      rating: Number(rating),
      comment: (comment || '').trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback!',
      feedback: item
    });
  } catch (err) {
    console.error('Feedback submit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
};

export const getServiceFeedback = async (req, res) => {
  try {
    const { service_id } = req.params;
    const list = await Feedback.find({ service_id }).sort({ createdAt: -1 });
    return res.json({ success: true, feedback: list });
  } catch (err) {
    console.error('Feedback fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch feedback.' });
  }
};
