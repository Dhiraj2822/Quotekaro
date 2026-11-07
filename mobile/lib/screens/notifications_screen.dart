import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const NotificationsScreen({super.key, required this.user});

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final notifs = await ApiService.getNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = notifs;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(String id, int index) async {
    try {
      await ApiService.markNotificationRead(id);
      if (!mounted) return;
      setState(() {
        _notifications[index] = {..._notifications[index], 'is_read': true};
      });
    } catch (_) {}
  }

  IconData _getNotifIcon(String? type) {
    switch (type) {
      case 'booking':
        return Icons.receipt_long;
      case 'maintenance':
        return Icons.build_circle;
      case 'payment':
        return Icons.payment;
      case 'promo':
        return Icons.card_giftcard;
      case 'subscription':
        return Icons.star;
      default:
        return Icons.notifications;
    }
  }

  Color _getNotifColor(String? type) {
    switch (type) {
      case 'booking':
        return NotificationsScreen.primaryColor;
      case 'maintenance':
        return Colors.orange;
      case 'payment':
        return NotificationsScreen.accentColor;
      case 'promo':
        return Colors.purple;
      case 'subscription':
        return Colors.amber.shade700;
      default:
        return Colors.blueGrey;
    }
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 2) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        backgroundColor: NotificationsScreen.primaryColor,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (_notifications.any((n) => n['is_read'] == false))
            TextButton(
              onPressed: () async {
                for (int i = 0; i < _notifications.length; i++) {
                  if (_notifications[i]['is_read'] == false) {
                    final id = _notifications[i]['id']?.toString();
                    if (id != null) await _markAsRead(id, i);
                  }
                }
              },
              child: const Text('Mark all read', style: TextStyle(color: Colors.white70, fontSize: 13)),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('No notifications yet', style: TextStyle(fontSize: 16, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 6),
                      Text('You\'ll see booking updates,\nmaintenance reminders & offers here',
                          textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey.shade200),
                    itemBuilder: (context, index) {
                      final n = _notifications[index];
                      final isRead = n['is_read'] == true;
                      final type = n['type']?.toString();
                      final id = n['id']?.toString() ?? '';

                      return InkWell(
                        onTap: () {
                          if (!isRead && id.isNotEmpty) _markAsRead(id, index);
                        },
                        child: Container(
                          color: isRead ? Colors.white : const Color(0xFFF0F7FF),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Unread dot
                              Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.only(top: 6, right: 10),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isRead ? Colors.transparent : NotificationsScreen.primaryColor,
                                ),
                              ),
                              // Icon
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: _getNotifColor(type).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(_getNotifIcon(type), color: _getNotifColor(type), size: 20),
                              ),
                              const SizedBox(width: 12),
                              // Content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      n['title']?.toString() ?? 'Notification',
                                      style: TextStyle(
                                        fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                                        fontSize: 14,
                                        color: const Color(0xFF1F2937),
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      n['message']?.toString() ?? '',
                                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _formatTime(n['created_at']?.toString()),
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
