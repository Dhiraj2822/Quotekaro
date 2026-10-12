import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'provider_kyc_screen.dart';
import 'post_job_screen.dart';
import 'provider_job_feed_screen.dart';
import 'quote_comparison_screen.dart';
import 'booking_confirmation_screen.dart';
import 'payment_screen.dart';
import 'wallet_screen.dart';
import 'rating_screen.dart';
import 'provider_ratings_screen.dart';
import 'live_tracking_screen.dart';
import 'chat_screen.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final VoidCallback onLogout;

  const HomeScreen({
    super.key,
    required this.user,
    required this.token,
    required this.onLogout,
  });

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedNavIndex = 0;
  bool _isLoading = false;
  List<dynamic> _jobs = [];
  List<dynamic> _bookings = [];
  String _selectedArea = 'Kothrud, Pune';

  final List<String> _puneAreas = [
    'Kothrud, Pune',
    'Baner, Pune',
    'Shivajinagar, Pune',
    'Viman Nagar, Pune',
    'Hadapsar, Pune',
    'Aundh, Pune',
    'Wakad, Pune',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final role = widget.user['role'] ?? 'customer';
      if (role == 'customer') {
        final jobsFuture = ApiService.getMyJobs();
        final bookingsFuture = ApiService.getMyBookings();
        final results = await Future.wait([jobsFuture, bookingsFuture]);

        if (!mounted) return;
        setState(() {
          _jobs = results[0];
          _bookings = results[1];
          _isLoading = false;
        });
      } else {
        final bookings = await ApiService.getMyBookings();
        if (!mounted) return;
        setState(() {
          _bookings = bookings;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.user['role'] ?? 'customer';
    final isCustomer = role == 'customer';
    final phone = widget.user['phone_number'] ?? '';
    final name = widget.user['name'] ?? (isCustomer ? 'Customer User' : 'Service Partner');

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: HomeScreen.accentColor,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('Q', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
            ),
            const SizedBox(width: 10),
            Text(
              isCustomer ? 'QuoteKaro Customer' : 'QuoteKaro Partner',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh Data',
            onPressed: _loadData,
          ),
          IconButton(
            key: const Key('logout_button'),
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Sign Out',
            onPressed: widget.onLogout,
          ),
        ],
      ),
      bottomNavigationBar: isCustomer
          ? NavigationBar(
              selectedIndex: _selectedNavIndex,
              onDestinationSelected: (idx) => setState(() => _selectedNavIndex = idx),
              backgroundColor: Colors.white,
              elevation: 3,
              destinations: [
                const NavigationDestination(
                  icon: Icon(Icons.home_repair_service_outlined),
                  selectedIcon: Icon(Icons.home_repair_service, color: HomeScreen.primaryColor),
                  label: 'Services',
                ),
                NavigationDestination(
                  icon: Badge(
                    label: Text('${_jobs.length}'),
                    isLabelVisible: _jobs.isNotEmpty,
                    backgroundColor: HomeScreen.primaryColor,
                    child: const Icon(Icons.work_outline),
                  ),
                  selectedIcon: Badge(
                    label: Text('${_jobs.length}'),
                    isLabelVisible: _jobs.isNotEmpty,
                    backgroundColor: HomeScreen.primaryColor,
                    child: const Icon(Icons.work, color: HomeScreen.primaryColor),
                  ),
                  label: 'My Jobs',
                ),
                NavigationDestination(
                  icon: Badge(
                    label: Text('${_bookings.length}'),
                    isLabelVisible: _bookings.isNotEmpty,
                    backgroundColor: HomeScreen.accentColor,
                    child: const Icon(Icons.receipt_long_outlined),
                  ),
                  selectedIcon: Badge(
                    label: Text('${_bookings.length}'),
                    isLabelVisible: _bookings.isNotEmpty,
                    backgroundColor: HomeScreen.accentColor,
                    child: const Icon(Icons.receipt_long, color: HomeScreen.accentColor),
                  ),
                  label: 'Bookings',
                ),
                const NavigationDestination(
                  icon: Icon(Icons.science_outlined),
                  selectedIcon: Icon(Icons.science, color: HomeScreen.primaryColor),
                  label: 'Demo Cases',
                ),
              ],
            )
          : null,
      floatingActionButton: isCustomer
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData)),
              ),
              backgroundColor: HomeScreen.primaryColor,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Post a Job', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : FloatingActionButton.extended(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProviderJobFeedScreen()),
              ),
              backgroundColor: HomeScreen.accentColor,
              icon: const Icon(Icons.flash_on, color: Colors.white),
              label: const Text('Live Job Feed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // User Session Profile Card
            _buildUserProfileCard(name, phone, role, isCustomer),

            const SizedBox(height: 16),

            // Main Dynamic Body based on Role & Navigation
            if (isCustomer) ...[
              if (_selectedNavIndex == 0) _buildCustomerServicesTab(),
              if (_selectedNavIndex == 1) _buildCustomerJobsTab(),
              if (_selectedNavIndex == 2) _buildCustomerBookingsTab(),
              if (_selectedNavIndex == 3) _buildDemoScenariosTab(),
            ] else ...[
              _buildProviderOperations(),
            ],

            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  // --- PROFILE HEADER CARD (Preserves exact widget test expectations) ---
  Widget _buildUserProfileCard(String name, String phone, dynamic role, bool isCustomer) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: HomeScreen.primaryColor,
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HomeScreen.primaryColor),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        phone,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCustomer
                        ? HomeScreen.accentColor.withValues(alpha: 0.12)
                        : HomeScreen.primaryColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    role.toString().toUpperCase(),
                    style: TextStyle(
                      color: isCustomer ? HomeScreen.accentColor : HomeScreen.primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                const Icon(Icons.verified_user_outlined, size: 16, color: HomeScreen.accentColor),
                const SizedBox(width: 6),
                const Text(
                  'Session Active (JWT Token Verified)',
                  style: TextStyle(fontSize: 12, color: HomeScreen.accentColor, fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                Text(
                  'Pune, Maharashtra',
                  style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // CUSTOMER TAB 0: EXPLORE SERVICES, EMERGENCY BANNER & CATEGORIES
  // ===========================================================================
  Widget _buildCustomerServicesTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. City / Service Area Picker per 06_UIUX_SPEC.md §2
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              const Icon(Icons.location_on, color: HomeScreen.primaryColor, size: 20),
              const SizedBox(width: 8),
              const Text('Service Area:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedArea,
                    isDense: true,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: HomeScreen.primaryColor),
                    icon: const Icon(Icons.keyboard_arrow_down, size: 18),
                    items: _puneAreas.map((area) => DropdownMenuItem(value: area, child: Text(area))).toList(),
                    onChanged: (newArea) {
                      if (newArea != null) {
                        setState(() => _selectedArea = newArea);
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 2. Emergency Instant Routing CTA (03_SYSTEM_DESIGN.md §4 & 06_UIUX_SPEC.md §2)
        Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFB45309), Color(0xFFD97706)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.orange.withValues(alpha: 0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PostJobScreen(
                    initialCategory: 'plumbing',
                    initialUrgent: true,
                    onJobCreated: _loadData,
                  ),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.bolt, color: Color(0xFFB45309), size: 16),
                              SizedBox(width: 4),
                              Text('EMERGENCY DISASTER?', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFFB45309))),
                            ],
                          ),
                        ),
                        const Spacer(),
                        const Text('⚡ Rapid Auto-Match', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Burst Pipe, Sparking Switch, or Water Leak?',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Bypasses bidding entirely. Nearest top-rated professional is dispatched in under 2 minutes at platform-set transparent rates.',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Book Urgent Repair', style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.bold, fontSize: 13)),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward, size: 14, color: Color(0xFFB45309)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 20),

        // 3. Active Alert Banner if Quotes are Ready to Compare
        if (_jobs.any((j) => (j['status'] == 'quoted' || (j['quotes_count'] ?? 0) > 0)))
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: HomeScreen.accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: HomeScreen.accentColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: HomeScreen.accentColor,
                  radius: 18,
                  child: Icon(Icons.notification_important, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Quotes Ready to Compare!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HomeScreen.accentColor)),
                      const SizedBox(height: 2),
                      const Text('Providers submitted competitive bids with blended ratings.', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                    ],
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: HomeScreen.accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () {
                    final quoteJob = _jobs.firstWhere((j) => j['status'] == 'quoted', orElse: () => _jobs.first);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => QuoteComparisonScreen(job: Map<String, dynamic>.from(quoteJob))),
                    ).then((_) => _loadData());
                  },
                  child: const Text('Compare'),
                ),
              ],
            ),
          ),

        // 4. Four Core Service Categories Grid (2x2) per 06_UIUX_SPEC.md §2
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Select Service Category',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HomeScreen.primaryColor),
            ),
            TextButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData))),
              child: const Text('+ Post Job', style: TextStyle(color: HomeScreen.accentColor, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.35,
          children: [
            _buildCategoryCard(
              title: 'Plumbing',
              subtitle: 'Taps, pipes, leakages',
              icon: Icons.plumbing,
              color: const Color(0xFF0284C7),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PostJobScreen(initialCategory: 'plumbing', onJobCreated: _loadData)),
              ),
            ),
            _buildCategoryCard(
              title: 'Electrical',
              subtitle: 'Wiring, MCBs, fixtures',
              icon: Icons.electrical_services,
              color: const Color(0xFFEA580C),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PostJobScreen(initialCategory: 'electrical', onJobCreated: _loadData)),
              ),
            ),
            _buildCategoryCard(
              title: 'Painting',
              subtitle: 'Interior, exterior, texture',
              icon: Icons.format_paint,
              color: const Color(0xFF16A34A),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PostJobScreen(initialCategory: 'painting', onJobCreated: _loadData)),
              ),
            ),
            _buildCategoryCard(
              title: 'Cleaning',
              subtitle: 'Deep home, sofa, sanitize',
              icon: Icons.cleaning_services,
              color: const Color(0xFF7C3AED),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PostJobScreen(initialCategory: 'cleaning', onJobCreated: _loadData)),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // 5. Why QuoteKaro (PBL Differentiators Card)
        Card(
          color: const Color(0xFFF1F5F9),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🛡️ How QuoteKaro Protects Homeowners', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HomeScreen.primaryColor)),
                const SizedBox(height: 8),
                _buildValuePropRow(Icons.balance, 'Blended Scoring', 'Quality & honesty are balanced with price so cheap outliers don\'t win unfairly.'),
                const SizedBox(height: 6),
                _buildValuePropRow(Icons.camera_alt_outlined, 'Proof of Work', 'Before & after photos are mandatory for completion verification.'),
                const SizedBox(height: 6),
                _buildValuePropRow(Icons.account_balance_wallet_outlined, '10% Commission Escrow', 'Platform commission auto-deducted on cash and digital.'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: color.withValues(alpha: 0.12),
                    radius: 18,
                    child: Icon(icon, color: color, size: 20),
                  ),
                  Icon(Icons.arrow_forward_ios, size: 12, color: const Color(0xFFCBD5E1)),
                ],
              ),
              const SizedBox(height: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HomeScreen.primaryColor)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Text('Get Quotes →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildValuePropRow(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: HomeScreen.primaryColor),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 11, color: Color(0xFF334155)),
              children: [
                TextSpan(text: '$title: ', style: const TextStyle(fontWeight: FontWeight.bold)),
                TextSpan(text: desc),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // CUSTOMER TAB 1: MY JOBS & LIVE BIDS
  // ===========================================================================
  Widget _buildCustomerJobsTab() {
    if (_isLoading) {
      return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    }

    if (_jobs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Icon(Icons.work_history_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('No Jobs Posted Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: HomeScreen.primaryColor)),
              const SizedBox(height: 6),
              const Text('Describe your plumbing, electrical, or painting issue to receive bids from verified local professionals.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: HomeScreen.primaryColor, foregroundColor: Colors.white),
                icon: const Icon(Icons.add),
                label: const Text('Post Your First Job'),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData))),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('My Posted Requests (${_jobs.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HomeScreen.primaryColor)),
            TextButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('New Job'),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData))),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._jobs.map((job) => _buildJobCard(Map<String, dynamic>.from(job))),
      ],
    );
  }

  Widget _buildJobCard(Map<String, dynamic> job) {
    final status = (job['status'] ?? 'open').toString().toLowerCase();
    final category = (job['category'] ?? 'plumbing').toString();
    final urgency = (job['urgency_type'] ?? 'planned').toString();
    final isUrgent = urgency == 'urgent';
    final desc = job['description'] ?? 'No description provided';
    final area = job['area'] ?? 'Pune';

    Color statusColor = Colors.blue;
    String statusLabel = 'OPEN FOR BIDS';
    if (status == 'quoted') {
      statusColor = HomeScreen.accentColor;
      statusLabel = '⚡ QUOTES RECEIVED';
    } else if (status == 'booked' || status == 'in_progress') {
      statusColor = Colors.orange.shade800;
      statusLabel = 'ASSIGNED & BOOKED';
    } else if (status == 'completed') {
      statusColor = Colors.teal;
      statusLabel = 'COMPLETED';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: status == 'quoted' ? HomeScreen.accentColor.withValues(alpha: 0.5) : const Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isUrgent ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      Icon(isUrgent ? Icons.bolt : Icons.calendar_today, size: 13, color: isUrgent ? const Color(0xFFB45309) : HomeScreen.primaryColor),
                      const SizedBox(width: 4),
                      Text(category.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isUrgent ? const Color(0xFFB45309) : HomeScreen.primaryColor)),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(desc, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1E293B))),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(area, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                const SizedBox(width: 12),
                const Icon(Icons.access_time, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  job['created_at'] != null ? job['created_at'].toString().split('T').first : 'Today',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (status == 'quoted')
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: HomeScreen.accentColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.compare_arrows, size: 16),
                    label: const Text('Compare Quotes & Book', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => QuoteComparisonScreen(job: job)),
                    ).then((_) => _loadData()),
                  )
                else if (status == 'booked' || status == 'in_progress')
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: HomeScreen.primaryColor, foregroundColor: Colors.white),
                    icon: const Icon(Icons.map, size: 16),
                    label: const Text('Track Provider Live'),
                    onPressed: () async {
                      final bookings = await ApiService.getMyBookings();
                      final booking = bookings.firstWhere((b) => b['job_id'] == job['id'], orElse: () => bookings.isNotEmpty ? bookings.first : null);
                      if (booking != null && context.mounted) {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => LiveTrackingScreen(booking: Map<String, dynamic>.from(booking))));
                      }
                    },
                  )
                else
                  OutlinedButton.icon(
                    icon: const Icon(Icons.refresh, size: 14),
                    label: const Text('Check for Quotes'),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => QuoteComparisonScreen(job: job)),
                    ).then((_) => _loadData()),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // CUSTOMER TAB 2: MY BOOKINGS & LIVE TRACKING
  // ===========================================================================
  Widget _buildCustomerBookingsTab() {
    if (_isLoading) {
      return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    }

    if (_bookings.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('No Confirmed Bookings Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: HomeScreen.primaryColor)),
              const SizedBox(height: 6),
              const Text('When you accept a provider\'s quote or post an emergency request, your confirmed booking and live GPS tracking will appear here.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: HomeScreen.primaryColor, foregroundColor: Colors.white),
                icon: const Icon(Icons.add),
                label: const Text('Browse Quotes / Post Job'),
                onPressed: () => setState(() => _selectedNavIndex = 1),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Active & Past Bookings (${_bookings.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HomeScreen.primaryColor)),
        const SizedBox(height: 8),
        ..._bookings.map((booking) => _buildBookingCard(Map<String, dynamic>.from(booking))),
      ],
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final status = (booking['status'] ?? 'confirmed').toString().toLowerCase();
    final provider = booking['provider'] is Map ? booking['provider'] : {};
    final providerName = provider['name'] ?? 'Assigned Partner';
    final priceRupees = ((booking['price_paise'] ?? 0) / 100).toStringAsFixed(0);
    final bookingId = (booking['id'] ?? '').toString();

    Color statusColor = Colors.orange.shade800;
    String statusText = 'CONFIRMED';
    if (status == 'in_progress') {
      statusColor = Colors.blue.shade700;
      statusText = 'IN PROGRESS';
    } else if (status == 'completed') {
      statusColor = HomeScreen.accentColor;
      statusText = 'COMPLETED';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: HomeScreen.primaryColor,
                  child: Text(providerName.isNotEmpty ? providerName[0].toUpperCase() : 'P', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(providerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text('Booking ID: ${bookingId.length > 8 ? bookingId.substring(0, 8) : bookingId}...', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(statusText, style: TextStyle(color: statusColor, fontWeight: FontWeight.w900, fontSize: 10)),
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total Amount: ₹$priceRupees', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HomeScreen.primaryColor)),
                Text('Payment: ${booking['payment_method'] ?? 'Pending'}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: HomeScreen.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  icon: const Icon(Icons.navigation, size: 14),
                  label: const Text('Live Tracking'),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => LiveTrackingScreen(booking: booking, isCustomer: true)),
                  ).then((_) => _loadData()),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  icon: const Icon(Icons.chat_bubble_outline, size: 14),
                  label: const Text('In-App Chat'),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        bookingId: bookingId,
                        otherParticipantName: providerName,
                        currentUserRole: 'customer',
                      ),
                    ),
                  ),
                ),
                if (status != 'completed')
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                    icon: const Icon(Icons.payment, size: 14),
                    label: const Text('Pay / Invoice'),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => PaymentScreen(booking: booking)),
                    ).then((_) => _loadData()),
                  )
                else
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: HomeScreen.accentColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    icon: const Icon(Icons.star, size: 14),
                    label: const Text('Rate Service (3-Axis)'),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => RatingScreen(booking: booking)),
                    ).then((_) => _loadData()),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // CUSTOMER TAB 3: JURY DEMO TEST CASES & ACCOUNTS
  // ===========================================================================
  Widget _buildDemoScenariosTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Jury Evaluation Accounts & Flows',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HomeScreen.primaryColor),
        ),
        const SizedBox(height: 6),
        const Text(
          'Log in with any of these pre-seeded customer accounts (OTP 123456) to demonstrate specific PBL grading criteria:',
          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 14),

        _buildScenarioCard(
          title: 'Scenario A: Planned Job & Blended Sorting',
          customerName: 'Kavita Patil',
          phone: '+919999900010',
          badge: 'Bidding Engine',
          badgeColor: HomeScreen.primaryColor,
          description: 'Has an active 3BHK Painting job with 3 submitted provider quotes. Test side-by-side comparison, blended score weighting (ratings vs price), and accept quote.',
        ),

        const SizedBox(height: 10),

        _buildScenarioCard(
          title: 'Scenario B: Urgent Emergency Auto-Match',
          customerName: 'Rahul Deshmukh',
          phone: '+919999900020',
          badge: 'Rapid Routing',
          badgeColor: const Color(0xFFB45309),
          description: 'Has an urgent Burst Pipe plumbing emergency with Ramesh Plumber already auto-dispatched. Test live map tracking, ETA countdown, and in-app chat.',
        ),

        const SizedBox(height: 10),

        _buildScenarioCard(
          title: 'Scenario C: Cash Leakage & 3-Axis Ratings',
          customerName: 'Pooja Kulkarni',
          phone: '+919999900030',
          badge: 'Anti-Disintermediation',
          badgeColor: HomeScreen.accentColor,
          description: 'Has a completed cash job. Test 3-axis review (Honesty, Punctuality, Quality), photo proof-of-work upload, and inspect the provider\'s wallet ledger for the 10% auto-deduction.',
        ),

        const SizedBox(height: 16),

        Center(
          child: TextButton.icon(
            icon: const Icon(Icons.logout),
            label: const Text('Log Out to Switch Account'),
            onPressed: widget.onLogout,
          ),
        ),
      ],
    );
  }

  Widget _buildScenarioCard({
    required String title,
    required String customerName,
    required String phone,
    required String badge,
    required Color badgeColor,
    required String description,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HomeScreen.primaryColor)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(badge, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('Account: $customerName ($phone)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
            const SizedBox(height: 4),
            Text(description, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // PROVIDER OPERATIONS TAB (For Service Partners)
  // ===========================================================================
  Widget _buildProviderOperations() {
    final providerProfileId = widget.user['provider_profile_id'] ?? widget.user['id'] ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Provider Operations (06_UIUX_SPEC.md §3)',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HomeScreen.primaryColor),
        ),
        const SizedBox(height: 8),

        _buildFeatureTile(
          Icons.document_scanner_outlined,
          'KYC Verification & Service Area',
          'Upload ID proof, select categories & radius',
          'Module 2',
          () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ProviderKycScreen()),
          ),
        ),
        _buildFeatureTile(
          Icons.work_outline,
          'Nearby Job Leads',
          'Live bidding feed matching your category',
          'Module 3',
          () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ProviderJobFeedScreen()),
          ),
        ),
        _buildFeatureTile(
          Icons.assignment_turned_in_outlined,
          'My Assigned Bookings',
          'Accepted jobs & customer location details',
          'Module 4',
          () async {
            try {
              final bookings = await ApiService.getMyBookings();
              if (!context.mounted) return;
              if (bookings.isNotEmpty) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookingConfirmationScreen(
                      booking: Map<String, dynamic>.from(bookings.first),
                      role: 'provider',
                    ),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('No assigned bookings yet. Submit quotes on open leads!')),
                );
              }
            } catch (e) {
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Error loading bookings: $e')),
              );
            }
          },
        ),
        _buildFeatureTile(
          Icons.account_balance_wallet_outlined,
          'Partner Wallet & Commission',
          'Prepaid balance, 10% deductions & top-ups',
          'Module 6',
          () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WalletScreen(providerProfileId: providerProfileId.toString()),
              ),
            );
          },
        ),
        _buildFeatureTile(
          Icons.star_rate_outlined,
          'Reputation & 3-Axis Scores',
          'Honesty, Punctuality, Quality ratings dashboard',
          'Module 7',
          () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ProviderRatingsScreen(providerProfileId: providerProfileId.toString()),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildFeatureTile(IconData icon, String title, String subtitle, String moduleTag, VoidCallback? onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFF1F5F9),
          child: Icon(icon, color: HomeScreen.primaryColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(moduleTag, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF475569))),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 6),
              const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
            ],
          ],
        ),
      ),
    );
  }
}
