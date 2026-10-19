import { Notification } from '../models/Others.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    let query = {};

    if (userId) {
      query = { $or: [{ user_id: null }, { user_id: userId }] };
    } else {
      query = { user_id: null };
    }

    const notifications = await Notification.find(query).sort({ created_at: -1 });
    const unreadCount = notifications.filter(n => !n.read_status).length;

    return res.json({
      success: true,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications: ' + err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      const userId = req.user?.id;
      const filter = userId ? { $or: [{ user_id: null }, { user_id: userId }] } : { user_id: null };
      await Notification.updateMany(filter, { $set: { read_status: true } });
      return res.json({ success: true, message: 'All notifications marked as read.' });
    }

    const updated = await Notification.findByIdAndUpdate(id, { $set: { read_status: true } }, { new: true });
    return res.json({ success: true, notification: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notification status.' });
  }
};
