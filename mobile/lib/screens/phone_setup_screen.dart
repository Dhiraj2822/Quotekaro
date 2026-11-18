import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// PhoneSetupScreen
///
/// Shown immediately after a successful email OTP sign-in when the backend
/// responds with `requires_phone_setup: true`.  The user must link an Indian
/// mobile number before proceeding to the main app.  A "Skip for now" option
/// is available but shows a persistent warning that some features (booking
/// coordination) will be unavailable without a phone number.
class PhoneSetupScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final VoidCallback onSetupComplete;

  const PhoneSetupScreen({
    super.key,
    required this.user,
    required this.token,
    required this.onSetupComplete,
  });

  @override
  State<PhoneSetupScreen> createState() => _PhoneSetupScreenState();
}

class _PhoneSetupScreenState extends State<PhoneSetupScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  // Indian phone regex: starts with 6/7/8/9, exactly 10 digits
  static final RegExp _indianPhoneRegex = RegExp(r'^[6789]\d{9}$');

  Future<void> _handleLinkPhone() async {
    final raw = _phoneController.text.trim().replaceAll(RegExp(r'\s'), '');

    // Normalise: strip leading +91, 0091, 91, or 0
    String digits = raw;
    if (digits.startsWith('+91')) {
      digits = digits.substring(3);
    } else if (digits.startsWith('0091')) {
      digits = digits.substring(4);
    } else if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    if (!_indianPhoneRegex.hasMatch(digits)) {
      setState(() {
        _errorMessage =
            'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9)';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiService.linkPhoneNumber('+91$digits');
      if (mounted) {
        widget.onSetupComplete();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  void _handleSkip() {
    // Show a banner warning before allowing skip
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Phone number skipped. Some features like booking coordination may be unavailable.',
        ),
        backgroundColor: Color(0xFFF59E0B),
        duration: Duration(seconds: 4),
      ),
    );
    widget.onSetupComplete();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Icon
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(50),
                        ),
                        child: const Icon(
                          Icons.phone_android,
                          size: 40,
                          color: primaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Title
                    const Text(
                      'Add Your Mobile Number',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Subtitle
                    const Text(
                      'Your mobile number helps technicians coordinate with you for bookings. It stays private and is never shared publicly.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Error banner
                    if (_errorMessage != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                              color: Color(0xFFB91C1C), fontSize: 13),
                        ),
                      ),

                    // Phone field
                    const Text(
                      'Mobile Number',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: primaryColor),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _phoneController,
                      enabled: !_isLoading,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        hintText: '98765 43210',
                        prefixText: '+91  ',
                        prefixStyle: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: primaryColor),
                        prefixIcon: const Icon(Icons.phone_android, size: 20),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Enter 10-digit Indian mobile number (starting with 6, 7, 8 or 9)',
                      style:
                          TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                    ),
                    const SizedBox(height: 20),

                    // Link button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleLinkPhone,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accentColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Save Mobile Number',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    const SizedBox(height: 12),

                    // Skip option
                    OutlinedButton(
                      onPressed: _isLoading ? null : _handleSkip,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF6B7280),
                        side: const BorderSide(color: Color(0xFFD1D5DB)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Skip for now',
                          style: TextStyle(fontSize: 14)),
                    ),
                    const SizedBox(height: 16),

                    // Privacy note
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.shield_outlined,
                              size: 16, color: accentColor),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Your number is stored securely and used only for service coordination. See our Privacy Policy for details.',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF166534),
                                  height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
