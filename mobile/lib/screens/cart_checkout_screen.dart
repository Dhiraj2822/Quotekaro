import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'booking_confirmation_screen.dart';

class CartCheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> service;
  final Map<String, dynamic>? selectedPackage;
  final List<dynamic> selectedAddons;
  final int totalPricePaise;

  const CartCheckoutScreen({
    super.key,
    required this.service,
    this.selectedPackage,
    required this.selectedAddons,
    required this.totalPricePaise,
  });

  @override
  State<CartCheckoutScreen> createState() => _CartCheckoutScreenState();
}

class _CartCheckoutScreenState extends State<CartCheckoutScreen> {
  List<dynamic> _addresses = [];
  String? _selectedAddressId;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String _selectedTimeSlot = '10:00 AM - 12:00 PM';
  String _paymentMethod = 'cash'; // 'cash' or 'razorpay'

  final TextEditingController _couponController = TextEditingController();
  int _discountPaise = 0;
  String? _appliedCouponCode;
  String? _couponMessage;
  bool _isCheckingCoupon = false;
  bool _isPlacingBooking = false;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  final List<String> _timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final list = await ApiService.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = list;
          if (list.isNotEmpty) {
            _selectedAddressId = list[0]['id'];
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    setState(() {
      _isCheckingCoupon = true;
      _couponMessage = null;
    });

    try {
      final res = await ApiService.applyCoupon(code, widget.totalPricePaise);
      if (mounted) {
        setState(() {
          _discountPaise = (res['discount_paise'] as num? ?? 0).toInt();
          _appliedCouponCode = code;
          _couponMessage = 'Coupon applied: ₹${(_discountPaise / 100).round()} saved!';
          _isCheckingCoupon = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _couponMessage = e.toString().replaceFirst('Exception: ', '');
          _discountPaise = 0;
          _appliedCouponCode = null;
          _isCheckingCoupon = false;
        });
      }
    }
  }

