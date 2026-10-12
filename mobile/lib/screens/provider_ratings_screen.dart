import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Screen 7: Provider Ratings Dashboard per 06_UIUX_SPEC.md §3.7
/// Displays provider's own honesty/punctuality/quality scores over time
/// and chronological customer reviews.
class ProviderRatingsScreen extends StatefulWidget {
  final String providerProfileId;

  const ProviderRatingsScreen({super.key, required this.providerProfileId});

  @override
  State<ProviderRatingsScreen> createState() => _ProviderRatingsScreenState();
}

class _ProviderRatingsScreenState extends State<ProviderRatingsScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color amberColor = Color(0xFFBF8F00);

  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _ratingsData;

  @override
  void initState() {
    super.initState();
    _fetchRatings();
  }

  Future<void> _fetchRatings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await ApiService.getProviderRatings(widget.providerProfileId);
      if (!mounted) return;
      setState(() {
        _ratingsData = data;
        _isLoading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = err.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Widget _buildAxisProgressBar(String title, double score, Color color) {
    final normalized = (score / 5.0).clamp(0.0, 1.0);
    final percentage = (normalized * 100).round();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: primaryColor),
              ),
              Text(
                '${score.toStringAsFixed(1)} ★ ($percentage%)',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: normalized,
              minHeight: 8,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Ratings & Performance',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRatings,
            tooltip: 'Refresh Ratings',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchRatings,
                          style: ElevatedButton.styleFrom(backgroundColor: primaryColor, foregroundColor: Colors.white),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final averages = _ratingsData?['averages'] ?? {};
    final double honesty = (averages['avg_rating_honesty'] ?? 5.0).toDouble();
    final double punctuality = (averages['avg_rating_punctuality'] ?? 5.0).toDouble();
    final double quality = (averages['avg_rating_quality'] ?? 5.0).toDouble();

    final double blendedOverall = ((honesty + punctuality + quality) / 3.0);
    final List<dynamic> reviews = _ratingsData?['reviews'] ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Hero Score Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1F3864), Color(0xFF2C4D8A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: primaryColor.withValues(alpha: 0.25),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'OVERALL BLENDED RATING',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.white70,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            blendedOverall.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            '/ 5.0',
                            style: TextStyle(fontSize: 16, color: Colors.white70),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.star, color: Color(0xFFFFD700), size: 36),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your blended rating directly boosts quote placement over low-price bidders.',
                        style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.9)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 3-Axis Multi-Dimensional Breakdown Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.tune, size: 16, color: primaryColor),
                  SizedBox(width: 6),
                  Text(
                    '3-AXIS SCORE BREAKDOWN',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: primaryColor,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildAxisProgressBar('Honesty & Transparent Pricing', honesty, accentColor),
              _buildAxisProgressBar('Punctuality & ETA Adherence', punctuality, primaryColor),
              _buildAxisProgressBar('Workmanship Quality & Cleanliness', quality, amberColor),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Customer Reviews Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'CUSTOMER REVIEWS (${reviews.length})',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: primaryColor,
              ),
            ),
            if (reviews.isNotEmpty)
              const Text(
                'Latest first',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
          ],
        ),
        const SizedBox(height: 8),

        if (reviews.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.rate_review_outlined, size: 40, color: Colors.grey[400]),
                  const SizedBox(height: 8),
                  Text(
                    'No reviews yet',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey[700]),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Complete more bookings with verified proof-of-work to earn customer ratings.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
          )
        else
          ...reviews.map((r) => _buildReviewCard(r)),

        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
    final customerName = review['customer_name'] ?? 'Verified Customer';
    final jobCategory = (review['job_category'] ?? 'Service').toString().toUpperCase();
    final reviewText = review['review_text'];
    final honesty = review['rating_honesty'] ?? 5;
    final punctuality = review['rating_punctuality'] ?? 5;
    final quality = review['rating_quality'] ?? 5;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: primaryColor.withValues(alpha: 0.1),
                      child: Text(
                        customerName.isNotEmpty ? customerName[0] : 'C',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      customerName,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: primaryColor),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    jobCategory,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[700]),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Mini 3-Axis Badges
            Wrap(
              spacing: 8,
              children: [
                _buildMiniBadge('Honesty', '$honesty ★', accentColor),
                _buildMiniBadge('Punctuality', '$punctuality ★', primaryColor),
                _buildMiniBadge('Quality', '$quality ★', amberColor),
              ],
            ),

            if (reviewText != null && reviewText.toString().trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '"$reviewText"',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey[800]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMiniBadge(String label, String val, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '$label: $val',
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}
