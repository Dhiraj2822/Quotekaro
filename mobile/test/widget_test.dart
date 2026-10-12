import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:mobile/main.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  setUp(() {
    // Setup MockClient for ApiService
    ApiService.client = MockClient((request) async {
      if (request.url.path.endsWith('/auth/otp/request')) {
        return http.Response(jsonEncode({'success': true}), 200);
      }

      if (request.url.path.endsWith('/auth/otp/verify')) {
        final body = jsonDecode(request.body);
        final role = body['role'] ?? 'customer';
        final phone = body['phone_number'] ?? '+919999900001';

        return http.Response(
          jsonEncode({
            'token': 'mock_jwt_token_header.payload.signature',
            'user': {
              'id': '11111111-1111-1111-1111-111111111111',
              'phone_number': phone,
              'role': role,
              'name': role == 'customer' ? 'Test Customer Priya' : 'Test Provider Ramesh',
              'city': 'Pune',
              'is_active': true,
              'created_at': '2026-09-16T00:00:00.000Z'
            }
          }),
          200,
        );
      }

      return http.Response(jsonEncode({'error': {'code': 'NOT_FOUND', 'message': 'Not found'}}), 404);
    });
  });

  testWidgets('Full OTP Login and Logout flow in Flutter app', (WidgetTester tester) async {
    await tester.pumpWidget(const QuoteKaroApp());

    // Verify initial LoginScreen renders
    expect(find.text('QuoteKaro'), findsOneWidget);
    expect(find.text('Customer Sign In'), findsOneWidget);
    expect(find.byKey(const Key('request_otp_button')), findsOneWidget);

    // Tap "Get OTP"
    await tester.tap(find.byKey(const Key('request_otp_button')));
    await tester.pumpAndSettle();

    // Verify OTP input field appears
    expect(find.byKey(const Key('otp_input')), findsOneWidget);
    expect(find.byKey(const Key('verify_otp_button')), findsOneWidget);

    // Tap "Verify & Continue"
    await tester.tap(find.byKey(const Key('verify_otp_button')));
    await tester.pumpAndSettle();

    // Verify HomeScreen renders with authenticated user details
    expect(find.text('QuoteKaro Customer'), findsOneWidget);
    expect(find.text('Test Customer Priya'), findsOneWidget);
    expect(find.text('+919999900001'), findsOneWidget);
    expect(find.text('CUSTOMER'), findsOneWidget);
    expect(find.text('Session Active (JWT Token Verified)'), findsOneWidget);

    // Tap Logout button
    await tester.tap(find.byKey(const Key('logout_button')));
    await tester.pumpAndSettle();

    // Verify returned to LoginScreen
    expect(find.text('Customer Sign In'), findsOneWidget);
    expect(find.byKey(const Key('request_otp_button')), findsOneWidget);
  });
}
