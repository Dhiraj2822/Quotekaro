import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'cart_checkout_screen.dart';

class ServiceDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> service;

  const ServiceDetailsScreen({super.key, required this.service});

  @override
  State<ServiceDetailsScreen> createState() => _ServiceDetailsScreenState();
}

class _ServiceDetailsScreenState extends State<ServiceDetailsScreen> {
  Map<String, dynamic>? _fullService;
  bool _isLoading = true;
  int _selectedPackageIndex = 0;
  final Set<String> _selectedAddonIds = {};

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _loadServiceDetails();
  }

  Future<void> _loadServiceDetails() async {
    try {
      final srv = await ApiService.getServiceDetails(widget.service['slug'] ?? widget.service['id']);
      if (mounted) {
        setState(() {
          _fullService = srv;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _fullService = widget.service;
          _isLoading = false;
        });
      }
    }
  }

  int _calculateTotalPricePaise() {
    if (_fullService == null) return 0;
    final pkgs = _fullService!['packages'] as List<dynamic>? ?? [];
    int basePaise = _fullService!['base_price_paise'] ?? 49900;
    if (pkgs.isNotEmpty && _selectedPackageIndex < pkgs.length) {
      basePaise = pkgs[_selectedPackageIndex]['price_paise'] ?? basePaise;
    }

    int addonsPaise = 0;
    final addons = _fullService!['addons'] as List<dynamic>? ?? [];
    for (final adn in addons) {
      if (_selectedAddonIds.contains(adn['id'])) {
        addonsPaise += (adn['price_paise'] as num? ?? 0).toInt();
      }
    }

    return basePaise + addonsPaise;
  }

  void _proceedToCheckout() {
    if (_fullService == null) return;
    final pkgs = _fullService!['packages'] as List<dynamic>? ?? [];
    Map<String, dynamic>? chosenPackage;
    if (pkgs.isNotEmpty && _selectedPackageIndex < pkgs.length) {
      chosenPackage = pkgs[_selectedPackageIndex];
    }

    final addons = _fullService!['addons'] as List<dynamic>? ?? [];
    final chosenAddons = addons.where((a) => _selectedAddonIds.contains(a['id'])).toList();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartCheckoutScreen(
          service: _fullService!,
          selectedPackage: chosenPackage,
          selectedAddons: chosenAddons,
          totalPricePaise: _calculateTotalPricePaise(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.service['name'] ?? 'Service Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final srv = _fullService ?? widget.service;
    final name = srv['name'] ?? 'Service Details';
    final desc = srv['description'] ?? '';
    final rating = srv['rating'] ?? 4.8;
    final reviews = srv['review_count'] ?? 150;
    final duration = srv['estimated_duration_min'] ?? 60;
    final pkgs = srv['packages'] as List<dynamic>? ?? [];
    final addons = srv['addons'] as List<dynamic>? ?? [];
    final inclusions = srv['inclusions'] as List<dynamic>? ?? [];
    final exclusions = srv['exclusions'] as List<dynamic>? ?? [];
    final faqs = srv['faqs'] as List<dynamic>? ?? [];
    final totalPaise = _calculateTotalPricePaise();

    return Scaffold(
      appBar: AppBar(
        title: Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Image
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                image: srv['image_url'] != null
                    ? DecorationImage(
                        image: NetworkImage(srv['image_url']),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                ),
                alignment: Alignment.bottomLeft,
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade700,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star, color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            '$rating ($reviews)',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '⏱️ $duration mins',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: primaryColor)),
                  const SizedBox(height: 6),
                  Text(desc, style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4)),

                  const Divider(height: 32),

                  // Packages Section
                  if (pkgs.isNotEmpty) ...[
                    const Text('Select Package', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ...List.generate(pkgs.length, (idx) {
                      final p = pkgs[idx];
                      final isSelected = _selectedPackageIndex == idx;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedPackageIndex = idx),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? accentColor : Colors.grey.shade300,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                color: isSelected ? accentColor : Colors.grey,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p['name'] ?? '',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: isSelected ? accentColor : primaryColor,
                                      ),
                                    ),
                                    if (p['description'] != null)
                                      Text(
                                        p['description'],
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                  ],
                                ),
                              ),
                              Text(
                                '₹${((p['price_paise'] ?? 0) / 100).round()}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],

                  // Add-ons Section
                  if (addons.isNotEmpty) ...[
                    const Text('Frequently Added Together', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ...addons.map((adn) {
                      final isChecked = _selectedAddonIds.contains(adn['id']);
                      return CheckboxListTile(
                        value: isChecked,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              _selectedAddonIds.add(adn['id']);
                            } else {
                              _selectedAddonIds.remove(adn['id']);
                            }
                          });
                        },
                        title: Text(adn['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        subtitle: adn['description'] != null ? Text(adn['description'], style: const TextStyle(fontSize: 11)) : null,
                        secondary: Text(
                          '+₹${((adn['price_paise'] ?? 0) / 100).round()}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: accentColor),
                        ),
                        contentPadding: EdgeInsets.zero,
                        activeColor: accentColor,
                      );
                    }),
                    const Divider(height: 32),
                  ],

                  // Inclusions & Exclusions
                  if (inclusions.isNotEmpty) ...[
                    const Text('What is Included:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: accentColor)),
                    const SizedBox(height: 8),
                    ...inclusions.map((inc) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_outline, color: accentColor, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(inc.toString(), style: const TextStyle(fontSize: 12))),
                            ],
                          ),
                        )),
                    const SizedBox(height: 12),
                  ],

                  if (exclusions.isNotEmpty) ...[
                    const Text('What is Excluded:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.red)),
                    const SizedBox(height: 8),
                    ...exclusions.map((exc) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.cancel_outlined, color: Colors.red, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(exc.toString(), style: const TextStyle(fontSize: 12))),
                            ],
                          ),
                        )),
                    const SizedBox(height: 16),
                  ],

                  // FAQs
                  if (faqs.isNotEmpty) ...[
                    const Divider(height: 24),
                    const Text('Frequently Asked Questions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...faqs.map((f) => ExpansionTile(
                          title: Text(f['q'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                              child: Text(f['a'] ?? '', style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4)),
                            ),
                          ],
                        )),
                  ],

                  const SizedBox(height: 80), // spacing for bottom bar
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2))],
        ),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total Estimate', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  Text('₹${(totalPaise / 100).round()}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: primaryColor)),
                ],
              ),
              ElevatedButton(
                onPressed: _proceedToCheckout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: accentColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Proceed to Book →', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

