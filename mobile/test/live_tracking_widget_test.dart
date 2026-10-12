import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/live_tracking_screen.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  const bookingId = 'booking-track-test-uuid-1';

  final mockBooking = {
    'id': bookingId,
    'status': 'confirmed',
    'price_paise': 50000,
    'eta_minutes': 15,
    'job': {
      'id': 'job-1',
      'category': 'plumbing',
      'description': 'Main valve repair',
      'area': 'Kothrud, Pune',
      'lat': 18.5074,
      'lng': 73.8077,
    },
    'provider': {
      'id': 'provider-1',
      'name': 'Mahesh Plumber',
      'phone_number': '+91 98765 43210',
      'lat': 18.5140,
      'lng': 73.8120,
    },
    'customer': {
      'id': 'customer-1',
      'name': 'Ramesh Customer',
      'phone_number': '+91 99999 00001',
    }
  };

  final mockTrackingResponse = {
    'provider_lat': 18.5140,
    'provider_lng': 73.8120,
    'destination_lat': 18.5074,
    'destination_lng': 73.8077,
    'eta_minutes': 12,
    'distance_km': 2.4,
    'status': 'confirmed',
    'route_provider': 'google_maps'
  };

  setUp(() {
    ApiService.currentToken = 'mock_jwt_token';
    ApiService.currentUser = {
      'id': 'customer-1',
      'role': 'customer',
      'name': 'Ramesh Customer'
    };
  });

  testWidgets('Customer LiveTrackingScreen renders ETA, map canvas, stepper, and masked calling per 06_UIUX_SPEC.md §2.6', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/bookings/$bookingId/track') {
        return http.Response(
          jsonEncode(mockTrackingResponse),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    await tester.pumpWidget(
      MaterialApp(
        home: LiveTrackingScreen(
          booking: mockBooking,
          isCustomer: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify App Bar
    expect(find.text('Live Tracking & ETA'), findsOneWidget);
    expect(find.textContaining('PLUMBING'), findsOneWidget);

    // 2. Verify GPS and Distance/ETA chips
    expect(find.text('GPS Active'), findsOneWidget);
    expect(find.text('12 mins • 2.4 km'), findsOneWidget);

    // 3. Verify Status Stepper
    expect(find.text('Confirmed'), findsOneWidget);
    expect(find.text('En Route'), findsOneWidget);
    expect(find.text('In Progress'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);

    // 4. Verify Partner Card
    expect(find.text('Mahesh Plumber'), findsOneWidget);
    expect(find.text('Verified Service Partner'), findsOneWidget);

    // 5. Test Masked Call Dialog (07_SECURITY.md §2)
    final callBtn = find.byKey(const Key('tracking_call_btn'));
    expect(callBtn, findsOneWidget);
    await tester.tap(callBtn);
    await tester.pumpAndSettle();

    expect(find.text('Masked Voice Call'), findsOneWidget);
    expect(find.textContaining('Virtual Proxy Number: +91 80 4709 8211'), findsOneWidget);
    expect(find.text('Call Proxy'), findsOneWidget);
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();

    // 6. Verify Chat Button
    expect(find.byKey(const Key('tracking_chat_btn')), findsOneWidget);
  });

  testWidgets('Provider LiveTrackingScreen transitions status from Confirmed -> En Route -> In Progress (Module 5 DoD)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    String currentServerStatus = 'confirmed';

    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/bookings/$bookingId/track') {
        final res = Map<String, dynamic>.from(mockTrackingResponse);
        res['status'] = currentServerStatus;
        return http.Response(jsonEncode(res), 200, headers: {'content-type': 'application/json'});
      }
      if (request.url.path == '/api/v1/bookings/$bookingId/status' && request.method == 'PATCH') {
        final body = jsonDecode(request.body);
        currentServerStatus = body['status'];
        final updatedBooking = Map<String, dynamic>.from(mockBooking);
        updatedBooking['status'] = currentServerStatus;
        return http.Response(jsonEncode({'booking': updatedBooking}), 200, headers: {'content-type': 'application/json'});
      }
      return http.Response('Not Found', 404);
    });

    await tester.pumpWidget(
      MaterialApp(
        home: LiveTrackingScreen(
          booking: mockBooking,
          isCustomer: false,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Provider Title
    expect(find.text('Service Navigation & Status'), findsOneWidget);

    // 2. Verify "Start Trip / Mark En Route" button appears
    final enRouteBtn = find.byKey(const Key('provider_mark_en_route_btn'));
    expect(enRouteBtn, findsOneWidget);
    expect(find.text('Start Trip / Mark En Route'), findsOneWidget);

    // 3. Provider taps "Start Trip / Mark En Route"
    await tester.tap(enRouteBtn);
    await tester.pumpAndSettle();

    expect(currentServerStatus, 'en_route');

    // 4. Verify "Arrived / Start Work (In Progress)" button now appears
    final inProgressBtn = find.byKey(const Key('provider_mark_in_progress_btn'));
    expect(inProgressBtn, findsOneWidget);
    expect(find.text('Arrived / Start Work (In Progress)'), findsOneWidget);

    // 5. Provider taps "Arrived / Start Work"
    await tester.tap(inProgressBtn);
    await tester.pumpAndSettle();

    expect(currentServerStatus, 'in_progress');
    expect(find.textContaining('Work in progress!'), findsOneWidget);
  });
}
