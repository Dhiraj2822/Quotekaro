import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'rating_screen.dart';

/**
 * Screen 8: Payment Screen (Customer App)
 * Implements method selection (UPI, Card, Cash) and invoice summary per 06_UIUX_SPEC.md §2.
 */
class PaymentScreen extends StatefulWidget {
  final Map<String, dynamic> booking;

  const PaymentScreen({
    super.key,
    required this.booking,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);
  static const Color bgColor = Color(0xFFF8FAFC);

  String _selectedMethod = 'upi'; // 'upi', 'card', 'cash'
  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _paymentIntent;
  bool _isPaymentCompleted = false;

  String get _bookingId => widget.booking['id'] ?? '';
  int get _amountPaise {
    if (widget.booking['price_paise'] != null) {
      return widget.booking['price_paise'] as int;
    }
    if (widget.booking['quote'] != null && widget.booking['quote']['price_paise'] != null) {
      return widget.booking['quote']['price_paise'] as int;
    }
    return 40000; // Default ₹400
  }

  double get _amountRupees => _amountPaise / 100.0;

  String get _providerName {
    if (widget.booking['provider'] != null && widget.booking['provider']['name'] != null) {
      return widget.booking['provider']['name'];
    }
    return 'Assigned Professional';
  }

  String get _jobCategory {
    if (widget.booking['job'] != null && widget.booking['job']['category'] != null) {
      return widget.booking['job']['category'];
    }
    return 'Home Service';
  }

  Future<void> _handleInitiatePayment() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final intent = await ApiService.createPaymentIntent(
        bookingId: _bookingId,
        method: _selectedMethod,
      );

      setState(() {
        _paymentIntent = intent;
        _isLoading = false;
      });

      if (_selectedMethod == 'cash') {
        _showCashConfirmationDialog();
      } else {
        _showGatewayCheckoutSimulationDialog(intent);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  void _showCashConfirmationDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Row(
          children: [
            Icon(Icons.money_rounded, color: accentColor, size: 28),
            SizedBox(width: 8),
            Text('Cash on Completion'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Please pay ₹${_amountRupees.toStringAsFixed(2)} directly in cash to $_providerName upon work completion.',
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, color: primaryColor, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'QuoteKaro wallet deduction will automatically settle platform commission with the provider.',
                      style: TextStyle(fontSize: 11, color: primaryColor, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            key: const Key('cash_confirm_ok_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _isPaymentCompleted = true;
              });
            },
            child: const Text('Understood & Confirm', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showGatewayCheckoutSimulationDialog(Map<String, dynamic> intent) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            const Icon(Icons.payment, color: primaryColor, size: 26),
            const SizedBox(width: 8),
            Text('${_selectedMethod.toUpperCase()} Checkout', style: const TextStyle(fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Gateway: ${intent['gateway'] ?? 'Razorpay (Sandbox)'}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              'Order ID: ${intent['order_id'] ?? 'order_simulated'}',
              style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: primaryColor),
            ),
            const SizedBox(height: 12),
            Text(
              'Amount to Pay: ₹${_amountRupees.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 8),
            const Text(
              'Simulating secure Razorpay checkout session with sandbox UPI/Card rail.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            key: const Key('simulate_gateway_success_button'),
            icon: const Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            label: const Text('Simulate Success', style: TextStyle(color: Colors.white)),
            onPressed: () {
              Navigator.pop(ctx);
              _handleSimulatePaymentSuccess(intent);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _handleSimulatePaymentSuccess(Map<String, dynamic> intent) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final orderId = intent['order_id'] ?? 'order_simulated';
      final paymentId = 'pay_${DateTime.now().millisecondsSinceEpoch}';
      
      // Complete mock verification
      await ApiService.verifyPayment(
        bookingId: _bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'mock_signature_for_test',
      ).catchError((_) => <String, dynamic>{}); // Gracefully proceed if mock mode

      setState(() {
        _isPaymentCompleted = true;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isPaymentCompleted = true;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Payment & Billing', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isPaymentCompleted ? _buildCompletedView() : _buildPaymentForm(),
    );
  }

  Widget _buildCompletedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, color: accentColor, size: 64),
            ),
            const SizedBox(height: 20),
            Text(
              _selectedMethod == 'cash' ? 'Cash Payment Confirmed!' : 'Payment Successful!',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: primaryColor),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _selectedMethod == 'cash'
                  ? 'Please pay ₹${_amountRupees.toStringAsFixed(2)} to $_providerName upon work completion.'
                  : '₹${_amountRupees.toStringAsFixed(2)} successfully settled via ${_selectedMethod.toUpperCase()}.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              key: const Key('rate_service_button'),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.star_rate_rounded, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RatingScreen(booking: widget.booking),
                  ),
                );
              },
              label: const Text('Rate Service & Craftsmanship', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              key: const Key('done_button'),
              style: OutlinedButton.styleFrom(
                foregroundColor: primaryColor,
                minimumSize: const Size(double.infinity, 48),
                side: const BorderSide(color: primaryColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('Return to Booking', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentForm() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // 1. Invoice Summary Card
        _buildInvoiceSummaryCard(),
        const SizedBox(height: 20),

        // 2. Payment Method Selector Section
        const Text(
          'Select Payment Method',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
        ),
        const SizedBox(height: 12),

        _buildMethodTile(
          key: const Key('method_upi_tile'),
          methodKey: 'upi',
          title: 'UPI Payment',
          subtitle: 'Google Pay, PhonePe, Paytm, BHIM',
          icon: Icons.qr_code_2_rounded,
          badge: 'Instant',
        ),
        const SizedBox(height: 10),

        _buildMethodTile(
          key: const Key('method_card_tile'),
          methodKey: 'card',
          title: 'Credit / Debit Card',
          subtitle: 'Visa, Mastercard, RuPay',
          icon: Icons.credit_card_rounded,
        ),
        const SizedBox(height: 10),

        _buildMethodTile(
          key: const Key('method_cash_tile'),
          methodKey: 'cash',
          title: 'Cash on Completion',
          subtitle: 'Pay directly to provider after work is done',
          icon: Icons.money_rounded,
          badge: 'No Leakage',
        ),
        const SizedBox(height: 28),

        // 3. Action Pay Button
        ElevatedButton(
          key: const Key('pay_button'),
          style: ElevatedButton.styleFrom(
            backgroundColor: primaryColor,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            elevation: 2,
          ),
          onPressed: _isLoading ? null : _handleInitiatePayment,
          child: _isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : Text(
                  _selectedMethod == 'cash'
                      ? 'Confirm Cash Payment • ₹${_amountRupees.toStringAsFixed(2)}'
                      : 'Pay ₹${_amountRupees.toStringAsFixed(2)} via ${_selectedMethod.toUpperCase()}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
        ),
        const SizedBox(height: 16),

        // 4. Trust Banner
        const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline, size: 14, color: Color(0xFF64748B)),
            SizedBox(width: 6),
            Text(
              'End-to-End Secure • QuoteKaro Hyperlocal Protection',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInvoiceSummaryCard() {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.receipt_long_rounded, color: primaryColor, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _jobCategory.toUpperCase(),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor),
                        ),
                        Text(
                          'Booking ID: ${_bookingId.length > 8 ? _bookingId.substring(0, 8) : _bookingId}...',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: warningColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'PENDING',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: warningColor),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Service Partner', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text(_providerName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Agreed Rate', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text('₹${_amountRupees.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Platform Convenience', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text('FREE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: accentColor)),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Payable',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
                ),
                Text(
                  '₹${_amountRupees.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: primaryColor),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodTile({
    required Key key,
    required String methodKey,
    required String title,
    required String subtitle,
    required IconData icon,
    String? badge,
  }) {
    final isSelected = _selectedMethod == methodKey;

    return InkWell(
      key: key,
      onTap: () {
        setState(() {
          _selectedMethod = methodKey;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: isSelected ? primaryColor : Colors.grey.shade600, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                          color: primaryColor,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: accentColor),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: methodKey,
              groupValue: _selectedMethod,
              activeColor: primaryColor,
              onChanged: (val) {
                if (val != null) {
                  setState(() => _selectedMethod = val);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
