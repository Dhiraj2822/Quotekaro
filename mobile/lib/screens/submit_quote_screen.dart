import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SubmitQuoteScreen extends StatefulWidget {
  final Map<String, dynamic> job;

  const SubmitQuoteScreen({super.key, required this.job});

  @override
  State<SubmitQuoteScreen> createState() => _SubmitQuoteScreenState();
}

class _SubmitQuoteScreenState extends State<SubmitQuoteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _priceController = TextEditingController();
  final _etaController = TextEditingController(text: '30');
  final _messageController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  // 06_UIUX_SPEC.md color system
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color urgentColor = Color(0xFFBF8F00);

  final List<int> _quickEtaOptions = [15, 30, 45, 60];

  @override
  void dispose() {
    _priceController.dispose();
    _etaController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmitQuote() async {
    if (!_formKey.currentState!.validate()) return;

    final priceRupees = int.tryParse(_priceController.text.trim());
    if (priceRupees == null || priceRupees <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid price in Rupees')),
      );
      return;
    }

    final etaMinutes = int.tryParse(_etaController.text.trim()) ?? 30;
    final message = _messageController.text.trim();
    final jobId = widget.job['id']?.toString() ?? '';

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final quote = await ApiService.submitQuote(
        jobId: jobId,
        pricePaise: priceRupees * 100, // Convert to paise
        etaMinutes: etaMinutes,
        message: message.isNotEmpty ? message : null,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Quote of ₹$priceRupees sent successfully!'),
          backgroundColor: accentColor,
        ),
      );

      Navigator.pop(context, quote);
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = err.toString().replaceAll('Exception: ', '');
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_errorMessage ?? 'Failed to submit quote'),
          backgroundColor: Colors.red[700],
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'plumbing':
        return Icons.plumbing;
      case 'electrical':
        return Icons.electric_bolt;
      case 'painting':
        return Icons.format_paint;
      case 'cleaning':
        return Icons.cleaning_services;
      default:
        return Icons.build;
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = widget.job;
    final category = job['category'] ?? 'Service';
    final isUrgent = job['urgency_type'] == 'urgent';
    final description = job['description'] ?? 'No description provided';
    final area = job['area'] ?? 'Pune';
    final distanceKm = job['distance_km'];
    final photoUrls = (job['photo_urls'] as List<dynamic>?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Submit Quote', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Job Summary Card
              Card(
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: primaryColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(_getCategoryIcon(category), color: primaryColor, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  category.toUpperCase(),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 0.5),
                                ),
                                Text('Area: $area', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                              ],
                            ),
                          ),
                          if (isUrgent)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: urgentColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: urgentColor, width: 1),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.bolt, color: urgentColor, size: 14),
                                  Text(
                                    'URGENT',
                                    style: TextStyle(color: urgentColor, fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const Divider(height: 24),
                      const Text('Job Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text(description, style: TextStyle(color: Colors.grey[800], fontSize: 14)),
                      if (distanceKm != null) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: primaryColor),
                            const SizedBox(width: 4),
                            Text('$distanceKm km away from your base location',
                                style: const TextStyle(fontSize: 12, color: primaryColor, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ],
                      if (photoUrls.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        const Text('Customer Attached Photos',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 80,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: photoUrls.length,
                            itemBuilder: (context, index) {
                              return Container(
                                width: 80,
                                margin: const EdgeInsets.only(right: 8),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  color: Colors.grey[200],
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: Image.network(
                                  photoUrls[index],
                                  fit: BoxFit.cover,
                                  errorBuilder: (ctx, err, stack) =>
                                      const Icon(Icons.broken_image, color: Colors.grey),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 2. Error message banner if any
              if (_errorMessage != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    border: Border.all(color: Colors.red[300]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red[900], fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),

              // 3. Price Input Field (06_UIUX_SPEC.md §3)
              const Text('Your Quoted Price (₹)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 6),
              TextFormField(
                key: const Key('quote_price_input'),
                controller: _priceController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  prefixText: '₹ ',
                  prefixStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: primaryColor),
                  hintText: 'e.g. 450',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please enter your quote price';
                  }
                  final parsed = int.tryParse(val.trim());
                  if (parsed == null || parsed <= 0) {
                    return 'Price must be a positive integer';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // 4. Estimated Time of Arrival (ETA)
              const Text('Estimated Arrival Time (ETA in minutes)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      key: const Key('quote_eta_input'),
                      controller: _etaController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        suffixText: 'mins',
                        hintText: '30',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Enter ETA in minutes';
                        }
                        final parsed = int.tryParse(val.trim());
                        if (parsed == null || parsed <= 0) {
                          return 'ETA must be greater than 0';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _quickEtaOptions.map((minutes) {
                  final isSelected = _etaController.text == minutes.toString();
                  return ChoiceChip(
                    label: Text('$minutes mins'),
                    selected: isSelected,
                    selectedColor: primaryColor.withValues(alpha: 0.15),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _etaController.text = minutes.toString();
                        });
                      }
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),

              // 5. Optional Note / Message to Customer
              const Text('Optional Note to Customer',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 6),
              TextFormField(
                key: const Key('quote_message_input'),
                controller: _messageController,
                maxLines: 3,
                maxLength: 300,
                decoration: InputDecoration(
                  hintText: 'e.g. Carrying standard spare parts, includes 30-day warranty on labor.',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),

              const SizedBox(height: 28),

              // 6. Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  key: const Key('submit_quote_btn'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 2,
                  ),
                  onPressed: _isLoading ? null : _handleSubmitQuote,
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Submit Quote to Customer',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