  Future<void> _confirmBooking() async {
    setState(() => _isPlacingBooking = true);

    try {
      final selectedAddr = _addresses.firstWhere(
        (a) => a['id'] == _selectedAddressId,
        orElse: () => {
          'address_line1': 'Flat 402, Rohan Nilay Phase 2',
          'area': 'Aundh',
          'city': 'Pune',
          'lat': 18.5583,
          'lng': 73.8078
        },
      );

      final bookingPayload = {
        'service_id': widget.service['id'],
        'service_name': widget.service['name'],
        'category': widget.service['category_slug'] ?? 'cleaning',
        'package_id': widget.selectedPackage?['id'],
        'package_name': widget.selectedPackage?['name'],
        'scheduled_date': _selectedDate.toIso8601String(),
        'time_slot': _selectedTimeSlot,
        'address_id': _selectedAddressId,
        'address': selectedAddr['address_line1'],
        'area': selectedAddr['area'] ?? 'Pune',
        'city': selectedAddr['city'] ?? 'Pune',
        'lat': selectedAddr['lat'] ?? 18.5204,
        'lng': selectedAddr['lng'] ?? 73.8567,
        'total_price_paise': widget.totalPricePaise - _discountPaise,
        'discount_paise': _discountPaise,
        'coupon_code': _appliedCouponCode,
        'payment_method': _paymentMethod,
        'items': [
          if (widget.selectedPackage != null) widget.selectedPackage,
          ...widget.selectedAddons
        ],
      };

      final newBooking = await ApiService.createDirectBooking(bookingPayload);

      if (mounted) {
        setState(() => _isPlacingBooking = false);
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => BookingConfirmationScreen(booking: newBooking),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isPlacingBooking = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.totalPricePaise;
    final discount = _discountPaise;
    final netAmount = (subtotal - discount).clamp(0, subtotal);
    final taxes = (netAmount * 0.18).round();
    final grandTotal = netAmount + taxes;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout & Schedule', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.service['name'] ?? '',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: primaryColor),
                      ),
                      Text(
                        '₹${(subtotal / 100).round()}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  if (widget.selectedPackage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Package: ${widget.selectedPackage!['name']}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                    ),
                  if (widget.selectedAddons.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Add-ons: ${widget.selectedAddons.map((a) => a['name']).join(', ')}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Select Address Section
            const Text('Service Address', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (_addresses.isEmpty)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.location_on, color: primaryColor),
                    SizedBox(width: 8),
                    Expanded(child: Text('Aundh / Baner, Pune (Default Area)', style: TextStyle(fontSize: 13))),
                  ],
                ),
              )
            else
              ..._addresses.map((addr) {
                final isSelected = _selectedAddressId == addr['id'];
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? accentColor : Colors.grey.shade300,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: RadioListTile<String>(
                    value: addr['id'],
                    groupValue: _selectedAddressId,
                    onChanged: (val) => setState(() => _selectedAddressId = val),
                    title: Text(
                      '${addr['label'] ?? 'Address'} — ${addr['area'] ?? 'Pune'}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    subtitle: Text(
                      '${addr['address_line1']}, ${addr['city'] ?? 'Pune'}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    activeColor: accentColor,
                  ),
                );
              }),

            const SizedBox(height: 20),

            // Select Date & Time Slot
            const Text('Date & Time Slot', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 30)),
                      );
                      if (picked != null) {
                        setState(() => _selectedDate = picked);
                      }
                    },
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(
                      '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      foregroundColor: primaryColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _timeSlots.map((slot) {
                final isSelected = _selectedTimeSlot == slot;
                return ChoiceChip(
                  label: Text(slot, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : Colors.black)),
                  selected: isSelected,
                  selectedColor: primaryColor,
                  onSelected: (val) => setState(() => _selectedTimeSlot = slot),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            // Coupon Code Section
            const Text('Offers & Coupons', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _couponController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Enter coupon (e.g. WELCOME50)',
                      hintStyle: const TextStyle(fontSize: 12),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isCheckingCoupon ? null : _applyCoupon,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  child: _isCheckingCoupon
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Apply', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            if (_couponMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  _couponMessage!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _discountPaise > 0 ? accentColor : Colors.red,
                  ),
                ),
              ),

            const SizedBox(height: 20),

            // Payment Method Selection
            const Text('Payment Mode', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.payment, size: 16),
                        SizedBox(width: 4),
                        Text('Razorpay Online'),
                      ],
                    ),
                    selected: _paymentMethod == 'razorpay',
                    selectedColor: const Color(0xFFEFF6FF),
                    onSelected: (_) => setState(() => _paymentMethod = 'razorpay'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.money, size: 16),
                        SizedBox(width: 4),
                        Text('Cash on Completion'),
                      ],
                    ),
                    selected: _paymentMethod == 'cash',
                    selectedColor: const Color(0xFFF0FDF4),
                    onSelected: (_) => setState(() => _paymentMethod = 'cash'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Bill Breakdown Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Payment Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  _buildPriceRow('Item Total', '₹${(subtotal / 100).round()}'),
                  if (discount > 0)
                    _buildPriceRow('Coupon Discount', '-₹${(discount / 100).round()}', color: accentColor),
                  _buildPriceRow('Taxes & GST (18%)', '₹${(taxes / 100).round()}'),
                  const Divider(height: 20),
                  _buildPriceRow('Total Payable', '₹${(grandTotal / 100).round()}', isBold: true, fontSize: 16),
                ],
              ),
            ),

            const SizedBox(height: 90),
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
                  const Text('Grand Total', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  Text('₹${(grandTotal / 100).round()}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: primaryColor)),
                ],
              ),
              ElevatedButton(
                onPressed: _isPlacingBooking ? null : _confirmBooking,
                style: ElevatedButton.styleFrom(
                  backgroundColor: accentColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: _isPlacingBooking
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Confirm Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isBold = false, Color? color, double fontSize = 13}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: color)),
        ],
      ),
    );
  }
}

