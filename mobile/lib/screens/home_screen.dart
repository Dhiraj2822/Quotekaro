import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import 'provider_kyc_screen.dart';
import 'post_job_screen.dart';
import 'provider_job_feed_screen.dart';
import 'provider_dashboard_screen.dart'; // NEW redesigned provider dashboard
import 'quote_comparison_screen.dart';
import 'booking_confirmation_screen.dart';
import 'payment_screen.dart';
import 'wallet_screen.dart';
import 'rating_screen.dart';
import 'provider_ratings_screen.dart';
import 'live_tracking_screen.dart';
import 'chat_screen.dart';
import 'service_details_screen.dart';
import 'ai_maintenance_screen.dart';
import 'support_chatbot_screen.dart';
import 'profile_screen.dart';
import 'notifications_screen.dart';
import 'help_support_screen.dart';

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
  int _unreadNotifications = 0;
  String _selectedArea = 'Kothrud, Pune';
  DateTime? _lastBackPressTime;

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

        // Fetch unread notification count
        try {
          final notifs = await ApiService.getNotifications();
          if (mounted) {
            _unreadNotifications = notifs.where((n) => n['is_read'] == false).length;
          }
        } catch (_) {}

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

    // â”€â”€ Provider users get the fully-redesigned dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!isCustomer) {
      return ProviderDashboardScreen(
        user: widget.user,
        token: widget.token,
        onLogout: widget.onLogout,
      );
    }

    final phone = widget.user['phone_number'] ?? '';
    final name = widget.user['name'] ?? 'Customer User';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_selectedNavIndex != 0) {
          setState(() => _selectedNavIndex = 0);
          return;
        }
        final now = DateTime.now();
        if (_lastBackPressTime == null || now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit'),
              duration: Duration(seconds: 2),
            ),
          );
          return;
        }
        SystemNavigator.pop();
      },
      child: Scaffold(
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
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                isCustomer ? 'QuoteKaro Customer' : 'QuoteKaro Partner',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Colors.white),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ],
        ),
        actions: [
          if (isCustomer)
            IconButton(
              icon: Badge(
                label: Text('$_unreadNotifications'),
                isLabelVisible: _unreadNotifications > 0,
                backgroundColor: Colors.red,
                child: const Icon(Icons.notifications_outlined, color: Colors.white),
              ),
              tooltip: 'Notifications',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => NotificationsScreen(user: widget.user)),
              ).then((_) => _loadData()),
            ),
          // Profile popup menu contains: Profile, AI Assistant, Refresh, Sign Out
          PopupMenuButton<String>(
            tooltip: 'More options',
            offset: const Offset(0, 48),
            icon: const Icon(Icons.account_circle_outlined, color: Colors.white),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (val) {
              switch (val) {
                case 'profile':
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => ProfileScreen(user: widget.user, onLogout: widget.onLogout),
                  ));
                  break;
                case 'help':
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => HelpSupportScreen(user: widget.user),
                  ));
                  break;
                case 'ai':
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => SupportChatbotScreen(user: widget.user),
                  ));
                  break;
                case 'refresh':
                  _loadData();
                  break;
                case 'logout':
                  _showLogoutDialog();
                  break;
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem<String>(
                value: 'profile',
                child: Row(children: [Icon(Icons.account_circle_outlined, size: 18), SizedBox(width: 10), Text('Profile & Addresses')]),
              ),
              const PopupMenuItem<String>(
                value: 'help',
                child: Row(children: [Icon(Icons.help_outline, size: 18), SizedBox(width: 10), Text('Help & Support')]),
              ),
              if (isCustomer)
                const PopupMenuItem<String>(
                  value: 'ai',
                  child: Row(children: [Icon(Icons.smart_toy_outlined, size: 18), SizedBox(width: 10), Text('AI Assistant')]),
                ),
              const PopupMenuItem<String>(
                value: 'refresh',
                child: Row(children: [Icon(Icons.refresh, size: 18), SizedBox(width: 10), Text('Refresh Data')]),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(children: [Icon(Icons.logout, size: 18, color: Colors.red), SizedBox(width: 10), Text('Sign Out', style: TextStyle(color: Colors.red))]),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: isCustomer
          ? NavigationBar(
              selectedIndex: _selectedNavIndex,
              onDestinationSelected: (idx) => setState(() => _selectedNavIndex = idx),
              backgroundColor: Colors.white,
              elevation: 3,
              indicatorColor: HomeScreen.primaryColor.withValues(alpha: 0.15),
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
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
              ],
            )
          : null,
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
            ] else ...[
              _buildProviderOperations(),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to sign out of QuoteKaro? You will return to the login screen.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context, rootNavigator: true).popUntil((route) => route.isFirst);
              widget.onLogout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  // --- PROFILE HEADER CARD (Customer) ---
  Widget _buildUserProfileCard(String name, String phone, dynamic role, bool isCustomer) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: HomeScreen.primaryColor,
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 13, color: Color(0xFF64748B)),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          'Pune, Maharashtra',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF64748B)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isCustomer
                    ? HomeScreen.accentColor.withValues(alpha: 0.12)
                    : HomeScreen.primaryColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                role.toString().toUpperCase(),
                style: TextStyle(
                  color: isCustomer
                      ? HomeScreen.accentColor
                      : HomeScreen.primaryColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
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
        // 1. City / Service Area Picker per 06_UIUX_SPEC.md Â§2
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

        // 2. Emergency Instant Routing CTA (03_SYSTEM_DESIGN.md Â§4 & 06_UIUX_SPEC.md Â§2)
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
                        const Text('âš¡ Rapid Auto-Match', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
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

        // 3.5 AI Home Maintenance Subscription Spotlight Banner
        Container(
          margin: const EdgeInsets.only(bottom: 20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1F3864), Color(0xFF1E3A8A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.blue.withValues(alpha: 0.15),
                blurRadius: 10,
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
                MaterialPageRoute(builder: (_) => AiMaintenanceScreen(user: widget.user)),
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
                            color: Colors.amber.shade400,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.auto_awesome, color: Colors.black, size: 14),
                              SizedBox(width: 4),
                              Text('UNIQUE FEATURE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        const Text('Starts â‚¹199/mo', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'AI-Powered Home Maintenance Subscription',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Predictive health tracking for AC, RO, Fridge & appliances. Auto-detects wear patterns & includes seasonal scheduled visits.',
                      style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: HomeScreen.accentColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Explore AI Care Plans', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward, size: 14, color: Colors.white),
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

        // 4. Urban Company Service Categories Grid (2x3)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Select Service Category',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            TextButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData))),
              child: const Text('+ Post Custom Job', style: TextStyle(color: HomeScreen.accentColor, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Category grid: mainAxisExtent gives each cell a fixed height
        // so content never overflows regardless of font scale or screen width.
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            mainAxisExtent: 110, // fixed px height â€“ no overflow
          ),
          itemCount: 6,
          itemBuilder: (ctx, index) {
            final cards = [
              (title: 'Plumbing', subtitle: 'Taps, pipes, leakages', icon: Icons.plumbing, color: const Color(0xFF0284C7), id: 's-plumb-1', name: 'Tap Repair & Mixer Leakage', slug: 'tap-repair', catSlug: 'plumbing', price: 19900, desc: 'Fix dripping taps, replace faulty spindle/cartridges, and resolve water mixer leaks.'),
              (title: 'Electrician', subtitle: 'Wiring, MCBs, fixtures', icon: Icons.electrical_services, color: const Color(0xFFEA580C), id: 's-elec-1', name: 'Ceiling Fan Installation & Repair', slug: 'fan-repair', catSlug: 'electrician', price: 19900, desc: 'Ceiling fan mounting, capacitor replacement, regulator testing, and wobble correction.'),
              (title: 'Cleaning', subtitle: 'Deep home, sofa, sanitize', icon: Icons.cleaning_services, color: const Color(0xFF7C3AED), id: 's-clean-1', name: 'Full Home Deep Cleaning', slug: 'full-home-deep-cleaning', catSlug: 'cleaning', price: 249900, desc: 'Comprehensive top-to-bottom sanitization and deep cleaning of entire apartment or villa.'),
              (title: 'Appliance Repair', subtitle: 'AC, RO, Fridge, Washing', icon: Icons.home_repair_service, color: const Color(0xFF059669), id: 's-app-1', name: 'AC Servicing & Gas Charging', slug: 'ac-repair-servicing', catSlug: 'appliance-repair', price: 59900, desc: 'High-pressure jet pump wash, indoor coil cleansing, gas leak diagnosis, and cooling optimization.'),
              (title: 'Carpentry', subtitle: 'Doors, locks, furniture', icon: Icons.carpenter, color: const Color(0xFFD97706), id: 's-carp-1', name: 'Door Lock Installation & Repair', slug: 'door-repair-lock-installation', catSlug: 'carpentry', price: 29900, desc: 'Main door lock mortise, latch repair, Godrej lock installation, and door realignment.'),
              (title: 'Painting & Other', subtitle: 'Pest control, wall paint', icon: Icons.format_paint, color: const Color(0xFF16A34A), id: 's-oth-1', name: 'Pest Control & Cockroach Gel', slug: 'pest-control', catSlug: 'other-services', price: 89900, desc: 'Odorless Bayer herbal gel treatment for German cockroaches, kitchen pests, and ants.'),
            ];
            final c = cards[index];
            return _buildCategoryCard(
              title: c.title,
              subtitle: c.subtitle,
              icon: c.icon,
              color: c.color,
              onTap: () => Navigator.push(ctx, MaterialPageRoute(builder: (_) => ServiceDetailsScreen(service: {'id': c.id, 'name': c.name, 'slug': c.slug, 'category_slug': c.catSlug, 'base_price_paise': c.price, 'description': c.desc}))),
            );
          },
        ),

        const SizedBox(height: 24),

        // 4.5 Popular Services Direct Booking Row
        const Text(
          'Popular Services in Pune',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 130,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildPopularServicePill(
                title: 'Full Home Deep Clean',
                price: 'â‚¹2,499',
                rating: '4.88 â˜…',
                slug: 'full-home-deep-cleaning',
                icon: Icons.cleaning_services,
                color: Colors.purple,
              ),
              _buildPopularServicePill(
                title: 'AC Jet Foam Servicing',
                price: 'â‚¹599',
                rating: '4.93 â˜…',
                slug: 'ac-repair-servicing',
                icon: Icons.ac_unit,
                color: Colors.blue,
              ),
              _buildPopularServicePill(
                title: 'Tap Repair & Leak Fix',
                price: 'â‚¹199',
                rating: '4.89 â˜…',
                slug: 'tap-repair',
                icon: Icons.plumbing,
                color: Colors.cyan,
              ),
              _buildPopularServicePill(
                title: 'Ceiling Fan Installation',
                price: 'â‚¹199',
                rating: '4.92 â˜…',
                slug: 'fan-repair',
                icon: Icons.electrical_services,
                color: Colors.orange,
              ),
            ],
          ),
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
                const Text('ðŸ›¡ï¸ How QuoteKaro Protects Homeowners', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HomeScreen.primaryColor)),
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

        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: HomeScreen.primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.add_circle_outline, color: Colors.white),
            label: const Text('Post a Custom Job', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => PostJobScreen(onJobCreated: _loadData)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPopularServicePill({
    required String title,
    required String price,
    required String rating,
    required String slug,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ServiceDetailsScreen(
                  service: {
                    'name': title,
                    'slug': slug,
                    'category_slug': 'services',
                    'base_price_paise': 49900,
                  },
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: color.withValues(alpha: 0.12),
                      child: Icon(icon, size: 16, color: color),
                    ),
                    Text(
                      rating,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber),
                    ),
                  ],
                ),
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      price,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HomeScreen.accentColor),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: HomeScreen.accentColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('Book', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: HomeScreen.accentColor)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
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
          // Reduced padding to fit in mainAxisExtent: 110 at font scale 1.3
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min, // shrink-wrap; no spaceBetween overflow
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: color.withValues(alpha: 0.12),
                    radius: 16,
                    child: Icon(icon, color: color, size: 18),
                  ),
                  Icon(Icons.arrow_forward_ios, size: 11, color: const Color(0xFFCBD5E1)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  // Use ColorScheme so it's readable in both light and dark mode
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                'Get Quotes â†’',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
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
      statusLabel = 'âš¡ QUOTES RECEIVED';
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
                Text('Total Amount: â‚¹$priceRupees', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HomeScreen.primaryColor)),
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
  // PROVIDER OPERATIONS (Legacy â€“ providers now use ProviderDashboardScreen)
  // Kept for fallback / testing. All developer text removed.
  // ===========================================================================
  Widget _buildProviderOperations() {
    final providerProfileId = widget.user['provider_profile_id'] ?? widget.user['id'] ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Partner Tools',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HomeScreen.primaryColor),
        ),
        const SizedBox(height: 8),

        _buildFeatureTile(
          Icons.document_scanner_outlined,
          'KYC & Service Area',
          'Upload ID proof, select categories & radius',
          () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ProviderKycScreen()),
          ),
        ),
        _buildFeatureTile(
          Icons.work_outline,
          'Nearby Leads',
          'Live bidding feed matching your category',
          () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ProviderJobFeedScreen()),
          ),
        ),
        _buildFeatureTile(
          Icons.assignment_turned_in_outlined,
          'My Bookings',
          'Accepted jobs & customer location details',
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
          'Wallet & Earnings',
          'Prepaid balance, 10% deductions & top-ups',
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
          'My Ratings',
          'Honesty, Punctuality, Quality dashboard',
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

  Widget _buildFeatureTile(IconData icon, String title, String subtitle, VoidCallback? onTap) {
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
        trailing: onTap != null
            ? const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey)
            : null,
      ),
    );
  }
}