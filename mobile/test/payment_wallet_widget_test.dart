import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/payment_screen.dart';
import 'package:mobile/screens/wallet_screen.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  final mockBooking = {
    'id': 'booking-uuid-pay-1234',
    'status': 'in_progress',
    'price_paise': 45000,
    'job': {
      'id': 'job-uuid-1',
      'category': 'plumbing',
      'description': 'Kitchen faucet leakage repair',
      'area': 'Kothrud, Pune',
    },
    'provider': {
      'id': 'provider-uuid-1',
      'name': 'Mahesh Plumber',
    },
    'customer': {
      'id': 'customer-uuid-1',
      'name': 'Customer Test',
    }
  };

  group('Module 6 Task 6: PaymentScreen Widget Tests', () {
    setUp(() {
      ApiService.currentToken = 'mock_jwt_token';
      ApiService.client = MockClient((request) async {
        if (request.url.path.endsWith('/payment')) {
          final body = jsonDecode(request.body);
          final method = body['method'] ?? 'upi';
          return http.Response(
            jsonEncode({
              'payment_intent': {
                'payment_id': 'pay_mock_123',
                'booking_id': 'booking-uuid-pay-1234',
                'amount_paise': 45000,
                'method': method,
                'gateway': method == 'cash' ? null : 'razorpay',
                'order_id': method == 'cash' ? null : 'order_test_9988',
                'status': 'pending'
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":{"message":"Not Found"}}', 404);
      });
    });

    testWidgets('renders invoice summary, price in Rupees, and payment methods', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: PaymentScreen(booking: mockBooking),
        ),
      );

      // Verify invoice details
      expect(find.text('Payment & Billing'), findsOneWidget);
      expect(find.text('PLUMBING'), findsOneWidget);
      expect(find.text('Mahesh Plumber'), findsOneWidget);
      expect(find.text('₹450.00'), findsWidgets);

      // Verify payment methods
      expect(find.text('UPI Payment'), findsOneWidget);
      expect(find.text('Credit / Debit Card'), findsOneWidget);
      expect(find.text('Cash on Completion'), findsOneWidget);
      expect(find.byKey(const Key('pay_button')), findsOneWidget);
    });

    testWidgets('allows switching to Cash method and confirming payment', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: PaymentScreen(booking: mockBooking),
        ),
      );

      // Tap on Cash method
      await tester.tap(find.byKey(const Key('method_cash_tile')));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Cash Payment • ₹450.00'), findsOneWidget);

      // Tap Pay / Confirm
      await tester.tap(find.byKey(const Key('pay_button')));
      await tester.pumpAndSettle();

      // Verify Cash confirmation dialog appears
      expect(find.text('Cash on Completion'), findsWidgets);
      expect(find.byKey(const Key('cash_confirm_ok_button')), findsOneWidget);

      // Confirm cash payment
      await tester.tap(find.byKey(const Key('cash_confirm_ok_button')));
      await tester.pumpAndSettle();

      // Verify completion view
      expect(find.text('Cash Payment Confirmed!'), findsOneWidget);
      expect(find.byKey(const Key('done_button')), findsOneWidget);
    });
  });

  group('Module 6 Task 6: WalletScreen Widget Tests', () {
    setUp(() {
      ApiService.currentToken = 'mock_jwt_token';
      ApiService.client = MockClient((request) async {
        if (request.url.path.endsWith('/wallet') && request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'balance_paise': 46000, // ₹460.00
              'is_available': true,
              'min_threshold_paise': 10000,
              'ledger': [
                {
                  'id': 'entry-1',
                  'entry_type': 'commission_deduction',
                  'amount_paise': -4000,
                  'balance_after_paise': 46000,
                  'booking_id': 'booking-abc-123',
                },
                {
                  'id': 'entry-2',
                  'entry_type': 'topup',
                  'amount_paise': 20000,
                  'balance_after_paise': 50000,
                  'booking_id': null,
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.endsWith('/topup') && request.method == 'POST') {
          final body = jsonDecode(request.body);
          final amount = body['amount_paise'] as int;
          return http.Response(
            jsonEncode({
              'balance_paise': 46000 + amount,
              'is_available': true,
              'ledger_entry': {
                'id': 'entry-new',
                'entry_type': 'topup',
                'amount_paise': amount,
                'balance_after_paise': 46000 + amount,
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":{"message":"Not Found"}}', 404);
      });
    });

    testWidgets('renders balance card, active status, topup presets, and ledger entries', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: WalletScreen(providerProfileId: 'provider-profile-uuid-1'),
        ),
      );
      await tester.pumpAndSettle();

      // Balance Card verification
      expect(find.text('CURRENT BALANCE'), findsOneWidget);
      expect(find.text('₹460.00'), findsOneWidget);
      expect(find.text('ACTIVE FOR JOBS'), findsOneWidget);

      // Top up presets
      expect(find.byKey(const Key('preset_chip_100')), findsOneWidget);
      expect(find.byKey(const Key('preset_chip_200')), findsOneWidget);
      expect(find.byKey(const Key('preset_chip_500')), findsOneWidget);
      expect(find.byKey(const Key('preset_chip_1000')), findsOneWidget);
      expect(find.byKey(const Key('topup_preset_button')), findsOneWidget);

      // Ledger entries
      expect(find.text('Wallet Ledger & Deductions'), findsOneWidget);
      expect(find.text('10% Platform Commission'), findsOneWidget);
      expect(find.text('-₹40.00'), findsOneWidget);
      expect(find.text('Prepaid Wallet Top-Up'), findsOneWidget);
      expect(find.text('+₹200.00'), findsOneWidget);
    });

    testWidgets('performs top up and updates balance instantly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: WalletScreen(providerProfileId: 'provider-profile-uuid-1'),
        ),
      );
      await tester.pumpAndSettle();

      // Tap preset chip ₹500
      await tester.tap(find.byKey(const Key('preset_chip_500')));
      await tester.pumpAndSettle();

      expect(find.text('Top Up ₹500 via UPI'), findsOneWidget);

      // Tap Top Up button
      await tester.tap(find.byKey(const Key('topup_preset_button')));
      await tester.pumpAndSettle();

      // Balance should increase: 460 + 500 = ₹960.00
      expect(find.text('₹960.00'), findsOneWidget);
      expect(find.text('Successfully topped up ₹500 to wallet!'), findsOneWidget);
    });
  });
}
