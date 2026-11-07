const notificationsService = require('./notifications.service');

async function handleGetNotifications(req, res, next) {
  try {
    const notifications = await notificationsService.getUserNotifications(req.user.id);
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    res.status(200).json({ count: notifications.length, unread_count: unreadCount, notifications });
  } catch (err) {
    next(err);
  }
}

async function handleMarkRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await notificationsService.markNotificationAsRead(req.user.id, id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleMarkAllRead(req, res, next) {
  try {
    const result = await notificationsService.markAllNotificationsRead(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetNotifications,
  handleMarkRead,
  handleMarkAllRead
};

