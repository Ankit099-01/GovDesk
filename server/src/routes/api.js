import express from 'express';
import { 
  register, 
  login, 
  sendOtp, 
  verifyOtp, 
  getMe, 
  updateProfile 
} from '../controllers/authController.js';
import { 
  getCategories, 
  getServices, 
  getServiceById, 
  checkEligibility, 
  compareServices, 
  toggleSaveService, 
  getSavedServices 
} from '../controllers/servicesController.js';
import { 
  getOffices, 
  getOfficeById 
} from '../controllers/officesController.js';
import { 
  getNotifications, 
  markAsRead 
} from '../controllers/notificationsController.js';
import { 
  createGrievance, 
  getMyGrievances, 
  trackGrievance 
} from '../controllers/grievancesController.js';
import { 
  submitFeedback, 
  getServiceFeedback 
} from '../controllers/feedbackController.js';
import { 
  getStats, 
  createService, 
  updateService, 
  deleteService, 
  getAllGrievances, 
  updateGrievance, 
  getUsers, 
  updateUserRole, 
  bulkImport, 
  resetSeed, 
  getAuditLogs 
} from '../controllers/adminController.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// --- Auth Routes ---
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.get('/auth/me', authenticate, getMe);
router.put('/auth/profile', authenticate, updateProfile);

// --- Categories & Services Routes ---
router.get('/categories', getCategories);
router.get('/services', optionalAuth, getServices);
router.get('/services/:id', optionalAuth, getServiceById);
router.post('/eligibility/check', checkEligibility);
router.get('/services/compare/items', compareServices);

// --- Bookmarked / Saved Services ---
router.post('/services/save', authenticate, toggleSaveService);
router.get('/services/saved/my', authenticate, getSavedServices);

// --- Office Locations & Maps ---
router.get('/offices', getOffices);
router.get('/offices/:id', getOfficeById);

// --- Notifications ---
router.get('/notifications', optionalAuth, getNotifications);
router.put('/notifications/:id/read', optionalAuth, markAsRead);

// --- Grievance / Helpdesk ---
router.post('/grievances', optionalAuth, createGrievance);
router.get('/grievances/my', authenticate, getMyGrievances);
router.get('/grievances/track/:token', trackGrievance);

// --- Feedback & Rating ---
router.post('/feedback', optionalAuth, submitFeedback);
router.get('/feedback/service/:service_id', getServiceFeedback);

// --- Admin Backoffice Routes ---
router.get('/admin/stats', authenticate, requireRole(['admin', 'superadmin']), getStats);
router.post('/admin/services', authenticate, requireRole(['admin', 'superadmin']), createService);
router.put('/admin/services/:id', authenticate, requireRole(['admin', 'superadmin']), updateService);
router.delete('/admin/services/:id', authenticate, requireRole(['admin', 'superadmin']), deleteService);
router.get('/admin/grievances', authenticate, requireRole(['admin', 'superadmin']), getAllGrievances);
router.put('/admin/grievances/:id', authenticate, requireRole(['admin', 'superadmin']), updateGrievance);
router.get('/admin/users', authenticate, requireRole(['admin', 'superadmin']), getUsers);
router.put('/admin/users/:id/role', authenticate, requireRole(['superadmin']), updateUserRole);
router.post('/admin/seed/bulk', authenticate, requireRole(['admin', 'superadmin']), bulkImport);
router.post('/admin/seed/reset', authenticate, requireRole(['admin', 'superadmin']), resetSeed);
router.get('/admin/audit-logs', authenticate, requireRole(['admin', 'superadmin']), getAuditLogs);

export default router;
