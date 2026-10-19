import { Service } from '../models/Service.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { Grievance } from '../models/Grievance.js';
import { Notification, Feedback, AuditLog } from '../models/Others.js';
import { categoriesData, servicesData, officeLocationsData } from '../seed/seedData.js';
import { OfficeLocation } from '../models/OfficeLocation.js';

export const getStats = async (req, res) => {
  try {
    const [totalServices, totalCategories, totalUsers, grievances, feedbacks] = await Promise.all([
      Service.countDocuments(),
      Category.countDocuments(),
      User.countDocuments(),
      Grievance.find(),
      Feedback.find()
    ]);

    const pendingGrievances = grievances.filter(g => g.status !== 'Resolved').length;
    const avgRating = feedbacks.length 
      ? (feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length).toFixed(1)
      : '4.8';

    return res.json({
      success: true,
      stats: {
        total_services: totalServices,
        total_categories: totalCategories,
        total_users: totalUsers,
        total_grievances: grievances.length,
        pending_grievances: pendingGrievances,
        avg_rating: avgRating,
        total_feedback: feedbacks.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to compute admin statistics: ' + err.message });
  }
};

export const createService = async (req, res) => {
  try {
    const data = req.body;
    if (!data.title || !data.category_id) {
      return res.status(400).json({ success: false, message: 'Service title and category are required.' });
    }

    const id = data.id || `srv_${Date.now()}`;
    const created = await Service.create({
      ...data,
      id,
      documents: data.documents || [],
      guidance_steps: data.guidance_steps || [],
      faqs: data.faqs || []
    });

    await AuditLog.create({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'CREATE_SERVICE',
      entity: 'services',
      details: `Created scheme: ${created.title} (${created.id})`,
      ip: req.ip || '127.0.0.1'
    });

    return res.status(201).json({
      success: true,
      message: 'Service scheme published to MongoDB catalog.',
      service: created
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create service: ' + err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await Service.findOneAndUpdate({ id }, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    await AuditLog.create({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'UPDATE_SERVICE',
      entity: 'services',
      details: `Updated scheme ${updated.title} (${id})`,
      ip: req.ip || '127.0.0.1'
    });

    return res.json({
      success: true,
      message: 'Service updated in MongoDB successfully.',
      service: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update service: ' + err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOneAndDelete({ id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    await AuditLog.create({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'DELETE_SERVICE',
      entity: 'services',
      details: `Removed scheme: ${service.title} (${id})`,
      ip: req.ip || '127.0.0.1'
    });

    return res.json({ success: true, message: 'Service scheme deleted from MongoDB.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete service.' });
  }
};

export const getAllGrievances = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    const list = await Grievance.find(query).sort({ created_at: -1 });
    return res.json({ success: true, grievances: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch grievances.' });
  }
};

export const updateGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (admin_response) updates.admin_response = admin_response;

    const updated = await Grievance.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Grievance not found.' });
    }

    if (updated.user_id) {
      await Notification.create({
        user_id: updated.user_id,
        type: 'grievance_update',
        title: `Grievance Status: ${updated.status}`,
        title_hi: `शिकायत की स्थिति: ${updated.status}`,
        message: `Your grievance (${updated.tracking_number}) status updated to "${updated.status}". ${admin_response ? `Response: ${admin_response}` : ''}`,
        link: `/grievance?track=${updated.tracking_number}`,
        read_status: false
      });
    }

    await AuditLog.create({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'UPDATE_GRIEVANCE',
      entity: 'grievances',
      details: `Updated grievance ${updated.tracking_number} status to ${status}`,
      ip: req.ip || '127.0.0.1'
    });

    return res.json({ success: true, message: 'Grievance updated and citizen notified.', grievance: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update grievance: ' + err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').sort({ created_at: -1 });
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['citizen', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password_hash');
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
};

export const bulkImport = async (req, res) => {
  try {
    const { schemes } = req.body;
    if (!Array.isArray(schemes) || schemes.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid array of schemes is required.' });
    }

    for (const s of schemes) {
      const id = s.id || `srv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await Service.updateOne({ id }, { $set: { ...s, id } }, { upsert: true });
    }

    return res.json({ success: true, message: `Successfully seeded ${schemes.length} schemes into MongoDB.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Bulk import failed: ' + err.message });
  }
};

export const resetSeed = async (req, res) => {
  try {
    for (const c of categoriesData) {
      await Category.updateOne({ id: c.id }, { $set: c }, { upsert: true });
    }
    for (const s of servicesData) {
      await Service.updateOne({ id: s.id }, { $set: s }, { upsert: true });
    }
    for (const o of officeLocationsData) {
      await OfficeLocation.updateOne({ id: o.id }, { $set: o }, { upsert: true });
    }
    return res.json({ success: true, message: 'MongoDB restored with official 10 categories, 23+ schemes, and pan-India offices.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reset seed: ' + err.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ created_at: -1 }).limit(50);
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};
