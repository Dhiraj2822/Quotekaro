import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/quote_comparison_screen.dart';
import 'package:mobile/services/api_service.dart';
import 'dart:convert';

void main() {
  const testJob = {
    'id': 'job-planned-uuid-1',
    'category': 'painting',
    'urgency_type': 'planned',
    'description': 'Paint living room 2 walls with primer',
    'area': 'Kothrud, Pune',
  };

  final mockQuotesBlended = [
    {
      'id': 'quote-top-rated',
      'job_id': 'job-planned-uuid-1',
      'provider_id': 'provider-premium-id',
      'price_paise': 48000, // ₹480
      'eta_minutes': 30,
      'message': 'Includes 6-month peeling warranty and premium paint',
      'status': 'pending',
      'blended_score': 0.8967,
      'provider': {
        'id': 'provider-premium-id',
        'name': 'Pinnacle Paints Pro',
        'overall_rating': 4.9,
        'avg_rating_honesty': 4.9,
        'avg_rating_punctuality': 5.0,
        'avg_rating_quality': 4.8,
        'service_area_radius_km': 15
      }
    },
    {
      'id': 'quote-cheap-id',
      'job_id': 'job-planned-uuid-1',
      'provider_id': 'provider-cheap-id',
      'price_paise': 40000, // ₹400
      'eta_minutes': 45,
      'message': 'Basic wall paint only',
      'status': 'pending',
      'blended_score': 0.7500,
      'provider': {
        'id': 'provider-cheap-id',
        'name': 'Budget Painters',
        'overall_rating': 2.5,
        'avg_rating_honesty': 2.5,
        'avg_rating_punctuality': 2.5,
        'avg_rating_quality': 2.5,
        'service_area_radius_km': 10
      }
    }
  ];

  setUp(() {
    ApiService.currentToken = 'mock_customer_jwt_token';
    ApiService.currentUser = {
      'id': 'customer-uuid-1',
      'role': 'customer',
      'name': 'Priya Customer'
    };
  });

  testWidgets('QuoteComparisonScreen renders provider cards with 3-axis rating bars and blended sort per 06_UIUX_SPEC.md', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    String? requestedSort;
    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/jobs/job-planned-uuid-1/quotes') {
        requestedSort = request.url.queryParameters['sort'];
        return http.Response(
          jsonEncode({'quotes': mockQuotesBlended}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: QuoteComparisonScreen(job: testJob),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify default sort is blended
    expect(requestedSort, 'blended');

    // 2. Verify Anti-race-to-the-bottom principle banner
    expect(find.textContaining('Ranked by Smart Blended Score'), findsOneWidget);

    // 3. Verify Provider cards
    expect(find.text('Pinnacle Paints Pro'), findsOneWidget);
    expect(find.text('TOP MATCH'), findsOneWidget);
    expect(find.text('Budget Painters'), findsOneWidget);

    // 4. Verify 3-Axis Rating Bars on each card per 06_UIUX_SPEC.md §2
    expect(find.text('Honesty'), findsNWidgets(2));
    expect(find.text('Punctuality'), findsNWidgets(2));
    expect(find.text('Quality'), findsNWidgets(2));

    // 5. Verify Prices and ETA
    expect(find.text('₹480'), findsOneWidget);
    expect(find.text('₹400'), findsOneWidget);
    expect(find.text('30 mins ETA'), findsOneWidget);
    expect(find.text('45 mins ETA'), findsOneWidget);
  });

  testWidgets('QuoteComparisonScreen toggles sort and accepts quote to confirm booking', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    bool acceptCalled = false;
    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/jobs/job-planned-uuid-1/quotes') {
        return http.Response(
          jsonEncode({'quotes': mockQuotesBlended}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/api/v1/jobs/job-planned-uuid-1/accept-quote' && request.method == 'POST') {
        final body = jsonDecode(request.body);
        expect(body['quote_id'], 'quote-top-rated');
        acceptCalled = true;

        return http.Response(
          jsonEncode({
            'booking': {
              'id': 'booking-confirmed-uuid',
              'job_id': 'job-planned-uuid-1',
              'quote_id': 'quote-top-rated',
              'status': 'confirmed'
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
        home: QuoteComparisonScreen(job: testJob),
      ),
    );
    await tester.pumpAndSettle();

    // Tap Lowest Price sort option
    await tester.tap(find.text('Lowest Price'));
    await tester.pumpAndSettle();

    // Tap Accept Quote on top rated provider
    final acceptBtn = find.byKey(const Key('accept_quote_btn_quote-top-rated'));
    expect(acceptBtn, findsOneWidget);
    await tester.tap(acceptBtn);
    await tester.pumpAndSettle();

    // Confirm dialog appears
    expect(find.text('Confirm Booking'), findsOneWidget);
    expect(find.byKey(const Key('dialog_confirm_accept_quote_btn')), findsOneWidget);

    // Tap Accept & Book in dialog
    await tester.tap(find.byKey(const Key('dialog_confirm_accept_quote_btn')));
    await tester.pumpAndSettle();

    expect(acceptCalled, isTrue);
  });
}
