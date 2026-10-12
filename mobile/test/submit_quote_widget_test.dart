import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/submit_quote_screen.dart';
import 'package:mobile/services/api_service.dart';
import 'dart:convert';

void main() {
  const testJob = {
    'id': 'test-job-uuid-1',
    'category': 'plumbing',
    'urgency_type': 'planned',
    'description': 'Replace bathroom shower faucet and mixer',
    'area': 'Kothrud, Pune',
    'distance_km': 3.5,
    'photo_urls': ['https://storage.quotekaro.com/jobs/faucet.jpg']
  };

  setUp(() {
    ApiService.currentToken = 'mock_provider_jwt_token';
    ApiService.currentUser = {
      'id': 'provider-uuid-1',
      'role': 'provider',
      'name': 'Ramesh Plumber'
    };
  });

  testWidgets('SubmitQuoteScreen renders job details and form inputs per 06_UIUX_SPEC.md §3', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: SubmitQuoteScreen(job: testJob),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Job Summary
    expect(find.text('PLUMBING'), findsOneWidget);
    expect(find.text('Area: Kothrud, Pune'), findsOneWidget);
    expect(find.text('Replace bathroom shower faucet and mixer'), findsOneWidget);
    expect(find.text('3.5 km away from your base location'), findsOneWidget);

    // 2. Verify Form Controls
    expect(find.byKey(const Key('quote_price_input')), findsOneWidget);
    expect(find.byKey(const Key('quote_eta_input')), findsOneWidget);
    expect(find.byKey(const Key('quote_message_input')), findsOneWidget);
    expect(find.byKey(const Key('submit_quote_btn')), findsOneWidget);

    // 3. Verify quick ETA choice chips
    expect(find.text('15 mins'), findsOneWidget);
    expect(find.text('30 mins'), findsOneWidget);
    expect(find.text('45 mins'), findsOneWidget);
    expect(find.text('60 mins'), findsOneWidget);
  });

  testWidgets('SubmitQuoteScreen validates required fields and calls ApiService.submitQuote', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    bool apiCalled = false;
    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/jobs/test-job-uuid-1/quotes' && request.method == 'POST') {
        final body = jsonDecode(request.body);
        expect(body['price_paise'], 45000); // ₹450 = 45000 paise
        expect(body['eta_minutes'], 30);
        expect(body['message'], 'Includes spare washer kit and 30-day warranty');
        apiCalled = true;

        return http.Response(
          jsonEncode({
            'quote': {
              'id': 'quote-uuid-1',
              'job_id': 'test-job-uuid-1',
              'price_paise': 45000,
              'eta_minutes': 30,
              'status': 'pending'
            }
          }),
          201,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: SubmitQuoteScreen(job: testJob),
      ),
    );
    await tester.pumpAndSettle();

    // Submit empty form -> validation error
    await tester.tap(find.byKey(const Key('submit_quote_btn')));
    await tester.pumpAndSettle();
    expect(find.text('Please enter your quote price'), findsOneWidget);
    expect(apiCalled, isFalse);

    // Fill valid price, eta, and message
    await tester.enterText(find.byKey(const Key('quote_price_input')), '450');
    await tester.enterText(find.byKey(const Key('quote_eta_input')), '30');
    await tester.enterText(
      find.byKey(const Key('quote_message_input')),
      'Includes spare washer kit and 30-day warranty',
    );

    // Submit quote
    await tester.tap(find.byKey(const Key('submit_quote_btn')));
    await tester.pumpAndSettle();

    expect(apiCalled, isTrue);
  });
}
