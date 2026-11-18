import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'booking_confirmation_screen.dart';

class QuoteComparisonScreen extends StatefulWidget {
  final Map<String, dynamic> job;

  const QuoteComparisonScreen({super.key, required this.job});

  @override
  State<QuoteComparisonScreen> createState() => _QuoteComparisonScreenState();
}

class _QuoteComparisonScreenState extends State<QuoteComparisonScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _quotes = [];
  String _selectedSort = 'blended'; // 'blended' (default) or 'price_asc'
  String? _acceptingQuoteId;

  // 06_UIUX_SPEC.md color system
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);


  @override
  void initState() {
    super.initState();
    _fetchQuotes();
  }

  Future<void> _fetchQuotes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final jobId = widget.job['id']?.toString() ?? '';
      final quotes = await ApiService.getQuotes(jobId, sort: _selectedSort);
      if (!mounted) return;
      setState(() {
        _quotes = quotes;
        _isLoading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = err.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _onSortChanged(String newSort) {
    if (_selectedSort == newSort) return;
    setState(() {
      _selectedSort = newSort;
    });
    _fetchQuotes();
  }

  Future<void> _handleAcceptQuote(Map<String, dynamic> quote) async {
    final quoteId = quote['id']?.toString() ?? '';
    final jobId = widget.job['id']?.toString() ?? '';
    final providerName = quote['provider']?['name'] ?? 'Provider';
    final priceRupees = ((quote['price_paise'] ?? 0) / 100).toStringAsFixed(0);
    final etaMinutes = quote['eta_minutes'] ?? 30;

    String selectedPaymentMethod = 'cash'; // 'cash' or 'upi'

    final selectedMethod = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (modalCtx, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Confirm Booking & Payment',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryColor),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(sheetCtx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Partner: $providerName • Estimated Arrival: $etaMinutes mins',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 16),

                  // Amount Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Agreed Amount', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        Text('₹$priceRupees', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: accentColor)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Text('Select Payment Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: primaryColor)),
                  const SizedBox(height: 10),

                  // Option 1: Cash on Completion
                  InkWell(
                    onTap: () => setSheetState(() => selectedPaymentMethod = 'cash'),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selectedPaymentMethod == 'cash' ? const Color(0xFFF0FDF4) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: selectedPaymentMethod == 'cash' ? accentColor : const Color(0xFFE2E8F0),
                          width: selectedPaymentMethod == 'cash' ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.money_rounded, color: selectedPaymentMethod == 'cash' ? accentColor : Colors.grey, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text('Cash on Completion', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                SizedBox(height: 2),
                                Text('Pay in cash directly to the technician after job is done', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Radio<String>(
                            value: 'cash',
                            groupValue: selectedPaymentMethod,
                            activeColor: accentColor,
                            onChanged: (val) => setSheetState(() => selectedPaymentMethod = val!),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Option 2: UPI / Online
                  InkWell(
                    onTap: () => setSheetState(() => selectedPaymentMethod = 'upi'),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selectedPaymentMethod == 'upi' ? const Color(0xFFEFF6FF) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: selectedPaymentMethod == 'upi' ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                          width: selectedPaymentMethod == 'upi' ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.account_balance_wallet_outlined, color: selectedPaymentMethod == 'upi' ? const Color(0xFF2563EB) : Colors.grey, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text('UPI / Online Payment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                SizedBox(height: 2),
                                Text('Pay online via GPay, PhonePe, Paytm, or Card', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Radio<String>(
                            value: 'upi',
                            groupValue: selectedPaymentMethod,
                            activeColor: const Color(0xFF2563EB),
                            onChanged: (val) => setSheetState(() => selectedPaymentMethod = val!),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  ElevatedButton(
                    key: const Key('dialog_confirm_accept_quote_btn'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => Navigator.pop(sheetCtx, selectedPaymentMethod),
                    child: Text('Confirm Booking with ${selectedPaymentMethod == 'cash' ? 'Cash' : 'UPI'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        );
      },
    );

    if (selectedMethod == null) return;

    setState(() {
      _acceptingQuoteId = quoteId;
    });

    try {
      final booking = await ApiService.acceptQuote(
        jobId: jobId,
        quoteId: quoteId,
        paymentMethod: selectedMethod,
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Quote accepted! Booking confirmed via ${selectedMethod.toUpperCase()}.'),
          backgroundColor: accentColor,
        ),
      );

      // Navigate to Booking Confirmation screen per 06_UIUX_SPEC.md §2.5
      final enrichedBooking = Map<String, dynamic>.from(booking);
      enrichedBooking['job'] ??= widget.job;
      enrichedBooking['provider'] ??= quote['provider'] ?? quote;
      enrichedBooking['price_paise'] ??= quote['price_paise'];
      enrichedBooking['eta_minutes'] ??= quote['eta_minutes'];
      enrichedBooking['payment_method'] = selectedMethod; // Store selected payment method

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BookingConfirmationScreen(
            booking: enrichedBooking,
            role: 'customer',
          ),
        ),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.red[700],
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _acceptingQuoteId = null;
        });
      }
    }
  }

  Widget _buildRatingBar(String label, double score, Color color) {
    // Score is 1.0 to 5.0
    final normalized = (score / 5.0).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        children: [
          SizedBox(
            width: 78,
            child: Text(
              label,
              style: TextStyle(fontSize: 11, color: Colors.grey[700], fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: normalized,
                minHeight: 6,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            score.toStringAsFixed(1),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryColor),
          ),
        ],
      ),
    );
  }

  Widget _buildQuoteCard(Map<String, dynamic> quote, int index) {
    final provider = quote['provider'] ?? {};
    final providerName = provider['name'] ?? 'Verified Professional';
    final photoUrl = provider['profile_photo_url'];
    final overallRating = (provider['overall_rating'] ?? 4.0).toDouble();

    final honesty = (provider['avg_rating_honesty'] ?? overallRating).toDouble();
    final punctuality = (provider['avg_rating_punctuality'] ?? overallRating).toDouble();
    final quality = (provider['avg_rating_quality'] ?? overallRating).toDouble();

    final priceRupees = ((quote['price_paise'] ?? 0) / 100).toStringAsFixed(0);
    final etaMinutes = quote['eta_minutes'];
    final message = quote['message'];
    final quoteId = quote['id']?.toString() ?? '';
    final isAccepting = _acceptingQuoteId == quoteId;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: index == 0 && _selectedSort == 'blended'
              ? accentColor.withValues(alpha: 0.6)
              : Colors.grey.withValues(alpha: 0.2),
          width: index == 0 && _selectedSort == 'blended' ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top: Provider Info & Best Match Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: primaryColor.withValues(alpha: 0.1),
                  backgroundImage: photoUrl != null ? NetworkImage(photoUrl) : null,
                  child: photoUrl == null
                      ? Text(
                          providerName.isNotEmpty ? providerName[0].toUpperCase() : 'P',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryColor),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              providerName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, color: accentColor, size: 16),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 3),
                          Text(
                            overallRating.toStringAsFixed(1),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Blended Rating',
                            style: TextStyle(color: Colors.grey[600], fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (index == 0 && _selectedSort == 'blended')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: accentColor.withValues(alpha: 0.5)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.thumb_up, color: accentColor, size: 12),
                        SizedBox(width: 4),
                        Text(
                          'TOP MATCH',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: accentColor),
                        ),
                      ],
                    ),
                  ),
              ],
            ),

            const Divider(height: 24),

            // 06_UIUX_SPEC.md §2: Multi-Axis Rating Bars (Honesty, Punctuality, Quality)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'VERIFIED METRICS',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[600], letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 6),
                  _buildRatingBar('Honesty', honesty, accentColor),
                  _buildRatingBar('Punctuality', punctuality, const Color(0xFF2E75B6)),
                  _buildRatingBar('Quality', quality, primaryColor),
                ],
              ),
            ),

            if (message != null && message.toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '💬 "$message"',
                  style: TextStyle(fontSize: 12, color: Colors.blue[900], fontStyle: FontStyle.italic),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Bottom: Price, ETA, and Accept Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '₹$priceRupees',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    if (etaMinutes != null)
                      Row(
                        children: [
                          const Icon(Icons.schedule, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            '$etaMinutes mins ETA',
                            style: TextStyle(fontSize: 12, color: Colors.grey[700], fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                  ],
                ),
                ElevatedButton(
                  key: Key('accept_quote_btn_$quoteId'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 1,
                  ),
                  onPressed: isAccepting ? null : () => _handleAcceptQuote(quote),
                  child: isAccepting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Accept Quote',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final job = widget.job;
    final category = job['category'] ?? 'Service';
    final area = job['area'] ?? 'Pune';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quotes for ${category.toUpperCase()}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(area, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchQuotes,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Sort & Blended Filter Toggle (06_UIUX_SPEC.md §2 & §5)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: Row(
              children: [
                const Icon(Icons.sort, size: 18, color: primaryColor),
                const SizedBox(width: 8),
                const Text('Sort by:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(width: 8),
                Expanded(
                  child: SegmentedButton<String>(
                    segments: const [
                      ButtonSegment<String>(
                        value: 'blended',
                        label: Text('Smart Match', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        icon: Icon(Icons.auto_awesome, size: 14),
                      ),
                      ButtonSegment<String>(
                        value: 'price_asc',
                        label: Text('Lowest Price', style: TextStyle(fontSize: 12)),
                        icon: Icon(Icons.currency_rupee, size: 14),
                      ),
                    ],
                    selected: {_selectedSort},
                    onSelectionChanged: (newSelection) {
                      _onSortChanged(newSelection.first);
                    },
                    style: SegmentedButton.styleFrom(
                      selectedBackgroundColor: primaryColor.withValues(alpha: 0.12),
                      selectedForegroundColor: primaryColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. Explanatory Banner for Anti-Race-to-the-Bottom UX Principle
          if (_selectedSort == 'blended')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue[50],
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, size: 16, color: primaryColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Ranked by Smart Blended Score: balancing competitive pricing with verified multi-axis ratings.',
                      style: TextStyle(fontSize: 11, color: Colors.blue[900]),
                    ),
                  ),
                ],
              ),
            ),

          const Divider(height: 1),

          // 3. Quotes List Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: primaryColor))
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.red),
                              const SizedBox(height: 12),
                              Text(_errorMessage!, textAlign: TextAlign.center),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchQuotes,
                                child: const Text('Try Again'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _quotes.isEmpty
                        ? RefreshIndicator(
                            onRefresh: _fetchQuotes,
                            child: ListView(
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                                Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Center(
                                  child: Text(
                                    'No quotes received yet',
                                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Center(
                                  child: Text(
                                    'Nearby verified professionals are reviewing your job.\nPull down to refresh.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchQuotes,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16.0),
                              itemCount: _quotes.length,
                              itemBuilder: (context, index) {
                                return _buildQuoteCard(_quotes[index], index);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
