import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'add_appliance_screen.dart';
import 'service_details_screen.dart';

class AiMaintenanceScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const AiMaintenanceScreen({super.key, required this.user});

  @override
  State<AiMaintenanceScreen> createState() => _AiMaintenanceScreenState();
}

class _AiMaintenanceScreenState extends State<AiMaintenanceScreen> {
  Map<String, dynamic>? _dashboardData;
  List<dynamic> _plans = [];
  bool _isLoading = true;
  String _selectedProperty = 'All Properties';

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final dashboard = await ApiService.getMaintenanceDashboard();
      final plans = await ApiService.getSubscriptionPlans();
      if (mounted) {
        setState(() {
          _dashboardData = dashboard;
          _plans = plans;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSubscriptionModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          builder: (_, controller) {
            return ListView(
              controller: controller,
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'QuoteKaro Home Care Plans',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: primaryColor),
                ),
                const Text(
                  'Predictive AI health monitoring, free seasonal visits & discounts on all home upkeep.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 20),
                ..._plans.map((p) {
                  final isStandard = p['tier'] == 'standard';
                  final priceRs = ((p['monthly_price_paise'] ?? 19900) / 100).round();
                  final features = p['features'] as List<dynamic>? ?? [];

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isStandard ? const Color(0xFFF0FDF4) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isStandard ? accentColor : Colors.grey.shade300, width: isStandard ? 2 : 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            if (isStandard)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: accentColor, borderRadius: BorderRadius.circular(10)),
                                child: const Text('RECOMMENDED', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text('₹$priceRs', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: primaryColor)),
                            const Text(' / month', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                        const Divider(height: 20),
                        ...features.map((f) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.check, color: accentColor, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(f.toString(), style: const TextStyle(fontSize: 12))),
                                ],
                              ),
                            )),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () async {
                              Navigator.pop(ctx);
                              await ApiService.subscribeToPlan(planId: p['id']);
                              _loadData();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Subscribed to ${p['name']} successfully!')),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isStandard ? accentColor : primaryColor,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: Text('Subscribe to ${p['name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final metrics = _dashboardData?['metrics'] ?? {};
    final subscription = _dashboardData?['subscription'];
    final appliances = _dashboardData?['appliances'] as List<dynamic>? ?? [];
    final upcoming = _dashboardData?['upcoming_maintenance'] as List<dynamic>? ?? [];

    final totalAppliances = metrics['total_appliances'] ?? appliances.length;
    final requiringService = metrics['requiring_maintenance'] ?? 0;
    final avgHealth = metrics['average_health_score'] ?? 85;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Home Maintenance Hub', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Subscription Hero Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1F3864), Color(0xFF2C5282)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.verified_user, color: Colors.amber, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            subscription?['plan_name'] ?? 'Care Standard Member',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${subscription?['visits_remaining'] ?? 2} visits left',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    '15% auto-discount applied on all bookings • Priority 1-hr technician dispatch active',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Next AI scan: Tomorrow',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11),
                      ),
                      GestureDetector(
                        onTap: _showSubscriptionModal,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade600,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Manage Plan',
                            style: TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Health Metrics Row
            Row(
              children: [
                _buildMetricBox('Registered', '$totalAppliances units', Icons.devices, Colors.blue),
                const SizedBox(width: 10),
                _buildMetricBox('Attention Due', '$requiringService units', Icons.warning_amber, Colors.orange),
                const SizedBox(width: 10),
                _buildMetricBox('Avg Health', '$avgHealth%', Icons.health_and_safety, Colors.green),
              ],
            ),

            const SizedBox(height: 24),

            // AI Recommendations Spotlight
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('AI Predictive Maintenance Alerts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10)),
                  child: const Text('Deterministic AI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            if (upcoming.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                child: const Text('All appliances operating at optimal parameters. No immediate service due.', style: TextStyle(fontSize: 12)),
              )
            else
              ...upcoming.map((rec) {
                final isOverdue = rec['priority'] == 'high' || rec['priority'] == 'critical';
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isOverdue ? Colors.orange.shade300 : Colors.grey.shade300),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                rec['appliance_type'] == 'ac' ? Icons.ac_unit : Icons.kitchen,
                                color: primaryColor,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${rec['brand']} ${rec['model'] ?? ''}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isOverdue ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              rec['priority'].toString().toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isOverdue ? Colors.red.shade800 : Colors.orange.shade800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        rec['reason'] ?? '',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.3),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(rec['suggested_service'] ?? 'Scheduled Checkup', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: primaryColor)),
                              Text('Estimate: ${rec['estimated_price_range']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                            ],
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ServiceDetailsScreen(
                                    service: {
                                      'name': rec['suggested_service'] ?? 'Appliance Maintenance',
                                      'slug': rec['appliance_type'] == 'ac' ? 'ac-repair-servicing' : 'water-purifier-servicing',
                                      'category_slug': 'appliance-repair',
                                      'base_price_paise': 59900,
                                      'description': rec['reason'],
                                    },
                                  ),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accentColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                            child: const Text('Schedule Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

            const SizedBox(height: 20),

            // Registered Appliances Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('My Home Appliances', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: () async {
                    final res = await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AddApplianceScreen()),
                    );
                    if (res == true) _loadData();
                  },
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Appliance', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            ...appliances.map((app) {
              final health = app['health_score'] ?? 80;
              final isGood = health >= 75;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        app['appliance_type'] == 'ac' ? Icons.ac_unit : (app['appliance_type'] == 'refrigerator' ? Icons.kitchen : Icons.local_laundry_service),
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${app['brand']} ${app['model'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text(
                            'Last Service: ${app['last_service_date'] ?? 'Not Recorded'} • Usage: ${app['usage_frequency'] ?? 'Medium'}',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('$health%', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isGood ? Colors.green : Colors.orange)),
                        Text(isGood ? 'Healthy' : 'Attention', style: TextStyle(fontSize: 10, color: isGood ? Colors.green : Colors.orange)),
                      ],
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricBox(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
