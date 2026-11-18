import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import 'phone_setup_screen.dart';

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

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late String _selectedRole;
  late TabController _tabController;

  // --- Phone OTP state ---
  final TextEditingController _phoneController =
      TextEditingController(text: '+919999900001');
  final TextEditingController _phoneOtpController = TextEditingController();
  bool _phoneOtpSent = false;

  // --- Email OTP state ---
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _emailOtpController = TextEditingController();
  bool _emailOtpSent = false;

  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastBackPressTime;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _selectedRole = widget.initialRole;
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      // Clear errors when tab changes
      if (!_tabController.indexIsChanging) {
        setState(() {
          _errorMessage = null;
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneController.dispose();
    _phoneOtpController.dispose();
    _emailController.dispose();
    _emailOtpController.dispose();
    super.dispose();
  }

  // ---- Phone OTP handlers ----

  Future<void> _handleRequestPhoneOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      setState(() {
        _errorMessage = 'Please enter a valid phone number (at least 10 digits)';
      });
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await ApiService.asyncRequestOtp(phone);
      setState(() {
        _isLoading = false;
        _phoneOtpSent = true;
        _phoneOtpController.text = '123456'; // pre-fill dev OTP
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _handleVerifyPhoneOtp() async {
    final phone = _phoneController.text.trim();
    final otp = _phoneOtpController.text.trim();
    if (otp.length < 4) {
      setState(() {
        _errorMessage = 'Please enter the 6-digit OTP';
      });
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final res = await ApiService.verifyOtp(
        phoneNumber: phone,
        otp: otp,
        role: _selectedRole,
      );
      setState(() {
        _isLoading = false;
      });
      widget.onLoginSuccess(res['user'], res['token']);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  // ---- Email OTP handlers ----

  Future<void> _handleRequestEmailOtp() async {
    final email = _emailController.text.trim();
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!emailRegex.hasMatch(email)) {
      setState(() {
        _errorMessage = 'Please enter a valid email address';
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
        _emailOtpSent = true;
        _emailOtpController.text = '123456'; // pre-fill dev OTP
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _handleVerifyEmailOtp() async {
    final email = _emailController.text.trim();
    final otp = _emailOtpController.text.trim();
    if (otp.length != 6) {
      setState(() {
        _errorMessage = 'Please enter the 6-digit OTP';
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

      // If backend says phone setup is required, go to phone setup screen first
      if (res['requires_phone_setup'] == true) {
        final user = res['user'] as Map<String, dynamic>;
        final token = (res['token'] ?? res['access_token'] ?? '').toString();
        // Store token in ApiService so PhoneSetupScreen can make authenticated calls
        ApiService.currentToken = token;
        ApiService.currentUser = user;
        if (mounted) {
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
        }
      } else {
        final user = res['user'] as Map<String, dynamic>;
        final token = (res['token'] ?? res['access_token'] ?? '').toString();
        widget.onLoginSuccess(user, token);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  // ---- UI ----

  @override
  Widget build(BuildContext context) {
    final isCustomer = _selectedRole == 'customer';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        // Allow back to go from OTP step back to identifier step
        if (_phoneOtpSent && _tabController.index == 0) {
          setState(() {
            _phoneOtpSent = false;
            _phoneOtpController.clear();
            _errorMessage = null;
          });
          return;
        }
        if (_emailOtpSent && _tabController.index == 1) {
          setState(() {
            _emailOtpSent = false;
            _emailOtpController.clear();
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
                      // App Logo & Title
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

                      // Role selector
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
                        onSelectionChanged: (Set<String> newSelection) {
                          setState(() {
                            _selectedRole = newSelection.first;
                            _phoneController.text = _selectedRole == 'customer'
                                ? '+919999900001'
                                : '+919999900002';
                            _errorMessage = null;
                            // Reset OTP states on role change
                            _phoneOtpSent = false;
                            _phoneOtpController.clear();
                            _emailOtpSent = false;
                            _emailOtpController.clear();
                          });
                        },
                      ),
                      const SizedBox(height: 20),

                      // Error Banner
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
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                                color: Color(0xFFB91C1C), fontSize: 13),
                          ),
                        ),

                      // Login Method Tabs
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: TabBar(
                          controller: _tabController,
                          indicator: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          indicatorSize: TabBarIndicatorSize.tab,
                          dividerColor: Colors.transparent,
                          labelColor: primaryColor,
                          unselectedLabelColor: const Color(0xFF64748B),
                          labelStyle: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13),
                          unselectedLabelStyle:
                              const TextStyle(fontSize: 13),
                          padding: const EdgeInsets.all(4),
                          tabs: const [
                            Tab(
                              icon: Icon(Icons.phone_android, size: 16),
                              text: 'Mobile OTP',
                            ),
                            Tab(
                              icon: Icon(Icons.email_outlined, size: 16),
                              text: 'Email OTP',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Tab content
                      SizedBox(
                        height: 260,
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildPhoneOtpTab(),
                            _buildEmailOtpTab(),
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
      ),
    );
  }

  // ---- Phone OTP Tab ----

  Widget _buildPhoneOtpTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Mobile Number',
          style: TextStyle(
              fontWeight: FontWeight.w600, fontSize: 13, color: primaryColor),
        ),
        const SizedBox(height: 6),
        TextField(
          key: const Key('phone_input'),
          controller: _phoneController,
          enabled: !_phoneOtpSent && !_isLoading,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: '+919876543210',
            prefixIcon: const Icon(Icons.phone_android, size: 20),
            border:
                OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
        const SizedBox(height: 12),
        if (_phoneOtpSent) ...[
          const Text(
            'Enter 6-Digit OTP',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: primaryColor),
          ),
          const SizedBox(height: 6),
          TextField(
            key: const Key('otp_input'),
            controller: _phoneOtpController,
            enabled: !_isLoading,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              hintText: '123456',
              prefixIcon:
                  const Icon(Icons.lock_clock_outlined, size: 20),
              counterText: '',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8)),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 8),
          _devOtpHint(),
          const SizedBox(height: 12),
          ElevatedButton(
            key: const Key('verify_otp_button'),
            onPressed: _isLoading ? null : _handleVerifyPhoneOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _isLoading
                ? _loadingSpinner()
                : const Text('Verify & Continue',
                    style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          TextButton(
            onPressed: _isLoading
                ? null
                : () => setState(() {
                      _phoneOtpSent = false;
                      _phoneOtpController.clear();
                      _errorMessage = null;
                    }),
            child: const Text('Change Phone Number',
                style: TextStyle(color: primaryColor, fontSize: 13)),
          ),
        ] else ...[
          ElevatedButton(
            key: const Key('request_otp_button'),
            onPressed: _isLoading ? null : _handleRequestPhoneOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _isLoading
                ? _loadingSpinner()
                : const Text('Get OTP',
                    style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ],
    );
  }

  // ---- Email OTP Tab ----

  Widget _buildEmailOtpTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Email Address',
          style: TextStyle(
              fontWeight: FontWeight.w600, fontSize: 13, color: primaryColor),
        ),
        const SizedBox(height: 6),
        TextField(
          key: const Key('email_input'),
          controller: _emailController,
          enabled: !_emailOtpSent && !_isLoading,
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            hintText: 'you@example.com',
            prefixIcon: const Icon(Icons.email_outlined, size: 20),
            border:
                OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
        const SizedBox(height: 12),
        if (_emailOtpSent) ...[
          const Text(
            'Enter 6-Digit OTP',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: primaryColor),
          ),
          const SizedBox(height: 6),
          TextField(
            key: const Key('email_otp_input'),
            controller: _emailOtpController,
            enabled: !_isLoading,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              hintText: '123456',
              prefixIcon:
                  const Icon(Icons.lock_clock_outlined, size: 20),
              counterText: '',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8)),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 8),
          _devOtpHint(),
          const SizedBox(height: 12),
          ElevatedButton(
            key: const Key('verify_email_otp_button'),
            onPressed: _isLoading ? null : _handleVerifyEmailOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _isLoading
                ? _loadingSpinner()
                : const Text('Verify & Continue',
                    style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          TextButton(
            onPressed: _isLoading
                ? null
                : () => setState(() {
                      _emailOtpSent = false;
                      _emailOtpController.clear();
                      _errorMessage = null;
                    }),
            child: const Text('Change Email',
                style: TextStyle(color: primaryColor, fontSize: 13)),
          ),
        ] else ...[
          ElevatedButton(
            key: const Key('request_email_otp_button'),
            onPressed: _isLoading ? null : _handleRequestEmailOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _isLoading
                ? _loadingSpinner()
                : const Text('Send OTP to Email',
                    style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ],
    );
  }

  Widget _devOtpHint() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline, size: 16, color: accentColor),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Test OTP: 123456 (auto-accepted in test/dev)',
              style: TextStyle(
                  fontSize: 12,
                  color: accentColor,
                  fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _loadingSpinner() {
    return const SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
    );
  }
}
