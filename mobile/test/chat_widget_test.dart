import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/screens/chat_screen.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  const bookingId = 'booking-test-uuid-1';

  final initialMessages = [
    {
      'id': 'msg-1',
      'booking_id': bookingId,
      'sender_id': 'user-customer-1',
      'sender_name': 'Ramesh Customer',
      'sender_role': 'customer',
      'message': 'Please bring a 1/2 inch connector pipe.',
      'is_read': true,
      'created_at': '2026-09-17T10:00:00Z'
    },
    {
      'id': 'msg-2',
      'booking_id': bookingId,
      'sender_id': 'user-provider-1',
      'sender_name': 'Mahesh Plumber',
      'sender_role': 'provider',
      'message': 'Got it, bringing standard brass connectors.',
      'is_read': true,
      'created_at': '2026-09-17T10:02:00Z'
    }
  ];

  setUp(() {
    ApiService.currentToken = 'mock_jwt_token';
    ApiService.currentUser = {
      'id': 'user-customer-1',
      'role': 'customer',
      'name': 'Ramesh Customer'
    };
  });

  testWidgets('ChatScreen renders messages and sends new message per Module 5 Task 3', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    bool messageSent = false;
    ApiService.client = MockClient((request) async {
      if (request.url.path == '/api/v1/bookings/$bookingId/messages') {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({'messages': initialMessages}),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'POST') {
          final body = jsonDecode(request.body);
          expect(body['message'], 'Also check the kitchen tap please.');
          messageSent = true;
          return http.Response(
            jsonEncode({
              'message': {
                'id': 'msg-3',
                'booking_id': bookingId,
                'sender_id': 'user-customer-1',
                'sender_name': 'Ramesh Customer',
                'sender_role': 'customer',
                'message': 'Also check the kitchen tap please.',
                'is_read': false,
                'created_at': '2026-09-17T10:05:00Z'
              }
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        }
      }
      return http.Response('Not Found', 404);
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: ChatScreen(
          bookingId: bookingId,
          otherParticipantName: 'Mahesh Plumber',
          currentUserRole: 'customer',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify App Bar with participant name
    expect(find.descendant(of: find.byType(AppBar), matching: find.text('Mahesh Plumber')), findsOneWidget);
    expect(find.textContaining('In-App Booking Chat'), findsOneWidget);

    // 2. Verify Message Bubbles
    expect(find.text('Please bring a 1/2 inch connector pipe.'), findsOneWidget);
    expect(find.text('Got it, bringing standard brass connectors.'), findsOneWidget);

    // 3. Type new message into input field
    final inputField = find.byKey(const Key('chat_input_field'));
    expect(inputField, findsOneWidget);
    await tester.enterText(inputField, 'Also check the kitchen tap please.');
    await tester.pumpAndSettle();

    // 4. Tap Send Button
    final sendBtn = find.byKey(const Key('chat_send_button'));
    expect(sendBtn, findsOneWidget);
    await tester.tap(sendBtn);
    await tester.pumpAndSettle();

    // 5. Verify Message was sent and added to view
    expect(messageSent, isTrue);
    expect(find.text('Also check the kitchen tap please.'), findsOneWidget);
  });
}
