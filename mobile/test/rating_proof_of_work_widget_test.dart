import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/rating_screen.dart';
import 'package:mobile/screens/provider_ratings_screen.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  final mockBooking = {
    'id': 'booking-rate-uuid-1',
    'status': 'completed',
    'price_paise': 45000,
    'before_photo_url': 'https://cdn.quotekaro.com/bookings/before_pipe.jpg',
    'after_photo_url': 'https://cdn.quotekaro.com/bookings/after_fixed.jpg',
    'job': {
      'id': 'job-rate-uuid-1',
      'category': 'plumbing',
      'description': 'Under-sink water pipe leakage repair',
      'area': 'Aundh, Pune',
      'photo_urls': ['https://cdn.quotekaro.com/jobs/initial_leak.jpg']
    },
    'provider': {
      'id': 'provider-profile-uuid-1',
      'name': 'Suresh Plumber',
      'avg_rating_honesty': 4.8,
      'avg_rating_punctuality': 4.6,
      'avg_rating_quality': 4.9,
    },
    'customer': {
      'id': 'customer-uuid-1',
      'name': 'Rahul Customer',
    }
  };

  group('Module 7 Task 4: RatingScreen Widget Tests', () {
    setUp(() {
      ApiService.currentToken = 'mock_jwt_token';
      ApiService.client = MockClient((request) async {
        if (request.url.path.endsWith('/rating') && request.method == 'POST') {
          final body = jsonDecode(request.body);
          return http.Response(
            jsonEncode({
              'rating': {
                'id': 'rating-new-uuid',
                'booking_id': 'booking-rate-uuid-1',
                'rating_honesty': body['rating_honesty'],
                'rating_punctuality': body['rating_punctuality'],
                'rating_quality': body['rating_quality'],
                'review_text': body['review_text'],
                'created_at': DateTime.now().toIso8601String(),
              },
              'provider_averages': {
                'avg_rating_honesty': 4.9,
                'avg_rating_punctuality': 4.7,
                'avg_rating_quality': 5.0,
                'total_ratings': 8,
              }
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":{"message":"Not Found"}}', 404);
      });
    });

    testWidgets('renders proof-of-work before/after inspection and 3-axis rating sliders', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: RatingScreen(booking: mockBooking),
        ),
      );

      // Verify Header & Provider Card
      expect(find.text('Rate Your Service'), findsOneWidget);
      expect(find.text('Suresh Plumber'), findsOneWidget);
      expect(find.text('PLUMBING'), findsOneWidget);
      expect(find.text('Completed Service'), findsOneWidget);

      // Verify Proof of Work Section
      expect(find.text('PROOF OF WORK'), findsOneWidget);
      expect(find.text('Before & After Inspection'), findsOneWidget);
      expect(find.text('BEFORE'), findsOneWidget);
      expect(find.text('AFTER'), findsOneWidget);

      // Verify 3-Axis Rating Sliders
      expect(find.text('MULTI-AXIS RATING'), findsOneWidget);
      expect(find.text('1. Honesty & Fair Pricing'), findsOneWidget);
      expect(find.text('2. Punctuality & Arrival Time'), findsOneWidget);
      expect(find.text('3. Quality of Workmanship'), findsOneWidget);
      expect(find.byKey(const Key('slider_honesty')), findsOneWidget);
      expect(find.byKey(const Key('slider_punctuality')), findsOneWidget);
      expect(find.byKey(const Key('slider_quality')), findsOneWidget);

      // Verify Review Text Field & Submit Button
      expect(find.byKey(const Key('review_text_field')), findsOneWidget);
      expect(find.byKey(const Key('submit_rating_button')), findsOneWidget);
    });

    testWidgets('submits 3-axis rating and displays updated provider averages', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: RatingScreen(booking: mockBooking),
        ),
      );

      // Enter review text
      await tester.enterText(find.byKey(const Key('review_text_field')), 'Punctual, fair pricing, and clean workmanship!');
      await tester.pumpAndSettle();

      // Tap Submit Rating Button
      await tester.tap(find.byKey(const Key('submit_rating_button')));
      await tester.pumpAndSettle();

      // Verify Success View
      expect(find.text('Thank You for Rating!'), findsOneWidget);
      expect(find.text('UPDATED PROVIDER AVERAGES'), findsOneWidget);
      expect(find.text('4.9 ★'), findsOneWidget); // Honesty
      expect(find.text('4.7 ★'), findsOneWidget); // Punctuality
      expect(find.text('5.0 ★'), findsOneWidget); // Quality
      expect(find.byKey(const Key('rating_done_button')), findsOneWidget);
    });
  });

  group('Module 7 Task 4: ProviderRatingsScreen Widget Tests', () {
    setUp(() {
      ApiService.currentToken = 'mock_jwt_token';
      ApiService.client = MockClient((request) async {
        if (request.url.path.endsWith('/ratings') && request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'provider_id': 'provider-profile-uuid-1',
              'provider_name': 'Suresh Plumber',
              'averages': {
                'avg_rating_honesty': 4.8,
                'avg_rating_punctuality': 4.5,
                'avg_rating_quality': 4.9,
              },
              'reviews': [
                {
                  'id': 'rev-1',
                  'booking_id': 'b-1',
                  'customer_name': 'Amit Deshmukh',
                  'job_category': 'plumbing',
                  'rating_honesty': 5,
                  'rating_punctuality': 4,
                  'rating_quality': 5,
                  'review_text': 'Honest scoping, fixed tap leak without changing parts unnecessarily.',
                  'created_at': '2026-09-17T12:00:00Z',
                },
                {
                  'id': 'rev-2',
                  'booking_id': 'b-2',
                  'customer_name': 'Pooja Kadam',
                  'job_category': 'plumbing',
                  'rating_honesty': 4,
                  'rating_punctuality': 5,
                  'rating_quality': 5,
                  'review_text': 'Arrived right on ETA and completed the pipeline check fast.',
                  'created_at': '2026-09-16T15:30:00Z',
                }
              ]
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":{"message":"Not Found"}}', 404);
      });
    });

    testWidgets('renders hero blended score card, 3-axis progress bars, and customer review list', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const MaterialApp(
          home: ProviderRatingsScreen(providerProfileId: 'provider-profile-uuid-1'),
        ),
      );
      await tester.pumpAndSettle();

      // Verify Header & Hero Card
      expect(find.text('Ratings & Performance'), findsOneWidget);
      expect(find.text('OVERALL BLENDED RATING'), findsOneWidget);
      // (4.8 + 4.5 + 4.9) / 3 = 4.7
      expect(find.text('4.7'), findsOneWidget);
      expect(find.text('/ 5.0'), findsOneWidget);

      // Verify 3-Axis Score Breakdown Card
      expect(find.text('3-AXIS SCORE BREAKDOWN'), findsOneWidget);
      expect(find.text('Honesty & Transparent Pricing'), findsOneWidget);
      expect(find.text('Punctuality & ETA Adherence'), findsOneWidget);
      expect(find.text('Workmanship Quality & Cleanliness'), findsOneWidget);
      expect(find.text('4.8 ★ (96%)'), findsOneWidget);
      expect(find.text('4.5 ★ (90%)'), findsOneWidget);
      expect(find.text('4.9 ★ (98%)'), findsOneWidget);

      // Verify Customer Reviews
      expect(find.text('CUSTOMER REVIEWS (2)'), findsOneWidget);
      expect(find.text('Amit Deshmukh'), findsOneWidget);
      expect(find.text('"Honest scoping, fixed tap leak without changing parts unnecessarily."'), findsOneWidget);
      expect(find.text('Pooja Kadam'), findsOneWidget);
      expect(find.text('"Arrived right on ETA and completed the pipeline check fast."'), findsOneWidget);
    });
  });
}
