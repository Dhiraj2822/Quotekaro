import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/booking_confirmation_screen.dart';

void main() {
  final mockPlannedBooking = {
    'id': 'booking-uuid-planned-1234',
    'status': 'confirmed',
    'price_paise': 45000,
    'eta_minutes': 30,
    'job': {
      'id': 'job-uuid-1',
      'category': 'plumbing',
      'urgency_type': 'planned',
      'description': 'Leaking tap in master bathroom requires pipe gasket replacement',
      'area': 'Kothrud, Pune',
    },
    'provider': {
      'id': 'provider-uuid-1',
      'name': 'Mahesh Plumber Services',
      'phone_number': '+91 98765 11111',
      'avg_rating_honesty': 4.8,
      'avg_rating_punctuality': 4.9,
      'avg_rating_quality': 4.7,
    },
    'customer': {
      'id': 'customer-uuid-1',
      'name': 'Ramesh Customer',
      'phone_number': '+91 99999 00001',
    }
  };

  final mockUrgentBooking = {
    'id': 'booking-uuid-urgent-5678',
    'status': 'confirmed',
    'price_paise': 65000,
    'eta_minutes': 15,
    'job': {
      'id': 'job-uuid-2',
      'category': 'electrical',
      'urgency_type': 'urgent',
      'description': 'Main spark and sudden power trip',
      'area': 'Viman Nagar, Pune',
    },
    'provider': {
      'id': 'provider-uuid-2',
      'name': 'Quick Electrician Express',
      'phone_number': '+91 98765 22222',
      'avg_rating_honesty': 4.9,
      'avg_rating_punctuality': 5.0,
      'avg_rating_quality': 4.8,
    },
    'customer': {
      'id': 'customer-uuid-2',
      'name': 'Sita Customer',
      'phone_number': '+91 99999 00002',
    }
  };

  testWidgets('BookingConfirmationScreen renders planned job details for customer per 06_UIUX_SPEC.md', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: BookingConfirmationScreen(
          booking: mockPlannedBooking,
          role: 'customer',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify AppBar and Confirmed status
    expect(find.text('Booking Confirmed'), findsOneWidget);
    expect(find.text('Booking Confirmed!'), findsOneWidget);
    expect(find.textContaining('Booking #'), findsOneWidget);

    // 2. Verify Provider Card with KYC and 3-axis reputation score
    expect(find.text('Assigned Service Partner'), findsOneWidget);
    expect(find.text('Mahesh Plumber Services'), findsOneWidget);
    expect(find.text('+91 98765 11111'), findsOneWidget);
    expect(find.text('KYC Verified'), findsOneWidget);
    expect(find.text('Honesty'), findsOneWidget);
    expect(find.text('Punctuality'), findsOneWidget);
    expect(find.text('Quality'), findsOneWidget);

    // 3. Verify Job Category and Area
    expect(find.text('PLUMBING'), findsOneWidget);
    expect(find.text('PLANNED'), findsOneWidget);
    expect(find.text('Kothrud, Pune'), findsOneWidget);

    // 4. Verify Total Agreed Amount
    expect(find.text('Total Agreed Amount'), findsOneWidget);
    expect(find.text('₹450'), findsOneWidget);

    // 5. Verify Actions
    expect(find.byKey(const Key('booking_confirm_action_btn')), findsOneWidget);
    expect(find.byKey(const Key('booking_confirm_home_btn')), findsOneWidget);
    expect(find.text('Back to Home'), findsOneWidget);
  });

  testWidgets('BookingConfirmationScreen renders urgent emergency dispatch banner per 06_UIUX_SPEC.md §2.5', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: BookingConfirmationScreen(
          booking: mockUrgentBooking,
          role: 'customer',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Urgent Dispatch Banner & ETA
    expect(find.text('Provider is on the way!'), findsOneWidget);
    expect(find.textContaining('ETA: 15 mins'), findsOneWidget);
    expect(find.text('URGENT'), findsOneWidget);
    expect(find.text('ELECTRICAL'), findsOneWidget);
    expect(find.text('₹650'), findsOneWidget);
  });

  testWidgets('BookingConfirmationScreen renders provider view with customer details and payout notice', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: BookingConfirmationScreen(
          booking: mockPlannedBooking,
          role: 'provider',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Provider AppBar
    expect(find.text('Booking Assigned'), findsOneWidget);
    expect(find.text('Job Assigned to You!'), findsOneWidget);

    // 2. Verify Customer & Location card
    expect(find.text('Customer & Job Location'), findsOneWidget);
    expect(find.text('Ramesh Customer'), findsOneWidget);
    expect(find.text('+91 99999 00001'), findsOneWidget);
    expect(find.text('Kothrud, Pune'), findsNWidgets(2));

    // 3. Verify Platform commission note
    expect(find.textContaining('Platform commission (10%)'), findsOneWidget);
    expect(find.text('Back to Job Feed'), findsOneWidget);
  });
}
