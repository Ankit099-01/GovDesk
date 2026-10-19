import { Grievance } from '../models/Grievance.js';
import { Notification } from '../models/Others.js';

export const createGrievance = async (req, res) => {
  try {
    const { category, service_name, subject, description, user_name, user_email, phone } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Category, subject, and description are required.' });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tracking_number = `GOV-GRV-2026-${randomSuffix}`;

    const grievance = await Grievance.create({
      tracking_number,
      user_id: req.user ? req.user.id : null,
      user_name: req.user ? req.user.name : (user_name || 'Citizen'),
      user_email: req.user ? req.user.email : (user_email || ''),
      phone: phone || (req.user ? req.user.phone : ''),
      category,
      service_name: service_name || 'General Service',
      subject: subject.trim(),
      description: description.trim(),
      status: 'Submitted',
      admin_response: 'Grievance received and registered. Assigned to departmental nodal officer for inspection.'
    });

    if (req.user) {
      await Notification.create({
        user_id: req.user.id,
        type: 'grievance_update',
        title: `Grievance Lodged: ${tracking_number}`,
        title_hi: `शिकायत दर्ज: ${tracking_number}`,
        message: `Your grievance regarding "${subject}" has been successfully logged with token ${tracking_number}.`,
        message_hi: `आपकी शिकायत टोकन ${tracking_number} के साथ सफलतापूर्वक दर्ज हो गई है।`,
        link: `/grievance?track=${tracking_number}`,
        read_status: false
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully into MongoDB.',
      tracking_number,
      grievance
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to lodge grievance: ' + err.message });
  }
};

export const getMyGrievances = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const grievances = await Grievance.find({ user_id: req.user.id }).sort({ created_at: -1 });
    return res.json({ success: true, grievances });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user grievances.' });
  }
};

export const trackGrievance = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Tracking token required.' });
    }

    const grievance = await Grievance.findOne({ tracking_number: token.trim().toUpperCase() });
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'No grievance found with this tracking number.' });
    }

    return res.json({ success: true, grievance });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Tracking lookup failed.' });
  }
};
