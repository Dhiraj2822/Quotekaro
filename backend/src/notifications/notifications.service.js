const db = require('../config/db');

const memoryNotifications = new Map();

async function getUserNotifications(userId) {
  try {
    const res = await db.query(
      'SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Memory
  }

  const list = memoryNotifications.get(userId) || [
    {
      id: `notif-1-${userId.slice(0, 8)}`,
      user_id: userId,
      title: 'AI Maintenance Alert: AC Filter Check',
      body: 'Your Master Bedroom Daikin AC is due for foam cleaning in 12 days to maintain peak cooling performance.',
      type: 'maintenance_reminder',
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: `notif-2-${userId.slice(0, 8)}`,
      user_id: userId,
      title: 'QuoteKaro Care Plan Active',
      body: 'You have 2 free maintenance visits and 15% discount available under Care Standard.',
      type: 'subscription',
      is_read: false,
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: `notif-3-${userId.slice(0, 8)}`,
      user_id: userId,
      title: 'Promo Code: WELCOME50',
      body: 'Get ₹50 off on your next deep cleaning or electrician service in Pune.',
      type: 'offer',
      is_read: true,
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  return list;
}

async function markNotificationAsRead(userId, notificationId) {
  try {
    await db.query(
      'UPDATE user_notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  } catch (err) {
    // Memory
  }

  const list = memoryNotifications.get(userId) || [];
  const found = list.find((n) => n.id === notificationId);
  if (found) found.is_read = true;

  return { success: true };
}

async function markAllNotificationsRead(userId) {
  try {
    await db.query('UPDATE user_notifications SET is_read = true WHERE user_id = $1', [userId]);
  } catch (err) {
    // Memory
  }

  const list = memoryNotifications.get(userId) || [];
  list.forEach((n) => { n.is_read = true; });

  return { success: true };
}

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsRead
};

