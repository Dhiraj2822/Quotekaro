import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/api_service.dart';

void main() {
  runApp(const QuoteKaroApp());
}

class QuoteKaroApp extends StatefulWidget {
  const QuoteKaroApp({super.key});

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  @override
  State<QuoteKaroApp> createState() => _QuoteKaroAppState();
}

class _QuoteKaroAppState extends State<QuoteKaroApp> {
  Map<String, dynamic>? _currentUser;
  String? _token;
  String _activeRole = 'customer'; // 'customer' or 'provider'

  void _onLoginSuccess(Map<String, dynamic> user, String token) {
    setState(() {
      _currentUser = user;
      _token = token;
      _activeRole = user['role'] ?? _activeRole;
    });
  }

  void _onLogout() {
    ApiService.logout();
    setState(() {
      _currentUser = null;
      _token = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuoteKaro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: QuoteKaroApp.primaryColor,
          primary: QuoteKaroApp.primaryColor,
          secondary: QuoteKaroApp.accentColor,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: QuoteKaroApp.primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          color: Colors.white,
        ),
      ),
      builder: (context, child) {
        return Container(
          color: const Color(0xFF0F172A),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Container(
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 30,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: child ?? const SizedBox(),
              ),
            ),
          ),
        );
      },
      home: _currentUser != null && _token != null
          ? HomeScreen(
              user: _currentUser!,
              token: _token!,
              onLogout: _onLogout,
            )
          : Scaffold(
              body: LoginScreen(
                initialRole: _activeRole,
                onLoginSuccess: _onLoginSuccess,
              ),
            ),
    );
  }
}
