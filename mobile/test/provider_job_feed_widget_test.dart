import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/provider_job_feed_screen.dart';
import 'package:mobile/services/api_service.dart';
import 'dart:convert';

void main() {
  setUp(() {
    ApiService.currentToken = 'mock_jwt_provider_token';
    ApiService.currentUser = {
      'id': '22222222-2222-2222-2222-222222222222',
      'role': 'provider',
      'name': 'Ramesh Plumber',
      'phone_number': '+919999900031'
    };

    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/jobs/nearby') {
        return http.Response(
          jsonEncode({
            'jobs': [
              {
                'id': 'job-live-1',
                'category': 'plumbing',
                'urgency_type': 'urgent',
                'description': 'Urgent: Kitchen sink pipe leak under cabinet',
                'photo_urls': ['https://storage.quotekaro.com/jobs/leak.jpg'],
                'area': 'Kothrud, Pune',
                'distance_km': 2.4,
                'status': 'open',
                'customer_name': 'Priya S.',
                'created_at': '5 mins ago'
              },
              {
                'id': 'job-live-2',
                'category': 'plumbing',
                'urgency_type': 'planned',
                'description': 'Replace bathroom shower taps and diverter',
                'photo_urls': [],
                'area': 'Shivajinagar, Pune',
                'distance_km': 4.1,
                'status': 'open',
                'customer_name': 'Anand K.',
                'created_at': '30 mins ago'
              }
            ]
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });
  });

  testWidgets('ProviderJobFeedScreen renders job feed with categories, distance, and urgency badges', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: ProviderJobFeedScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Title
    expect(find.text('Nearby Job Leads'), findsOneWidget);

    // Verify Category choice chips
    expect(find.text('ALL'), findsOneWidget);
    expect(find.text('PLUMBING'), findsWidgets);

    // Verify Urgent badge and distance
    expect(find.text('URGENT'), findsOneWidget);
    expect(find.text('2.4 km away'), findsOneWidget);
    expect(find.text('Urgent: Kitchen sink pipe leak under cabinet'), findsOneWidget);

    // Verify Planned job is also rendered
    expect(find.text('Replace bathroom shower taps and diverter'), findsOneWidget);
    expect(find.text('4.1 km away'), findsOneWidget);
  });

  testWidgets('ProviderJobFeedScreen opens quote dialog when action button tapped', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: ProviderJobFeedScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Find and tap quote action button on the first card
    final quoteButton = find.byKey(const Key('quote_button_0'));
    expect(quoteButton, findsOneWidget);
    await tester.tap(quoteButton);
    await tester.pumpAndSettle();

    // Verify Quote dialog elements
    expect(find.text('Estimated Price (₹)'), findsOneWidget);
    expect(find.byKey(const Key('dialog_submit_quote_button')), findsOneWidget);

    // Tap Submit Quote button in dialog
    await tester.tap(find.byKey(const Key('dialog_submit_quote_button')));
    await tester.pumpAndSettle();

    // Dialog dismissed
    expect(find.text('Estimated Price (₹)'), findsNothing);
  });
}
