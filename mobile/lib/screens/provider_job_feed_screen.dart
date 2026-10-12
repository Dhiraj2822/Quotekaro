import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ProviderJobFeedScreen extends StatefulWidget {
  final List<String>? providerCategories;

  const ProviderJobFeedScreen({
    super.key,
    this.providerCategories,
  });

  @override
  State<ProviderJobFeedScreen> createState() => _ProviderJobFeedScreenState();
}

class _ProviderJobFeedScreenState extends State<ProviderJobFeedScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  List<dynamic> _jobs = [];
  bool _isLoading = false;

  String _selectedCategory = 'all';
  int _selectedRadiusKm = 20;

  final List<String> _categories = ['all', 'plumbing', 'electrical', 'painting', 'cleaning'];
  final List<int> _radiusOptions = [10, 20, 35, 50];

  // Default demo jobs for local testing / offline state
  final List<Map<String, dynamic>> _demoJobs = [
    {
      'id': 'job-001',
      'category': 'plumbing',
      'urgency_type': 'urgent',
      'description': 'Emergency bathroom pipe burst! Water spraying under the basin cabinet, need immediate repair.',
      'photo_urls': ['https://storage.quotekaro.com/jobs/burst_pipe_1.jpg'],
      'area': 'Kothrud, Pune',
      'distance_km': 2.4,
      'status': 'open',
      'customer_name': 'Priya S.',
      'created_at': '12 mins ago'
    },
    {
      'id': 'job-002',
      'category': 'plumbing',
      'urgency_type': 'planned',
      'description': 'Install new diverter and two shower heads in master bathroom. Fittings already purchased.',
      'photo_urls': ['https://storage.quotekaro.com/jobs/fittings_1.jpg'],
      'area': 'Shivajinagar, Pune',
      'distance_km': 3.8,
      'status': 'open',
      'customer_name': 'Rahul K.',
      'created_at': '45 mins ago'
    },
    {
      'id': 'job-003',
      'category': 'electrical',
      'urgency_type': 'urgent',
      'description': 'Main MCB tripping repeatedly when AC is switched on. Burning smell near fuse box.',
      'photo_urls': ['https://storage.quotekaro.com/jobs/mcb_box.jpg'],
      'area': 'Kothrud, Pune',
      'distance_km': 1.8,
      'status': 'open',
      'customer_name': 'Anand M.',
      'created_at': '25 mins ago'
    },
    {
      'id': 'job-004',
      'category': 'painting',
      'urgency_type': 'planned',
      'description': 'Interior repaint of 2 BHK living room and passage. Looking for quotes including primer.',
      'photo_urls': [
        'https://storage.quotekaro.com/jobs/living_wall.jpg',
        'https://storage.quotekaro.com/jobs/passage_wall.jpg'
      ],
      'area': 'Baner, Pune',
      'distance_km': 6.5,
      'status': 'open',
      'customer_name': 'Sneha D.',
      'created_at': '2 hours ago'
    },
    {
      'id': 'job-005',
      'category': 'cleaning',
      'urgency_type': 'planned',
      'description': 'Deep cleaning for move-in: Kitchen cabinets, 2 bathrooms, balcony floor scrubbing.',
      'photo_urls': ['https://storage.quotekaro.com/jobs/kitchen_balcony.jpg'],
      'area': 'Hadapsar, Pune',
      'distance_km': 11.2,
      'status': 'open',
      'customer_name': 'Vikas T.',
      'created_at': '3 hours ago'
    }
  ];

  @override
  void initState() {
    super.initState();
    _fetchJobs();
  }

  Future<void> _fetchJobs() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final categoryParam = _selectedCategory == 'all' ? null : _selectedCategory;
      final nearbyList = await ApiService.getNearbyJobs(
        category: categoryParam,
        radiusKm: _selectedRadiusKm,
        lat: 18.5204,
        lng: 73.8567,
      );

      if (!mounted) return;
      if (nearbyList.isNotEmpty) {
        setState(() {
          _jobs = nearbyList;
          _isLoading = false;
        });
      } else {
        // Use demo fallback if server returns empty list
        setState(() {
          _jobs = _filterDemoJobs();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      // Fallback to local demo list on network failure
      setState(() {
        _jobs = _filterDemoJobs();
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> _filterDemoJobs() {
    return _demoJobs.where((j) {
      final matchCat = _selectedCategory == 'all' || j['category'] == _selectedCategory;
      final matchRadius = (j['distance_km'] as num).toDouble() <= _selectedRadiusKm;
      return matchCat && matchRadius;
    }).toList();
  }

  void _showQuoteDialog(Map<String, dynamic> job) {
    final priceController = TextEditingController(text: '450');
    final etaController = TextEditingController(text: '30');
    final messageController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            const Icon(Icons.request_quote_outlined, color: primaryColor),
            const SizedBox(width: 8),
            Text('Quote on ${job['category'].toString().toUpperCase()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Job: ${job['description']}', style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
              const SizedBox(height: 6),
              Text('Location: ${job['area']} (${job['distance_km'] ?? "2.4"} km away)', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const Divider(height: 20),
              const Text('Estimated Price (₹)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              TextField(
                controller: priceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  prefixText: '₹ ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Estimated Arrival Time (Minutes)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              TextField(
                controller: etaController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  suffixText: 'mins',
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Optional Note to Customer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              TextField(
                controller: messageController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'e.g. Carrying replacement washers & pipe sealer',
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            key: const Key('dialog_submit_quote_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Quote of ₹${priceController.text} submitted! (Module 4 feature)'),
                  backgroundColor: accentColor,
                ),
              );
            },
            child: const Text('Submit Quote'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayJobs = _jobs.where((j) {
      if (_selectedCategory == 'all') return true;
      return j['category'] == _selectedCategory;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nearby Job Leads', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Leads',
            onPressed: _fetchJobs,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Controls Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category Pills Row
                Row(
                  children: [
                    const Text('Category:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryColor)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: _categories.map((cat) {
                            final isSelected = _selectedCategory == cat;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text(
                                  cat.toUpperCase(),
                                  style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
                                ),
                                selected: isSelected,
                                selectedColor: const Color(0xFF1F3864).withValues(alpha: 0.12),
                                onSelected: (sel) {
                                  if (sel) {
                                    setState(() {
                                      _selectedCategory = cat;
                                    });
                                    _fetchJobs();
                                  }
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Radius Selection Row
                Row(
                  children: [
                    const Text('Radius:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryColor)),
                    const SizedBox(width: 14),
                    ..._radiusOptions.map((rad) {
                      final isSelected = _selectedRadiusKm == rad;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text('$rad km', style: const TextStyle(fontSize: 11)),
                          selected: isSelected,
                          selectedColor: const Color(0xFF548235).withValues(alpha: 0.15),
                          onSelected: (sel) {
                            if (sel) {
                              setState(() {
                                _selectedRadiusKm = rad;
                              });
                              _fetchJobs();
                            }
                          },
                        ),
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),

          // Main Feed List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : displayJobs.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_off_outlined, size: 48, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              const Text('No Open Jobs Found Nearby', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text(
                                'There are no open $_selectedCategory requests within $_selectedRadiusKm km right now. Try expanding your search radius.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchJobs,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: displayJobs.length,
                          itemBuilder: (context, idx) {
                            final job = displayJobs[idx];
                            final isUrgent = job['urgency_type'] == 'urgent';
                            final distance = job['distance_km'] != null ? '${job['distance_km']} km away' : 'Nearby';
                            final photos = (job['photo_urls'] as List<dynamic>?) ?? [];

                            return Card(
                              key: Key('job_card_$idx'),
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: isUrgent ? warningColor : const Color(0xFFE2E8F0),
                                  width: isUrgent ? 1.5 : 1,
                                ),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Top Row: Category + Distance + Urgency Badge
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF1F3864).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            job['category'].toString().toUpperCase(),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 11,
                                              color: primaryColor,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on, size: 14, color: accentColor),
                                            const SizedBox(width: 2),
                                            Text(distance, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: accentColor)),
                                          ],
                                        ),
                                        const Spacer(),
                                        if (isUrgent)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFBF8F00).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: warningColor),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.bolt, size: 14, color: warningColor),
                                                SizedBox(width: 2),
                                                Text('URGENT', style: TextStyle(color: warningColor, fontWeight: FontWeight.bold, fontSize: 11)),
                                              ],
                                            ),
                                          )
                                        else
                                          Text(
                                            job['created_at']?.toString() ?? 'Recent',
                                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                                          ),
                                      ],
                                    ),

                                    const SizedBox(height: 10),

                                    // Description
                                    Text(
                                      job['description'] ?? 'No description provided',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.3),
                                    ),

                                    const SizedBox(height: 8),

                                    // Location string
                                    Row(
                                      children: [
                                        const Icon(Icons.place_outlined, size: 14, color: Color(0xFF64748B)),
                                        const SizedBox(width: 4),
                                        Text(job['area'] ?? 'Pune', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                      ],
                                    ),

                                    // Customer Photos Horizontal Preview
                                    if (photos.isNotEmpty) ...[
                                      const SizedBox(height: 12),
                                      SizedBox(
                                        height: 50,
                                        child: ListView.separated(
                                          scrollDirection: Axis.horizontal,
                                          itemCount: photos.length,
                                          separatorBuilder: (context, index) => const SizedBox(width: 8),
                                          itemBuilder: (ctx, pIdx) {
                                            return Container(
                                              width: 50,
                                              height: 50,
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(color: const Color(0xFFCBD5E1)),
                                              ),
                                              child: const Icon(Icons.image_outlined, size: 24, color: primaryColor),
                                            );
                                          },
                                        ),
                                      ),
                                    ],

                                    const Divider(height: 24),

                                    // Action Button
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          isUrgent ? '⚡ Fast Response Auto-Match' : 'Open for Quotations',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: isUrgent ? warningColor : const Color(0xFF64748B),
                                          ),
                                        ),
                                        ElevatedButton.icon(
                                          key: Key('quote_button_$idx'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: isUrgent ? warningColor : primaryColor,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          icon: const Icon(Icons.send, size: 14),
                                          label: Text(
                                            isUrgent ? 'Accept Urgent Job' : 'Submit Quote',
                                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                          ),
                                          onPressed: () => _showQuoteDialog(job),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
