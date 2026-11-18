import 'package:flutter/material.dart';
import '../services/api_service.dart';

class TermsPrivacyScreen extends StatefulWidget {
  final int initialTabIndex; // 0 for Privacy, 1 for Terms

  const TermsPrivacyScreen({super.key, this.initialTabIndex = 0});

  @override
  State<TermsPrivacyScreen> createState() => _TermsPrivacyScreenState();
}

class _TermsPrivacyScreenState extends State<TermsPrivacyScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _privacyData;
  Map<String, dynamic>? _termsData;
  bool _isLoading = true;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _loadLegalContent();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadLegalContent() async {
    try {
      final results = await Future.wait([
        ApiService.getPrivacyPolicy(),
        ApiService.getTermsOfService(),
      ]);
      if (mounted) {
        setState(() {
          _privacyData = results[0];
          _termsData = results[1];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Legal & Compliance'),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: accentColor,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          tabs: const [
            Tab(text: 'Privacy Policy', icon: Icon(Icons.privacy_tip_outlined, size: 20)),
            Tab(text: 'Terms of Service', icon: Icon(Icons.gavel_outlined, size: 20)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildDocumentView(
                  title: 'QuoteKaro Privacy Policy',
                  badge: 'DPDP Act 2023 Compliant',
                  effectiveDate: _privacyData?['effectiveDate'] ?? '2026-01-01',
                  sections: _privacyData?['sections'] ?? _defaultPrivacySections,
                ),
                _buildDocumentView(
                  title: 'QuoteKaro Terms of Service',
                  badge: 'IT Act 2000 & E-Commerce Rules',
                  effectiveDate: _termsData?['effectiveDate'] ?? '2026-01-01',
                  sections: _termsData?['sections'] ?? _defaultTermsSections,
                ),
              ],
            ),
    );
  }

  Widget _buildDocumentView({
    required String title,
    required String badge,
    required String effectiveDate,
    required List<dynamic> sections,
  }) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Header Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                  Text(
                    'Effective: $effectiveDate',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryColor),
              ),
              const SizedBox(height: 6),
              const Text(
                'QuoteKaro Marketplace Technologies Pvt. Ltd. · Pune & PCMC, Maharashtra, India',
                style: TextStyle(fontSize: 12, color: Color(0xFF475569)),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Render document sections
        ...sections.map((sec) {
          final heading = sec['heading'] ?? sec['title'] ?? '';
          final content = sec['content'] ?? '';
          final points = sec['points'] as List<dynamic>?;
          final subsections = sec['subsections'] as List<dynamic>?;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    heading,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: primaryColor),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    content,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF334155), height: 1.45),
                  ),
                  if (points != null && points.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ...points.map((pt) => Padding(
                          padding: const EdgeInsets.only(bottom: 6.0, left: 6.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('• ', style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold)),
                              Expanded(
                                child: Text(
                                  pt.toString(),
                                  style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.4),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                  if (subsections != null && subsections.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ...subsections.map((sub) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                sub['title'] ?? '',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: Color(0xFF1E293B)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                sub['details'] ?? '',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                              ),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
          );
        }),

        // Grievance Redressal Banner
        Container(
          margin: const EdgeInsets.only(top: 8, bottom: 24),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: primaryColor, size: 18),
                  SizedBox(width: 8),
                  Text('Questions or Data Requests?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor)),
                ],
              ),
              SizedBox(height: 6),
              Text(
                'Contact our Grievance Officer at grievance@quotekaro.com. All privacy requests and data deletion requests are processed within 15 working days.',
                style: TextStyle(fontSize: 12, color: Color(0xFF1E3A8A), height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static const List<Map<String, dynamic>> _defaultPrivacySections = [
    {
      'heading': '1. Information We Collect',
      'content': 'We collect your mobile number, email address, service location in Pune/PCMC, appliance information, and before-and-after service photos to fulfill bookings and generate AI maintenance predictions.',
    },
    {
      'heading': '2. How Data is Handled',
      'content': 'Your details are protected with 256-bit encryption. Phone numbers are only shared with your assigned technician upon booking confirmation for coordination.',
    },
    {
      'heading': '3. Compliance with Indian Law',
      'content': 'QuoteKaro adheres strictly to the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.',
    }
  ];

  static const List<Map<String, dynamic>> _defaultTermsSections = [
    {
      'heading': '1. Platform Intermediary',
      'content': 'QuoteKaro connects residential customers with vetted independent service professionals in Pune. We facilitate transparent pricing, 3-axis quality ratings, and dispute resolution.',
    },
    {
      'heading': '2. 30-Day Service Warranty',
      'content': 'All standard bookings carry a 30-day service warranty on repair work. If the same issue recurs within 30 days, re-inspection and repair is covered.',
    },
    {
      'heading': '3. Dispute Arbitration',
      'content': 'Disputes are adjudicated by our platform tribunal using photographic evidence and timestamps with refunds issued to the customer wallet or bank account within 48 hours.',
    }
  ];
}
