import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/post_job_screen.dart';
import 'package:mobile/services/api_service.dart';
import 'dart:convert';

void main() {
  setUp(() {
    ApiService.currentToken = 'mock_jwt_token_for_testing';
    ApiService.currentUser = {
      'id': '11111111-1111-1111-1111-111111111111',
      'role': 'customer',
      'name': 'Priya Customer',
      'phone_number': '+919999900001'
    };
  });

  testWidgets('PostJobScreen renders all required form controls per 06_UIUX_SPEC.md', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: PostJobScreen(initialCategory: 'plumbing'),
      ),
    );

    // Verify Title
    expect(find.text('Post a Job'), findsOneWidget);

    // Verify Categories
    expect(find.text('Plumbing'), findsOneWidget);
    expect(find.text('Electrical'), findsOneWidget);
    expect(find.text('Painting'), findsOneWidget);
    expect(find.text('Cleaning'), findsOneWidget);

    // Verify Urgency Toggle (Planned vs Urgent)
    expect(find.text('Planned Job'), findsOneWidget);
    expect(find.text('Urgent Emergency'), findsOneWidget);

    // Verify Description & Area
    expect(find.text('3. Job Description'), findsOneWidget);
    expect(find.text('5. Service Location / Area'), findsOneWidget);

    // Verify Submit button
    expect(find.byKey(const Key('submit_job_button')), findsOneWidget);
  });

  testWidgets('PostJobScreen toggles urgency type between planned and urgent', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: PostJobScreen(initialCategory: 'plumbing'),
      ),
    );

    // Initially planned
    expect(find.text('Post Job & Request Quotes'), findsOneWidget);

    // Tap Urgent Emergency
    await tester.tap(find.text('Urgent Emergency'));
    await tester.pump();

    // Button label changes to reflect urgent dispatch
    expect(find.text('Post Urgent Emergency Request'), findsOneWidget);
  });

  testWidgets('PostJobScreen successfully posts job with ApiService mock', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/jobs' && request.method == 'POST') {
        final body = jsonDecode(request.body);
        return http.Response(
          jsonEncode({
            'job': {
              'id': '99999999-9999-9999-9999-999999999999',
              'category': body['category'],
              'urgency_type': body['urgency_type'],
              'area': body['area'],
              'status': 'open'
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
        home: PostJobScreen(initialCategory: 'plumbing'),
      ),
    );

    // Enter description
    await tester.enterText(
      find.byType(TextFormField).first,
      'Kitchen sink pipe is leaking heavily under sink cabinet',
    );

    // Tap Submit
    await tester.tap(find.byKey(const Key('submit_job_button')));
    await tester.pumpAndSettle();

    // Verify confirmation dialog
    expect(find.text('Job Posted Successfully!'), findsOneWidget);
    expect(find.text('Back to Home'), findsOneWidget);
  });
}
