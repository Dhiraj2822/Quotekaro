import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Screen 7: Job Completion & Rating per 06_UIUX_SPEC.md §2.7
/// Features Before/After photo comparison, 3-axis rating sliders
/// (Honesty, Punctuality, Quality), and optional text review.
class RatingScreen extends StatefulWidget {
  final Map<String, dynamic> booking;

  const RatingScreen({super.key, required this.booking});

  @override
  State<RatingScreen> createState() => _RatingScreenState();
}

class _RatingScreenState extends State<RatingScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color amberColor = Color(0xFFBF8F00);

  double _ratingHonesty = 5.0;
  double _ratingPunctuality = 5.0;
  double _ratingQuality = 5.0;

  final TextEditingController _reviewController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;
  bool _isSubmitted = false;
  Map<String, dynamic>? _submissionResult;

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  String _getScoreLabel(double score) {
    if (score >= 5.0) return 'Exceptional (5/5)';
    if (score >= 4.0) return 'Very Good (4/5)';
    if (score >= 3.0) return 'Average (3/5)';
    if (score >= 2.0) return 'Below Average (2/5)';
    return 'Poor (1/5)';
  }

  Future<void> _submitRating() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final bookingId = widget.booking['id']?.toString() ?? '';
      final result = await ApiService.submitRating(
        bookingId: bookingId,
        ratingHonesty: _ratingHonesty.round(),
        ratingPunctuality: _ratingPunctuality.round(),
        ratingQuality: _ratingQuality.round(),
        reviewText: _reviewController.text.trim().isNotEmpty ? _reviewController.text.trim() : null,
      );

      if (!mounted) return;
      setState(() {
        _isSubmitted = true;
        _submissionResult = result;
        _isSubmitting = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = err.toString().replaceAll('Exception: ', '');
        _isSubmitting = false;
      });
    }
  }

  Widget _buildPhotoThumbnail(String label, String? photoUrl, IconData placeholderIcon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  label == 'Before' ? Icons.history : Icons.check_circle,
                  size: 14,
                  color: label == 'Before' ? Colors.grey[700] : accentColor,
                ),
                const SizedBox(width: 4),
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: label == 'Before' ? Colors.grey[700] : accentColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Container(
                height: 110,
                width: double.infinity,
                color: Colors.grey[100],
                child: photoUrl != null && photoUrl.isNotEmpty
                    ? Image.network(
                        photoUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildFallbackImage(placeholderIcon, label),
                      )
                    : _buildFallbackImage(placeholderIcon, label),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackImage(IconData icon, String label) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 36, color: Colors.grey[400]),
          const SizedBox(height: 4),
          Text(
            '$label Photo',
            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildAxisRatingSlider({
    required String title,
    required String subtitle,
    required double value,
    required ValueChanged<double> onChanged,
    required Key sliderKey,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: primaryColor,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _getScoreLabel(value),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
          ),
          const SizedBox(height: 6),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: primaryColor,
              inactiveTrackColor: Colors.grey[200],
              thumbColor: primaryColor,
              overlayColor: primaryColor.withValues(alpha: 0.12),
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
              trackHeight: 6,
            ),
            child: Slider(
              key: sliderKey,
              value: value,
              min: 1.0,
              max: 5.0,
              divisions: 4,
              label: '${value.round()} Stars',
              onChanged: onChanged,
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(5, (index) {
              final star = index + 1;
              final isSelected = star <= value.round();
              return InkWell(
                onTap: () => onChanged(star.toDouble()),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: Row(
                    children: [
                      Icon(
                        isSelected ? Icons.star : Icons.star_border,
                        size: 18,
                        color: isSelected ? amberColor : Colors.grey[400],
                      ),
                      Text(
                        ' $star',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? primaryColor : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = widget.booking['provider'] ?? {};
    final providerName = provider['name'] ?? 'Assigned Professional';
    final job = widget.booking['job'] ?? {};
    final category = (job['category'] ?? 'Home Service').toString().toUpperCase();

    final beforePhotoUrl = widget.booking['before_photo_url'] ??
        (job['photo_urls'] is List && (job['photo_urls'] as List).isNotEmpty ? job['photo_urls'][0] : null);
    final afterPhotoUrl = widget.booking['after_photo_url'];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Rate Your Service',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isSubmitted ? _buildSuccessView() : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Card with Provider Info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: primaryColor.withValues(alpha: 0.1),
                  child: const Icon(Icons.person, color: primaryColor, size: 28),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        providerName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: primaryColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: accentColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              category,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: accentColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.verified, size: 14, color: accentColor),
                          const SizedBox(width: 2),
                          const Text(
                            'Completed Service',
                            style: TextStyle(fontSize: 11, color: accentColor, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Proof of Work: Before / After Photos
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'PROOF OF WORK',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: primaryColor,
                ),
              ),
              Row(
                children: [
                  Icon(Icons.camera_alt, size: 14, color: accentColor),
                  SizedBox(width: 4),
                  Text(
                    'Before & After Inspection',
                    style: TextStyle(fontSize: 11, color: accentColor, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildPhotoThumbnail('Before', beforePhotoUrl, Icons.build_circle_outlined),
              const SizedBox(width: 12),
              _buildPhotoThumbnail('After', afterPhotoUrl, Icons.task_alt),
            ],
          ),
          const SizedBox(height: 20),

          // 3-Axis Multi-Dimensional Rating Section
          const Text(
            'MULTI-AXIS RATING',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
              color: primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Rate each dimension independently to reward reliable craftsmanship.',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 12),

          // Axis 1: Honesty
          _buildAxisRatingSlider(
            title: '1. Honesty & Fair Pricing',
            subtitle: 'Clear scoping, no inflated costs or unexpected add-ons',
            value: _ratingHonesty,
            sliderKey: const Key('slider_honesty'),
            onChanged: (val) => setState(() => _ratingHonesty = val),
          ),

          // Axis 2: Punctuality
          _buildAxisRatingSlider(
            title: '2. Punctuality & Arrival Time',
            subtitle: 'Adherence to ETA and arrival at scheduled window',
            value: _ratingPunctuality,
            sliderKey: const Key('slider_punctuality'),
            onChanged: (val) => setState(() => _ratingPunctuality = val),
          ),

          // Axis 3: Quality
          _buildAxisRatingSlider(
            title: '3. Quality of Workmanship',
            subtitle: 'Proper tools, neat finish, durable leak-free repair',
            value: _ratingQuality,
            sliderKey: const Key('slider_quality'),
            onChanged: (val) => setState(() => _ratingQuality = val),
          ),

          // Written Review Field
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Write a Review (Optional)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('review_text_field'),
                  controller: _reviewController,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: InputDecoration(
                    hintText: 'Share helpful details about your experience...',
                    hintStyle: TextStyle(fontSize: 13, color: Colors.grey[400]),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: primaryColor, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Error Message Display
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red[200]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Submit Rating Button
          SizedBox(
            height: 50,
            child: ElevatedButton(
              key: const Key('submit_rating_button'),
              onPressed: _isSubmitting ? null : _submitRating,
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                elevation: 0,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      'Submit 3-Axis Rating',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    final averages = _submissionResult?['provider_averages'] ?? {};
    final avgHonesty = averages['avg_rating_honesty']?.toString() ?? '5.0';
    final avgPunctuality = averages['avg_rating_punctuality']?.toString() ?? '5.0';
    final avgQuality = averages['avg_rating_quality']?.toString() ?? '5.0';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.stars, color: accentColor, size: 48),
            ),
            const SizedBox(height: 20),
            const Text(
              'Thank You for Rating!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: primaryColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your multi-axis ratings have been recorded and the provider\'s blended score has been updated in real-time.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey[700]),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: [
                  const Text(
                    'UPDATED PROVIDER AVERAGES',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryColor, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetricSummary('Honesty', '$avgHonesty ★'),
                      _buildMetricSummary('Punctuality', '$avgPunctuality ★'),
                      _buildMetricSummary('Quality', '$avgQuality ★'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                key: const Key('rating_done_button'),
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Back to My Bookings', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricSummary(String title, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: accentColor),
        ),
        const SizedBox(height: 2),
        Text(
          title,
          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
        ),
      ],
    );
  }
}
