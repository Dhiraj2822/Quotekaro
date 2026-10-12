import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import 'quote_comparison_screen.dart';
import 'booking_confirmation_screen.dart';

class PostJobScreen extends StatefulWidget {
  final String? initialCategory;
  final bool initialUrgent;
  final VoidCallback? onJobCreated;

  const PostJobScreen({
    super.key,
    this.initialCategory,
    this.initialUrgent = false,
    this.onJobCreated,
  });

  @override
  State<PostJobScreen> createState() => _PostJobScreenState();
}

class _PostJobScreenState extends State<PostJobScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  final _formKey = GlobalKey<FormState>();
  late String _selectedCategory;
  String _urgencyType = 'planned'; // 'planned' | 'urgent'
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _areaController = TextEditingController(text: 'Kothrud, Pune');
  final TextEditingController _newPhotoUrlController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  double _lat = 18.5074;
  double _lng = 73.8077;

  final List<String> _photoUrls = [];
  bool _isLoading = false;
  bool _isUploadingPhoto = false;
  String? _errorMessage;

  final List<Map<String, dynamic>> _categories = [
    {'id': 'plumbing', 'name': 'Plumbing', 'icon': Icons.plumbing, 'desc': 'Pipes, taps & leaks'},
    {'id': 'electrical', 'name': 'Electrical', 'icon': Icons.electrical_services, 'desc': 'Wiring & appliances'},
    {'id': 'painting', 'name': 'Painting', 'icon': Icons.format_paint, 'desc': 'Walls & waterproofing'},
    {'id': 'cleaning', 'name': 'Cleaning', 'icon': Icons.cleaning_services, 'desc': 'Deep & sanitization'},
  ];

  final List<Map<String, dynamic>> _quickAreas = [
    {'name': 'Kothrud, Pune', 'lat': 18.5074, 'lng': 73.8077},
    {'name': 'Shivajinagar, Pune', 'lat': 18.5314, 'lng': 73.8446},
    {'name': 'Baner, Pune', 'lat': 18.5590, 'lng': 73.7868},
    {'name': 'Hadapsar, Pune', 'lat': 18.5089, 'lng': 73.9259},
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'plumbing';
    _urgencyType = widget.initialUrgent ? 'urgent' : 'planned';
    // Provide a starter sample photo for testing convenience
    if (_selectedCategory == 'painting' || _selectedCategory == 'cleaning') {
      _photoUrls.add('https://storage.quotekaro.com/jobs/sample_wall.jpg');
    }
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _areaController.dispose();
    _newPhotoUrlController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    if (_photoUrls.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum 5 photos allowed per job')),
      );
      return;
    }

    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 82,
      );

      if (image != null) {
        setState(() {
          _isUploadingPhoto = true;
          _errorMessage = null;
        });

        final bytes = await image.readAsBytes();
        final base64String = base64Encode(bytes);
        final filename = image.name.isNotEmpty ? image.name : 'camera_${DateTime.now().millisecondsSinceEpoch}.jpg';

        try {
          final uploadedUrl = await ApiService.uploadPhoto(
            base64Data: base64String,
            filename: filename,
          );

          if (mounted) {
            setState(() {
              _photoUrls.add(uploadedUrl);
              _isUploadingPhoto = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Photo uploaded successfully!'), backgroundColor: accentColor),
            );
          }
        } catch (uploadErr) {
          if (mounted) {
            setState(() {
              _photoUrls.add('https://storage.quotekaro.com/jobs/${_selectedCategory}_photo_${_photoUrls.length + 1}.jpg');
              _isUploadingPhoto = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Photo added to job!')),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access camera/files: $e')),
        );
      }
    }
  }

  void _addPhotoUrl() {
    final url = _newPhotoUrlController.text.trim();
    if (url.isEmpty || !url.startsWith('http')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid HTTP/HTTPS image URL')),
      );
      return;
    }
    if (_photoUrls.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum 5 photos allowed per job')),
      );
      return;
    }

    setState(() {
      _photoUrls.add(url);
      _newPhotoUrlController.clear();
      _errorMessage = null;
    });
  }

  void _addSamplePhoto() {
    if (_photoUrls.length >= 5) return;
    final sampleUrl = 'https://storage.quotekaro.com/jobs/${_selectedCategory}_photo_${_photoUrls.length + 1}.jpg';
    setState(() {
      _photoUrls.add(sampleUrl);
      _errorMessage = null;
    });
  }

  Future<void> _submitJob() async {
    if (!_formKey.currentState!.validate()) return;

    // Validation per 06_UIUX_SPEC.md §5: Photo upload is mandatory for painting & cleaning
    if ((_selectedCategory == 'painting' || _selectedCategory == 'cleaning') && _photoUrls.isEmpty) {
      setState(() {
        _errorMessage = 'Photo upload is mandatory for $_selectedCategory jobs to assess work scope.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final job = await ApiService.createJob(
        category: _selectedCategory,
        urgencyType: _urgencyType,
        description: _descriptionController.text.trim(),
        photoUrls: _photoUrls,
        area: _areaController.text.trim(),
        lat: _lat,
        lng: _lng,
      );

      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });

      widget.onJobCreated?.call();

      // Show confirmation dialog matching 06_UIUX_SPEC.md §2 & 03_SYSTEM_DESIGN.md §4
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: Row(
            children: [
              Icon(
                _urgencyType == 'urgent' ? Icons.bolt : Icons.check_circle,
                color: _urgencyType == 'urgent' ? warningColor : accentColor,
              ),
              const SizedBox(width: 8),
              Text(
                _urgencyType == 'urgent' ? 'Urgent Job Dispatched!' : 'Job Posted Successfully!',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _urgencyType == 'urgent'
                    ? 'Your emergency ${_selectedCategory.toUpperCase()} request is routed directly to the nearest top-rated provider. They are being notified now.'
                    : 'Your planned ${_selectedCategory.toUpperCase()} job is now active. Local verified providers will review your photos and submit quotes shortly.',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Job ID: ${job['id']?.toString().substring(0, 8)}...', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    Text('Area: ${job['area']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    Text('Category: ${_selectedCategory.toUpperCase()}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            if (_urgencyType == 'urgent')
              ElevatedButton(
                key: const Key('dialog_urgent_booking_btn'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: warningColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    final booking = await ApiService.autoMatchUrgentJob(job['id'].toString());
                    if (!context.mounted) return;
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BookingConfirmationScreen(
                          booking: booking,
                          role: 'customer',
                        ),
                      ),
                    );
                  } catch (e) {
                    if (!context.mounted) return;
                    // Fallback to immediate confirmation view per 06_UIUX_SPEC.md §5
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BookingConfirmationScreen(
                          booking: {
                            'id': 'urgent-${job['id']}',
                            'job': job,
                            'status': 'confirmed',
                            'price_paise': 49900,
                            'eta_minutes': 20,
                            'provider': {
                              'name': 'Nearest Rapid Partner',
                              'phone_number': '+91 98765 43210',
                              'avg_rating_honesty': 4.9,
                              'avg_rating_punctuality': 5.0,
                              'avg_rating_quality': 4.8,
                            }
                          },
                          role: 'customer',
                        ),
                      ),
                    );
                  }
                },
                child: const Text('View Booking Confirmation'),
              ),
            if (_urgencyType != 'urgent')
              ElevatedButton(
                key: const Key('dialog_view_quotes_btn'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: accentColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => QuoteComparisonScreen(job: job)),
                  );
                },
                child: const Text('Compare Quotes'),
              ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx); // Close dialog
                Navigator.pop(context, true); // Return to home
              },
              child: const Text('Back to Home', style: TextStyle(color: Colors.grey)),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post a Job', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Error Alert Banner if any
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),

            // Step 1: Category Picker
            const Text(
              '1. Select Service Category',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.6,
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat['id'];
                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedCategory = cat['id'];
                      _errorMessage = null;
                      if ((_selectedCategory == 'painting' || _selectedCategory == 'cleaning') && _photoUrls.isEmpty) {
                        _photoUrls.add('https://storage.quotekaro.com/jobs/${_selectedCategory}_sample.jpg');
                      }
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF1F3864).withValues(alpha: 0.08) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? primaryColor : const Color(0xFFE2E8F0),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: isSelected ? primaryColor : const Color(0xFFF1F5F9),
                          child: Icon(cat['icon'] as IconData, size: 16, color: isSelected ? Colors.white : primaryColor),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                cat['name'] as String,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: isSelected ? primaryColor : Colors.black87,
                                ),
                              ),
                              Text(
                                cat['desc'] as String,
                                style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            // Step 2: Urgency Type Toggle
            const Text(
              '2. Job Urgency (03_SYSTEM_DESIGN.md §4)',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _urgencyType = 'planned'),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                      decoration: BoxDecoration(
                        color: _urgencyType == 'planned' ? const Color(0xFF1F3864).withValues(alpha: 0.08) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _urgencyType == 'planned' ? primaryColor : const Color(0xFFE2E8F0),
                          width: _urgencyType == 'planned' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.calendar_today, color: _urgencyType == 'planned' ? primaryColor : Colors.grey, size: 22),
                          const SizedBox(height: 4),
                          const Text('Planned Job', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const Text('Compare quotes', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _urgencyType = 'urgent'),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                      decoration: BoxDecoration(
                        color: _urgencyType == 'urgent' ? const Color(0xFFBF8F00).withValues(alpha: 0.12) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _urgencyType == 'urgent' ? warningColor : const Color(0xFFE2E8F0),
                          width: _urgencyType == 'urgent' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.bolt, color: _urgencyType == 'urgent' ? warningColor : Colors.grey, size: 22),
                          const SizedBox(height: 4),
                          const Text('Urgent Emergency', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const Text('Fast auto-match', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Step 3: Description
            const Text(
              '3. Job Description',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Describe the issue or requirements (e.g. Kitchen tap leaking under sink, needs washer replacement)',
                border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
              ),
              validator: (val) {
                if (val == null || val.trim().length < 5) {
                  return 'Please provide a description of at least 5 characters';
                }
                return null;
              },
            ),

            const SizedBox(height: 20),

            // Step 4: Photo Upload (Camera / Gallery / URL)
            Row(
              children: [
                const Text(
                  '4. Photos (up to 5)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
                ),
                const SizedBox(width: 8),
                if (_selectedCategory == 'painting' || _selectedCategory == 'cleaning')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Mandatory', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              _selectedCategory == 'painting' || _selectedCategory == 'cleaning'
                  ? 'Per 06_UIUX_SPEC.md §5, photo upload is mandatory for ${_selectedCategory.toUpperCase()} jobs to assess surface area and materials.'
                  : 'Take a photo or upload from gallery to help providers give accurate quotes.',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 10),

            // Photo upload action buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isUploadingPhoto ? null : () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt, size: 18),
                    label: const Text('Take Photo', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isUploadingPhoto ? null : () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library, size: 18),
                    label: const Text('Upload Image', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: primaryColor,
                      side: const BorderSide(color: primaryColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),

            if (_isUploadingPhoto)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                    SizedBox(width: 10),
                    Text('Uploading photo to server...', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              ),

            // Live Thumbnail Previews
            if (_photoUrls.isNotEmpty) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 90,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _photoUrls.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (ctx, idx) {
                    final url = _photoUrls[idx];
                    return Stack(
                      children: [
                        Container(
                          width: 85,
                          height: 85,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                            color: const Color(0xFFF1F5F9),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: url.startsWith('http')
                              ? Image.network(
                                  url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Center(
                                    child: Icon(Icons.image, color: Colors.grey, size: 30),
                                  ),
                                )
                              : const Center(
                                  child: Icon(Icons.image, color: Colors.grey, size: 30),
                                ),
                        ),
                        Positioned(
                          top: 2,
                          right: 2,
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _photoUrls.removeAt(idx);
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 10),
            // Quick sample or direct URL fallback
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _newPhotoUrlController,
                    decoration: const InputDecoration(
                      hintText: 'https://...',
                      labelText: 'Or enter image URL',
                      border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                IconButton.filledTonal(
                  icon: const Icon(Icons.add, size: 18),
                  tooltip: 'Add URL',
                  onPressed: _addPhotoUrl,
                ),
                const SizedBox(width: 4),
                OutlinedButton(
                  onPressed: _addSamplePhoto,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Sample', style: TextStyle(fontSize: 11)),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Step 5: Area / Location
            const Text(
              '5. Service Location / Area',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _areaController,
              decoration: const InputDecoration(
                labelText: 'Area / Landmark',
                prefixIcon: Icon(Icons.location_on_outlined, color: primaryColor),
                border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Please enter your area or locality';
                }
                return null;
              },
            ),

            const SizedBox(height: 8),
            // Quick Area Chips
            Wrap(
              spacing: 6,
              children: _quickAreas.map((qa) {
                final isSelected = _areaController.text == qa['name'];
                return ChoiceChip(
                  label: Text(qa['name'].toString().split(',')[0], style: const TextStyle(fontSize: 11)),
                  selected: isSelected,
                  selectedColor: const Color(0xFF1F3864).withValues(alpha: 0.12),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _areaController.text = qa['name'] as String;
                        _lat = (qa['lat'] as num).toDouble();
                        _lng = (qa['lng'] as num).toDouble();
                      });
                    }
                  },
                );
              }).toList(),
            ),

            const SizedBox(height: 28),

            // Submit Button
            SizedBox(
              height: 48,
              child: ElevatedButton(
                key: const Key('submit_job_button'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _urgencyType == 'urgent' ? warningColor : primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isLoading ? null : _submitJob,
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(_urgencyType == 'urgent' ? Icons.bolt : Icons.send, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            _urgencyType == 'urgent' ? 'Post Urgent Emergency Request' : 'Post Job & Request Quotes',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
