import 'package:flutter/material.dart';
import 'support_chatbot_screen.dart';
import 'terms_privacy_screen.dart';

class HelpSupportScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const HelpSupportScreen({super.key, required this.user});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  final List<Map<String, dynamic>> _faqs = [
    {
      'category': 'Bookings & Quotations',
      'q': 'How do I request quotes from verified providers?',
      'a': 'Select your required service category, describe the issue, and provide your location. You will see a list of verified nearby providers with 3-axis performance ratings (Honesty, Punctuality, Quality). Select up to 3 providers to request competitive quotes.'
    },
    {
      'category': 'Bookings & Quotations',
      'q': 'What is the difference between Planned and Urgent jobs?',
      'a': 'Planned jobs allow providers up to 24 hours to submit detailed quotes with custom pricing and arrival dates. Urgent jobs have a 10-minute fast response window with the nearest available technicians dispatched immediately.'
    },
    {
      'category': 'Payments & Commission',
      'q': 'Which payment methods are accepted?',
      'a': 'QuoteKaro supports UPI (Google Pay, PhonePe, Paytm), Net Banking, Credit/Debit cards, and Cash on Delivery with digitally issued invoices.'
    },
    {
      'category': 'Payments & Commission',
      'q': 'How does the Partner Wallet and 10% commission work?',
      'a': 'For service partners, QuoteKaro charges a transparent 10% platform commission on completed jobs. Commission is automatically deducted from your prepaid partner wallet. Providers must maintain a minimum wallet balance of ₹100 to receive leads.'
    },
    {
      'category': 'Safety & Verification',
      'q': 'How are technicians verified?',
      'a': 'Every technician must submit government-issued ID proof (Aadhaar, Voter ID, or Trade License) and undergo background review before approval by our admin verification team.'
    },
    {
      'category': 'Safety & Verification',
      'q': 'How does the Start Job OTP work?',
      'a': 'When the technician arrives at your premises, a 4-digit security OTP is sent to your phone. Share this OTP only after the technician is on-site to officially start the service countdown.'
    },
    {
      'category': 'Cancellations & Refunds',
      'q': 'What is the cancellation policy?',
      'a': 'You can cancel free of charge before the technician has been dispatched. For cancellations after the technician is en route, a standard ₹50 convenience fee may apply to compensate partner travel expenses.'
    },
    {
      'category': 'AI Maintenance & Plans',
      'q': 'What does the Care Subscription include?',
      'a': 'The Care Subscription includes free quarterly preventive maintenance checkups, priority 1-hour emergency dispatch, and an automatic 15% discount on all spare parts and labor.'
    },
  ];

  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final filteredFaqs = _searchQuery.isEmpty
        ? _faqs
        : _faqs.where((f) {
            final q = (f['q'] as String).toLowerCase();
            final a = (f['a'] as String).toLowerCase();
            final s = _searchQuery.toLowerCase();
            return q.contains(s) || a.contains(s);
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1F3864), Color(0xFF2C4D8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.support_agent_rounded, color: Colors.white, size: 28),
                    SizedBox(width: 10),
                    Text(
                      'How can we help you?',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Search answers, chat with our AI assistant, or connect with our Pune support center.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 16),
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search queries, topics, or issues…',
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search, size: 20, color: primaryColor),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Quick Action Cards
          Row(
            children: [
              Expanded(
                child: _buildActionCard(
                  icon: Icons.smart_toy_outlined,
                  color: const Color(0xFF2563EB),
                  title: 'AI Assistant',
                  subtitle: 'Instant answers',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => SupportChatbotScreen(user: widget.user)),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionCard(
                  icon: Icons.phone_in_talk_outlined,
                  color: accentColor,
                  title: 'Toll-Free Helpline',
                  subtitle: '1800-209-4357',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Helpline: 1800-209-4357 (Mon–Sun 8 AM – 10 PM)')),
                    );
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: _buildActionCard(
                  icon: Icons.email_outlined,
                  color: const Color(0xFF7C3AED),
                  title: 'Email Support',
                  subtitle: 'support@quotekaro.com',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email support ticket to: support@quotekaro.com')),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionCard(
                  icon: Icons.gavel_outlined,
                  color: const Color(0xFFEA580C),
                  title: 'Dispute Arbitration',
                  subtitle: '24-hr resolution',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Operations arbitration team active. Escalated directly to admin portal.')),
                    );
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Legal & Compliance Link
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEFF6FF),
                child: Icon(Icons.shield_outlined, color: primaryColor, size: 22),
              ),
              title: const Text('Privacy Policy & Terms of Service', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor)),
              subtitle: const Text('DPDP Act 2023 · Grievance Redressal · 30-Day Warranty', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.chevron_right, size: 20, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const TermsPrivacyScreen()),
                );
              },
            ),
          ),

          const SizedBox(height: 24),

          // Frequently Asked Questions
          const Text(
            'Frequently Asked Questions',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
          ),
          const SizedBox(height: 10),

          if (filteredFaqs.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: const Center(
                child: Text('No answers match your search. Tap AI Assistant above for 24/7 help.', style: TextStyle(color: Colors.grey, fontSize: 13)),
              ),
            )
          else
            ...filteredFaqs.map((faq) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      leading: const Icon(Icons.help_outline, color: primaryColor, size: 20),
                      title: Text(
                        faq['q'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: primaryColor),
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                          child: Text(
                            faq['a'] as String,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                )),

          const SizedBox(height: 16),

          // Legal & Compliance Link
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEFF6FF),
                child: Icon(Icons.shield_outlined, color: primaryColor, size: 22),
              ),
              title: const Text('Privacy Policy & Terms of Service', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor)),
              subtitle: const Text('DPDP Act 2023 · Grievance Redressal · 30-Day Warranty', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.chevron_right, size: 20, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const TermsPrivacyScreen()),
                );
              },
            ),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor)),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}

