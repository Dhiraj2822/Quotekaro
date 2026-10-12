import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'chat_screen.dart';
import 'live_tracking_screen.dart';
import 'payment_screen.dart';
import 'rating_screen.dart';

class BookingConfirmationScreen extends StatelessWidget {
  final Map<String, dynamic> booking;
  final String role; // 'customer' or 'provider'

  const BookingConfirmationScreen({
    super.key,
    required this.booking,
    this.role = 'customer',
  });

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  @override
  Widget build(BuildContext context) {
    final isCustomer = role == 'customer';
    final bookingId = booking['id']?.toString() ?? 'N/A';
    final shortBookingId = bookingId.length > 8 ? bookingId.substring(0, 8).toUpperCase() : bookingId;
    final status = (booking['status'] ?? 'confirmed').toString().toUpperCase();

    // Job details
    final job = booking['job'] is Map ? Map<String, dynamic>.from(booking['job']) : <String, dynamic>{};
    final category = (job['category'] ?? booking['category'] ?? 'Service').toString();
    final description = (job['description'] ?? booking['description'] ?? 'No description provided').toString();
    final urgencyType = (job['urgency_type'] ?? booking['urgency_type'] ?? 'planned').toString();
    final isUrgent = urgencyType == 'urgent';
    final area = (job['area'] ?? booking['area'] ?? 'Pune').toString();

    // Provider details
    final provider = booking['provider'] is Map ? Map<String, dynamic>.from(booking['provider']) : <String, dynamic>{};
    final providerName = (provider['name'] ?? booking['provider_name'] ?? 'Assigned Partner').toString();
    final providerPhone = (provider['phone_number'] ?? booking['provider_phone'] ?? '+91 98765 43210').toString();
    final honesty = ((provider['avg_rating_honesty'] ?? 4.8) as num).toDouble();
    final punctuality = ((provider['avg_rating_punctuality'] ?? 4.9) as num).toDouble();
    final quality = ((provider['avg_rating_quality'] ?? 4.7) as num).toDouble();

    // Customer details (for provider view)
    final customer = booking['customer'] is Map ? Map<String, dynamic>.from(booking['customer']) : <String, dynamic>{};
    final customerName = (customer['name'] ?? booking['customer_name'] ?? 'Customer').toString();
    final customerPhone = (customer['phone_number'] ?? booking['customer_phone'] ?? '+91 99999 00001').toString();

    // Price
    final pricePaise = booking['price_paise'] ?? booking['quote']?['price_paise'] ?? 0;
    final priceRupees = (pricePaise / 100).toStringAsFixed(0);
    final etaMinutes = booking['eta_minutes'] ?? booking['quote']?['eta_minutes'];

    return Scaffold(
      appBar: AppBar(
        title: Text(isCustomer ? 'Booking Confirmed' : 'Booking Assigned'),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. Success Header Card with Urgency Distinction (06_UIUX_SPEC.md §2.5)
          Card(
            color: isUrgent ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: isUrgent ? warningColor.withValues(alpha: 0.5) : accentColor.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: isUrgent ? warningColor : accentColor,
                    child: Icon(
                      isUrgent ? Icons.bolt : Icons.check_circle,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isUrgent
                      ? (isCustomer ? 'Provider is on the way!' : 'Urgent Emergency Request!')
                      : (isCustomer ? 'Booking Confirmed!' : 'Job Assigned to You!'),
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isUrgent ? const Color(0xFF92400E) : const Color(0xFF166534),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    isUrgent
                      ? 'Nearest top-rated partner dispatched. ETA: ${etaMinutes ?? 20} mins'
                      : 'Your service appointment has been scheduled successfully.',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  // Booking Reference ID with Tap-to-Copy
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: bookingId));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Booking ID copied to clipboard')),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.confirmation_number_outlined, size: 14, color: primaryColor),
                          const SizedBox(width: 6),
                          Text(
                            'Booking #$shortBookingId',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: primaryColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.copy, size: 12, color: Colors.grey),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // 2. Provider Card (for Customer) OR Customer Card (for Provider)
          if (isCustomer) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Assigned Service Partner',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.verified, size: 12, color: accentColor),
                              SizedBox(width: 4),
                              Text('KYC Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: accentColor)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: primaryColor,
                          child: Text(
                            providerName.isNotEmpty ? providerName[0].toUpperCase() : 'P',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(providerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 2),
                              Text(providerPhone, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    // 3-axis Rating indicators (06_UIUX_SPEC.md §2.4)
                    const Text('Provider Reputation Score', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const SizedBox(height: 6),
                    _buildRatingRow('Honesty', honesty, Colors.blue),
                    _buildRatingRow('Punctuality', punctuality, Colors.amber),
                    _buildRatingRow('Quality', quality, accentColor),
                  ],
                ),
              ),
            ),
          ] else ...[
            // Provider View: Customer & Location Info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Customer & Job Location',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: accentColor,
                          child: Text(
                            customerName.isNotEmpty ? customerName[0].toUpperCase() : 'C',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 2),
                              Text(customerPhone, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 18, color: Colors.redAccent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            area,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 12),

          // 3. Service Details Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        category.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: primaryColor),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isUrgent ? warningColor.withValues(alpha: 0.15) : Colors.blue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          isUrgent ? 'URGENT' : 'PLANNED',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isUrgent ? const Color(0xFFB45309) : primaryColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.place_outlined, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(area, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      const Spacer(),
                      const Icon(Icons.timer_outlined, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        isUrgent ? 'ETA: ${etaMinutes ?? 20}m' : 'Scheduled',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // 4. Price & Payment Summary Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Payment Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: primaryColor)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Agreed Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                      Text(
                        '₹$priceRupees',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: accentColor),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.shield_outlined, size: 16, color: accentColor),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            isCustomer
                              ? 'Pay via Cash, UPI, or Card upon satisfactory work completion (Module 6).'
                              : 'Platform commission (10%) automatically reconciled upon completion.',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // 5. Action Buttons (Live Tracking & Return to Home)
          ElevatedButton.icon(
            key: const Key('booking_confirm_action_btn'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: Icon(isCustomer ? Icons.navigation : Icons.directions_car),
            label: Text(
              isCustomer ? 'Live Tracking & ETA' : 'Update Status / En Route',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LiveTrackingScreen(
                    booking: booking,
                    isCustomer: isCustomer,
                  ),
                ),
              );
            },
          ),

          if (isCustomer) ...[
            const SizedBox(height: 10),
            ElevatedButton.icon(
              key: const Key('booking_make_payment_btn'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1F3864),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.payment_rounded),
              label: const Text(
                'Make Payment / Select Method',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PaymentScreen(booking: booking),
                  ),
                );
              },
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              key: const Key('booking_rate_service_btn'),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.star_rate_rounded),
              label: const Text(
                'Rate Service & Proof-of-Work',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RatingScreen(booking: booking),
                  ),
                );
              },
            ),
          ],

          const SizedBox(height: 10),

          ElevatedButton.icon(
            key: const Key('booking_open_chat_btn'),
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.chat_bubble_outline),
            label: Text(
              isCustomer ? 'Chat with Partner' : 'Chat with Customer',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatScreen(
                    bookingId: bookingId,
                    otherParticipantName: isCustomer ? providerName : customerName,
                    currentUserRole: role,
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 10),

          OutlinedButton(
            key: const Key('booking_confirm_home_btn'),
            style: OutlinedButton.styleFrom(
              foregroundColor: primaryColor,
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: primaryColor),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(isCustomer ? 'Back to Home' : 'Back to Job Feed'),
            onPressed: () {
              Navigator.popUntil(context, (route) => route.isFirst);
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildRatingRow(String axis, double score, Color color) {
    final normalized = (score / 5.0).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        children: [
          SizedBox(
            width: 75,
            child: Text(axis, style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: normalized,
                backgroundColor: const Color(0xFFE2E8F0),
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 5,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            score.toStringAsFixed(1),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
