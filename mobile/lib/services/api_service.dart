import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Configurable base URL: can be passed via --dart-define=API_BASE_URL=... or overridden at runtime
  static String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://quotekaro-backend.onrender.com/api/v1',
  );

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static http.Client client = http.Client();

  static String? currentToken;
  static Map<String, dynamic>? currentUser;

  /// Request OTP for a phone number
  static Future<Map<String, dynamic>> asyncRequestOtp(String phoneNumber) async {
    final url = Uri.parse('$baseUrl/auth/otp/request');
    final response = await client.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone_number': phoneNumber}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {'success': true};
    } else {
      final message = data['error']?['message'] ?? 'Failed to send OTP';
      throw Exception(message);
    }
  }

  /// Verify OTP and obtain JWT + User profile
  static Future<Map<String, dynamic>> verifyOtp({
    required String phoneNumber,
    required String otp,
    required String role,
  }) async {
    final url = Uri.parse('$baseUrl/auth/otp/verify');
    final response = await client.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone_number': phoneNumber,
        'otp': otp,
        'role': role,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      currentToken = data['token'];
      currentUser = data['user'];
      return data;
    } else {
      final message = data['error']?['message'] ?? 'Invalid OTP';
      throw Exception(message);
    }
  }

  /// Upload photo to backend
  static Future<String> uploadPhoto({required String base64Data, String? filename}) async {
    final url = Uri.parse('$baseUrl/upload');
    final response = await client.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'image': base64Data,
        'filename': filename ?? 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg',
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300 && data['url'] != null) {
      return data['url'] as String;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to upload photo');
    }
  }

  /// Fetch authenticated user profile
  static Future<Map<String, dynamic>> getMe() async {
    if (currentToken == null) {
      throw Exception('Not authenticated');
    }

    final url = Uri.parse('$baseUrl/auth/me');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      currentUser = data['user'];
      return data['user'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch user');
    }
  }

  /// Submit KYC document for provider
  static Future<Map<String, dynamic>> submitKyc(String documentUrl) async {
    final url = Uri.parse('$baseUrl/providers/kyc');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'document_url': documentUrl}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['provider_profile'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to submit KYC document');
    }
  }

  /// Update provider availability status (subject to KYC gate)
  static Future<Map<String, dynamic>> updateAvailability(String profileId, bool isAvailable) async {
    final url = Uri.parse('$baseUrl/providers/$profileId/availability');
    final response = await client.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'is_available': isAvailable}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['provider_profile'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to update availability');
    }
  }

  /// Update provider service categories, operating radius and coordinates
  static Future<Map<String, dynamic>> updateServiceArea({
    required String profileId,
    required List<String> categories,
    required int radiusKm,
    required double lat,
    required double lng,
  }) async {
    final url = Uri.parse('$baseUrl/providers/$profileId/service-area');
    final response = await client.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        'categories': categories,
        'radius_km': radiusKm,
        'lat': lat,
        'lng': lng,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['provider_profile'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to update service area');
    }
  }

  /// Get provider profile by id
  static Future<Map<String, dynamic>> getProviderProfile(String profileId) async {
    final url = Uri.parse('$baseUrl/providers/$profileId');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['provider_profile'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch provider profile');
    }
  }

  /// Customer posts a new job per 05_API_SPEC.md
  static Future<Map<String, dynamic>> createJob({
    required String category,
    required String urgencyType,
    required String description,
    required List<String> photoUrls,
    required String area,
    required double lat,
    required double lng,
  }) async {
    final url = Uri.parse('$baseUrl/jobs');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        'category': category,
        'urgency_type': urgencyType,
        'description': description,
        'photo_urls': photoUrls,
        'area': area,
        'lat': lat,
        'lng': lng,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data['job'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to post job');
    }
  }

  /// Get customer's posted jobs
  static Future<List<dynamic>> getMyJobs() async {
    final url = Uri.parse('$baseUrl/jobs');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['jobs'] ?? [];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch customer jobs');
    }
  }

  /// Get nearby jobs matching provider category and location
  static Future<List<dynamic>> getNearbyJobs({
    String? category,
    double? lat,
    double? lng,
    int? radiusKm,
  }) async {
    final queryParams = <String, String>{};
    if (category != null) queryParams['category'] = category;
    if (lat != null) queryParams['lat'] = lat.toString();
    if (lng != null) queryParams['lng'] = lng.toString();
    if (radiusKm != null) queryParams['radius_km'] = radiusKm.toString();

    final uri = Uri.parse('$baseUrl/jobs/nearby').replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final response = await client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['jobs'] ?? [];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch nearby jobs');
    }
  }

  /// Provider submits a quote for a job per 05_API_SPEC.md
  static Future<Map<String, dynamic>> submitQuote({
    required String jobId,
    required int pricePaise,
    int? etaMinutes,
    String? message,
  }) async {
    final url = Uri.parse('$baseUrl/jobs/$jobId/quotes');
    final payload = <String, dynamic>{
      'price_paise': pricePaise,
    };
    if (etaMinutes != null) payload['eta_minutes'] = etaMinutes;
    if (message != null && message.isNotEmpty) payload['message'] = message;

    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode(payload),
    );



    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data['quote'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to submit quote');
    }
  }

  /// Customer retrieves quotes for a job (sorted by blended score by default)
  static Future<List<dynamic>> getQuotes(String jobId, {String sort = 'blended'}) async {
    final uri = Uri.parse('$baseUrl/jobs/$jobId/quotes').replace(
      queryParameters: {'sort': sort},
    );
    final response = await client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['quotes'] ?? [];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch quotes');
    }
  }

  /// Customer accepts a quote and confirms booking
  static Future<Map<String, dynamic>> acceptQuote({
    required String jobId,
    required String quoteId,
  }) async {
    final url = Uri.parse('$baseUrl/jobs/$jobId/accept-quote');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'quote_id': quoteId}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data['booking'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to accept quote');
    }
  }

  /// Urgent Job Auto-Match per 03_SYSTEM_DESIGN.md §4:
  /// Dispatches urgent job to nearest available top-rated provider and creates booking immediately
  static Future<Map<String, dynamic>> autoMatchUrgentJob(String jobId) async {
    final url = Uri.parse('$baseUrl/jobs/$jobId/auto-match');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data['booking'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to auto-match urgent job');
    }
  }

  /// Retrieve booking by ID with full job, provider, and customer details
  static Future<Map<String, dynamic>> getBooking(String bookingId) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['booking'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to load booking');
    }
  }

  /// Retrieve all bookings for the authenticated user (customer or provider)
  static Future<List<dynamic>> getMyBookings() async {
    final url = Uri.parse('$baseUrl/bookings');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['bookings'] ?? [];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to load bookings');
    }
  }

  /// Update booking status (e.g. en_route, in_progress, cancelled) per 05_API_SPEC.md
  static Future<Map<String, dynamic>> updateBookingStatus({
    required String bookingId,
    required String status,
    double? lat,
    double? lng,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/status');
    final payload = <String, dynamic>{'status': status};
    if (lat != null) payload['lat'] = lat;
    if (lng != null) payload['lng'] = lng;

    final response = await client.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode(payload),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['booking'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to update booking status');
    }
  }

  /// Provider sends live GPS coordinates ping
  static Future<Map<String, dynamic>> updateBookingLocation({
    required String bookingId,
    required double lat,
    required double lng,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/location');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'lat': lat, 'lng': lng}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to update location');
    }
  }

  /// Get live tracking details and ETA for booking per 05_API_SPEC.md
  static Future<Map<String, dynamic>> getBookingTrack(String bookingId) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/track');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to fetch live tracking');
    }
  }

  /// Retrieve chat messages for a booking (polling-based per Module 5 Task 3)
  static Future<List<dynamic>> getBookingMessages(String bookingId, {String? since}) async {
    final queryParams = <String, String>{};
    if (since != null) queryParams['since'] = since;

    final uri = Uri.parse('$baseUrl/bookings/$bookingId/messages')
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

    final response = await client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['messages'] ?? [];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to load messages');
    }
  }

  /// Send an in-app chat message for a booking
  static Future<Map<String, dynamic>> sendBookingMessage({
    required String bookingId,
    required String message,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/messages');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'message': message}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data['message'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to send message');
    }
  }

  /// Create payment intent for a booking (UPI, Card, Cash) per 05_API_SPEC.md
  static Future<Map<String, dynamic>> createPaymentIntent({
    required String bookingId,
    required String method,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/payment');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({'method': method}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 || response.statusCode == 201) {
      return data['payment_intent'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to initiate payment');
    }
  }

  /// Verify Razorpay checkout payment completion
  static Future<Map<String, dynamic>> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final url = Uri.parse('$baseUrl/payments/verify');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        'booking_id': bookingId,
        'razorpay_order_id': razorpayOrderId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_signature': razorpaySignature,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Payment verification failed');
    }
  }

  /// Complete a booking and trigger wallet commission deduction
  static Future<Map<String, dynamic>> completeBooking({
    required String bookingId,
    String? afterPhotoUrl,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/complete');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        if (afterPhotoUrl != null) 'after_photo_url': afterPhotoUrl,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to complete booking');
    }
  }

  /// Get provider's wallet balance and ledger history per 05_API_SPEC.md
  static Future<Map<String, dynamic>> getProviderWallet(String providerProfileId) async {
    final url = Uri.parse('$baseUrl/providers/$providerProfileId/wallet');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to load wallet');
    }
  }

  /// Top up provider's prepaid wallet per 05_API_SPEC.md
  static Future<Map<String, dynamic>> topupWallet({
    required String providerProfileId,
    required int amountPaise,
    String method = 'upi',
  }) async {
    final url = Uri.parse('$baseUrl/providers/$providerProfileId/wallet/topup');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        'amount_paise': amountPaise,
        'method': method,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to top up wallet');
    }
  }

  /// Submit 3-axis rating for completed booking per 05_API_SPEC.md & Module 7
  static Future<Map<String, dynamic>> submitRating({
    required String bookingId,
    required int ratingHonesty,
    required int ratingPunctuality,
    required int ratingQuality,
    String? reviewText,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/rating');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        'rating_honesty': ratingHonesty,
        'rating_punctuality': ratingPunctuality,
        'rating_quality': ratingQuality,
        if (reviewText != null && reviewText.trim().isNotEmpty) 'review_text': reviewText.trim(),
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to submit rating');
    }
  }

  /// Get rating for a booking
  static Future<Map<String, dynamic>?> getBookingRating(String bookingId) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/rating');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['rating'];
    } else if (response.statusCode == 404) {
      return null;
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['error']?['message'] ?? 'Failed to fetch rating');
    }
  }

  /// Get provider ratings dashboard data and review history per Module 7
  static Future<Map<String, dynamic>> getProviderRatings(String providerProfileId) async {
    final url = Uri.parse('$baseUrl/providers/$providerProfileId/ratings');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data;
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to load provider ratings');
    }
  }

  /// Update before/after proof of work photos for a booking
  static Future<Map<String, dynamic>> updateBookingPhotos({
    required String bookingId,
    String? beforePhotoUrl,
    String? afterPhotoUrl,
  }) async {
    final url = Uri.parse('$baseUrl/bookings/$bookingId/photos');
    final response = await client.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $currentToken',
      },
      body: jsonEncode({
        if (beforePhotoUrl != null) 'before_photo_url': beforePhotoUrl,
        if (afterPhotoUrl != null) 'after_photo_url': afterPhotoUrl,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return data['booking'];
    } else {
      throw Exception(data['error']?['message'] ?? 'Failed to update photos');
    }
  }

  static void logout() {
    currentToken = null;
    currentUser = null;
  }
}


