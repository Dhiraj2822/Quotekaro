import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:mobile/screens/provider_kyc_screen.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  setUp(() {
    ApiService.currentToken = 'mock_jwt_token';
    ApiService.currentUser = {
      'id': '22222222-2222-2222-2222-222222222222',
      'role': 'provider',
      'phone_number': '+919999900002'
    };

    ApiService.client = MockClient((request) async {
      if (request.url.path.endsWith('/providers/kyc')) {
        return http.Response(
          jsonEncode({
            'provider_profile': {
              'id': 'prof-111',
              'user_id': '22222222-2222-2222-2222-222222222222',
              'kyc_status': 'pending',
              'is_available': false,
              'kyc_document_url': 'https://storage.quotekaro.com/kyc/test.pdf'
            }
          }),
          200,
        );
      }

      if (request.url.path.contains('/availability')) {
        final body = jsonDecode(request.body);
        if (body['is_available'] == true) {
          // Emulate backend rejection for unapproved provider
          return http.Response(
            jsonEncode({
              'error': {
                'code': 'KYC_NOT_APPROVED',
                'message': 'Provider must be KYC approved before becoming available'
              }
            }),
            400,
          );
        }
        return http.Response(
          jsonEncode({
            'provider_profile': {
              'id': 'prof-111',
              'is_available': false,
              'kyc_status': 'pending'
            }
          }),
          200,
        );
      }

      if (request.url.path.contains('/service-area')) {
        return http.Response(
          jsonEncode({
            'provider_profile': {
              'id': 'prof-111',
              'categories': ['plumbing', 'electrical'],
              'service_area_radius_km': 25,
              'base_location_lat': 18.520430,
              'base_location_lng': 73.856744
            }
          }),
          200,
        );
      }

      return http.Response(jsonEncode({'error': {'code': 'NOT_FOUND'}}), 404);
    });
  });

  testWidgets('Provider KYC screen renders and tests KYC submission, availability gate, and service area', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const MaterialApp(
      home: ProviderKycScreen(
        initialProfile: {
          'id': 'prof-111',
          'kyc_status': 'pending',
          'is_available': false,
          'service_area_radius_km': 15,
          'categories': ['plumbing']
        },
      ),
    ));

    // Verify KYC status
    expect(find.text('KYC Pending Review'), findsOneWidget);
    expect(find.byKey(const Key('submit_kyc_button')), findsOneWidget);

    // Tap submit KYC document
    await tester.tap(find.byKey(const Key('submit_kyc_button')));
    await tester.pumpAndSettle();

    expect(find.text('KYC document submitted successfully! Status is now Pending review.'), findsOneWidget);

    // Test Availability gate: attempt to toggle availability while pending
    await tester.tap(find.byKey(const Key('availability_switch')));
    await tester.pumpAndSettle();

    // Verify error banner is shown with KYC gate error message
    expect(find.text('Provider must be KYC approved before becoming available'), findsOneWidget);

    // Test Service Area & Categories
    await tester.tap(find.byKey(const Key('chip_electrical')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('save_service_area_button')));
    await tester.pumpAndSettle();

    expect(find.text('Service area and categories saved successfully!'), findsOneWidget);
  });
}
