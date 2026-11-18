import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import 'phone_setup_screen.dart';

/// LoginScreen
///
/// Users sign in with their email address.
/// A 6-digit OTP is sent to that email and verified.
/// If the account has no linked phone yet, the user is taken to PhoneSetupScreen
/// before reaching the main app.
class LoginScreen extends StatefulWidget {
  final String initialRole; // 'customer' or 'provider'
  final Function(Map<String, dynamic> user, String token) onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.initialRole,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late String _selectedRole;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();

  bool _otpSent = false;
  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastBackPressTime;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _selectedRole = widget.initialRole;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  // ------------------------------------------------------------------ //
  //  Step 1: Request OTP                                                //
  // ------------------------------------------------------------------ //

  Future<void> _handleRequestOtp() async {
    final email = _emailController.text.trim();
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!emailRegex.hasMatch(email)) {
      setState(() {
        _errorMessage = 'Please enter a valid email address.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiService.requestEmailOtp(email);
      setState(() {
        _isLoading = false;
        _otpSent = true;
        _otpController.text = '123456'; // pre-fill dev OTP for demo
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = _friendlyError(e);
      });
    }
  }

  // ------------------------------------------------------------------ //
  //  Step 2: Verify OTP                                                 //
  // ------------------------------------------------------------------ //

  Future<void> _handleVerifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.length != 6) {
      setState(() {
        _errorMessage = 'Please enter the 6-digit code sent to your email.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.verifyEmailOtp(
        email: email,
        otp: otp,
        role: _selectedRole,
      );
      setState(() {
        _isLoading = false;
      });

      final user = res['user'] as Map<String, dynamic>;
      final token = (res['token'] ?? res['access_token'] ?? '').toString();

      // Store in ApiService for authenticated follow-up calls
      ApiService.currentToken = token;
      ApiService.currentUser = user;

      if (res['requires_phone_setup'] == true && mounted) {
        // Redirect to phone setup before home
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => PhoneSetupScreen(
              user: user,
              token: token,
              onSetupComplete: () {
                widget.onLoginSuccess(user, token);
              },
            ),
          ),
        );
      } else {
        widget.onLoginSuccess(user, token);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = _friendlyError(e);
      });
    }
  }

  // ------------------------------------------------------------------ //
  //  Map technical exception messages to user-friendly text             //
  // ------------------------------------------------------------------ //

  String _friendlyError(Object e) {
    final raw = e.toString().replaceFirst('Exception: ', '');
    final lower = raw.toLowerCase();
    // Map known developer-style messages → friendly alternatives
    if (lower.contains('rate limit') || lower.contains('too many')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (lower.contains('invalid') && lower.contains('expired')) {
      return 'The code you entered is incorrect or has expired. Please request a new one.';
    }
    if (lower.contains('deactivated')) {
      return 'Your account has been deactivated. Please contact support@quotekaro.com.';
    }
    if (lower.contains('network') ||
        lower.contains('socketexception') ||
        lower.contains('connection') ||
        lower.contains('clientsoftware') ||
        lower.contains('abort') ||
        lower.contains('failed host lookup') ||
        lower.contains('handshake') ||
        lower.contains('uri=') ||
        lower.contains('clientexception')) {
      return 'Unable to connect to server. The server may be waking up. Please try again in a few seconds.';
    }
    if (lower.contains('timeout')) {
      return 'The server took too long to respond. Please try again.';
    }
    // If the message is already user-friendly (from backend), pass it through
    if (raw.length < 150 && !raw.contains('Exception') && !raw.contains('Error:')) {
      return raw;
    }
    return 'Something went wrong. Please try again or contact support if this continues.';
  }

  // ------------------------------------------------------------------ //
  //  Build                                                              //
  // ------------------------------------------------------------------ //

  @override
  Widget build(BuildContext context) {
    final isCustomer = _selectedRole == 'customer';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        // Back on OTP screen → go back to email input
        if (_otpSent) {
          setState(() {
            _otpSent = false;
            _otpController.clear();
            _errorMessage = null;
          });
          return;
        }
        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
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
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(28.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ---- Logo ----
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Q',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'QuoteKaro',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: primaryColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isCustomer
                            ? 'Customer Sign In'
                            : 'Provider Partner Sign In',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // ---- Role selector ----
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                            value: 'customer',
                            label: Text('Customer'),
                            icon: Icon(Icons.person_outline, size: 16),
                          ),
                          ButtonSegment(
                            value: 'provider',
                            label: Text('Provider'),
                            icon: Icon(Icons.handyman_outlined, size: 16),
                          ),
                        ],
                        selected: {_selectedRole},
                        onSelectionChanged: (Set<String> newSel) {
                          setState(() {
                            _selectedRole = newSel.first;
                            _errorMessage = null;
                            // Reset flow on role change
                            _otpSent = false;
                            _otpController.clear();
                          });
                        },
                      ),
                      const SizedBox(height: 24),

                      // ---- Error banner ----
                      if (_errorMessage != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(8),
                            border:
                                Border.all(color: const Color(0xFFFCA5A5)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.error_outline,
                                  size: 16, color: Color(0xFFB91C1C)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(
                                      color: Color(0xFFB91C1C),
                                      fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // ---- Step 1: Email input ----
                      Text(
                        _otpSent ? 'Email Address' : 'Sign in with your email',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: primaryColor),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        key: const Key('email_input'),
                        controller: _emailController,
                        enabled: !_otpSent && !_isLoading,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) =>
                            _otpSent ? null : _handleRequestOtp(),
                        decoration: InputDecoration(
                          prefixIcon:
                              const Icon(Icons.email_outlined, size: 20),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ---- Step 2: OTP input (shown after sending) ----
                      if (_otpSent) ...[
                        const Text(
                          'Enter the 6-digit code',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: primaryColor),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'We sent a code to ${_emailController.text.trim()}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          key: const Key('otp_input'),
                          controller: _otpController,
                          enabled: !_isLoading,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          textAlign: TextAlign.center,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _handleVerifyOtp(),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                                Icons.lock_clock_outlined,
                                size: 20),
                            counterText: '',
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 14),
                          ),
                          style: const TextStyle(
                              fontSize: 22, letterSpacing: 6),
                        ),
                        const SizedBox(height: 8),
                        // Dev hint (hidden in production via ALLOW_DEV_OTP)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.info_outline,
                                  size: 16, color: accentColor),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Demo code: 123456 (auto-accepted in test mode)',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: accentColor,
                                      fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // ---- Action buttons ----
                      if (!_otpSent)
                        ElevatedButton(
                          key: const Key('request_otp_button'),
                          onPressed: _isLoading ? null : _handleRequestOtp,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8)),
                          ),
                          child: _isLoading
                              ? _spinner()
                              : const Text('Send Code',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15)),
                        )
                      else
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            ElevatedButton(
                              key: const Key('verify_otp_button'),
                              onPressed:
                                  _isLoading ? null : _handleVerifyOtp,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: accentColor,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8)),
                              ),
                              child: _isLoading
                                  ? _spinner()
                                  : const Text('Verify & Continue',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15)),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _isLoading
                                  ? null
                                  : () => setState(() {
                                        _otpSent = false;
                                        _otpController.clear();
                                        _errorMessage = null;
                                      }),
                              child: const Text(
                                'Change email address',
                                style: TextStyle(
                                    color: primaryColor, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _spinner() {
    return const SizedBox(
      width: 20,
      height: 20,
      child:
          CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
    );
  }
}
