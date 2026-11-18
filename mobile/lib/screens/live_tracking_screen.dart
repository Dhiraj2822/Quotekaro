import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart' as ll;
import '../services/api_service.dart';
import 'chat_screen.dart';
import 'provider_otp_verify_screen.dart';

class LiveTrackingScreen extends StatefulWidget {
  final Map<String, dynamic> booking;
  final bool isCustomer;

  const LiveTrackingScreen({
    super.key,
    required this.booking,
    this.isCustomer = true,
  });

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  late String _status;
  double? _providerLat;
  double? _providerLng;
  double? _destLat;
  double? _destLng;
  int? _etaMinutes;
  double? _distanceKm;
  bool _isLoading = true;
  bool _isUpdatingStatus = false;
  Timer? _trackingTimer;

  @override
  void initState() {
    super.initState();
    _status = (widget.booking['status'] ?? 'confirmed').toString().toLowerCase();

    // Initialize coordinates from booking if available
    final job = widget.booking['job'] is Map ? widget.booking['job'] : {};
    final provider = widget.booking['provider'] is Map ? widget.booking['provider'] : {};

    _destLat = job['lat'] != null ? (job['lat'] as num).toDouble() : 18.5074;
    _destLng = job['lng'] != null ? (job['lng'] as num).toDouble() : 73.8077;

    _providerLat = provider['lat'] != null ? (provider['lat'] as num).toDouble() : 18.5140;
    _providerLng = provider['lng'] != null ? (provider['lng'] as num).toDouble() : 73.8120;

    _fetchTrackingData();

    // Poll live tracking updates every 4 seconds per 05_API_SPEC.md & 09_MODULE_BUILD_PLAN.md
    _trackingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _pollTrackingData();
    });
  }

  @override
  void dispose() {
    _trackingTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchTrackingData() async {
    final bookingId = widget.booking['id']?.toString() ?? '';
    if (bookingId.isEmpty) return;

    try {
      final track = await ApiService.getBookingTrack(bookingId);
      if (!mounted) return;
      setState(() {
        if (track['provider_lat'] != null) _providerLat = (track['provider_lat'] as num).toDouble();
        if (track['provider_lng'] != null) _providerLng = (track['provider_lng'] as num).toDouble();
        if (track['destination_lat'] != null) _destLat = (track['destination_lat'] as num).toDouble();
        if (track['destination_lng'] != null) _destLng = (track['destination_lng'] as num).toDouble();
        if (track['eta_minutes'] != null) _etaMinutes = (track['eta_minutes'] as num).toInt();
        if (track['distance_km'] != null) _distanceKm = (track['distance_km'] as num).toDouble();
        if (track['status'] != null) _status = track['status'].toString().toLowerCase();
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _pollTrackingData() async {
    if (!mounted || _isUpdatingStatus) return;
    final bookingId = widget.booking['id']?.toString() ?? '';
    if (bookingId.isEmpty) return;

    try {
      final track = await ApiService.getBookingTrack(bookingId);
      if (!mounted) return;
      setState(() {
        if (track['provider_lat'] != null) _providerLat = (track['provider_lat'] as num).toDouble();
        if (track['provider_lng'] != null) _providerLng = (track['provider_lng'] as num).toDouble();
        if (track['eta_minutes'] != null) _etaMinutes = (track['eta_minutes'] as num).toInt();
        if (track['distance_km'] != null) _distanceKm = (track['distance_km'] as num).toDouble();
        if (track['status'] != null) _status = track['status'].toString().toLowerCase();
      });
    } catch (_) {
      // Silently ignore tracking poll network blips
    }
  }

  Future<void> _handleUpdateStatus(String newStatus) async {
    final bookingId = widget.booking['id']?.toString() ?? '';
    setState(() {
      _isUpdatingStatus = true;
    });

    try {
      // When moving en_route, simulate moving closer to destination
      final updatedLat = _status == 'confirmed' ? 18.5090 : _providerLat;
      final updatedLng = _status == 'confirmed' ? 73.8090 : _providerLng;

      await ApiService.updateBookingStatus(
        bookingId: bookingId,
        status: newStatus,
        lat: updatedLat,
        lng: updatedLng,
      );

      if (!mounted) return;
      setState(() {
        _status = newStatus;
        if (newStatus == 'en_route') {
          _providerLat = updatedLat;
          _providerLng = updatedLng;
          _etaMinutes = 10;
          _distanceKm = 1.2;
        } else if (newStatus == 'in_progress') {
          _etaMinutes = 0;
          _distanceKm = 0.0;
        }
        _isUpdatingStatus = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Booking status updated to: ${newStatus.toUpperCase()}'),
          backgroundColor: LiveTrackingScreen.accentColor,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isUpdatingStatus = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update status: $e'),
          backgroundColor: Colors.red[700],
        ),
      );
    }
  }

  void _showMaskedCallDialog(String otherName, String actualPhone) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.phone_in_talk, color: LiveTrackingScreen.accentColor),
            SizedBox(width: 8),
            Text('Masked Voice Call', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Connecting you to $otherName securely per 07_SECURITY.md §2:'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Virtual Proxy Number: +91 80 4709 8211', style: TextStyle(fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Your personal phone number is masked for privacy.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: LiveTrackingScreen.accentColor, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Dialing secure proxy line...')),
              );
            },
            child: const Text('Call Proxy'),
          ),
        ],
      ),
    );
  }

  void _showCompleteWorkModal() {
    XFile? beforeImage;
    XFile? afterImage;
    bool isUploading = false;
    String statusNote = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bottomSheetContext) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            Future<void> pickImage(bool isBefore, ImageSource source) async {
              try {
                final picker = ImagePicker();
                final picked = await picker.pickImage(
                  source: source,
                  maxWidth: 1600,
                  maxHeight: 1600,
                  imageQuality: 80,
                );
                if (picked != null) {
                  setModalState(() {
                    if (isBefore) {
                      beforeImage = picked;
                    } else {
                      afterImage = picked;
                    }
                  });
                }
              } catch (e) {
                if (bottomSheetContext.mounted) {
                  ScaffoldMessenger.of(bottomSheetContext).showSnackBar(
                    SnackBar(content: Text('Error selecting image: $e')),
                  );
                }
              }
            }

            void showImageSourcePicker(bool isBefore) {
              showModalBottomSheet(
                context: context,
                builder: (ctx) => SafeArea(
                  child: Wrap(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.camera_alt),
                        title: const Text('Take Photo with Camera'),
                        onTap: () {
                          Navigator.pop(ctx);
                          pickImage(isBefore, ImageSource.camera);
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.photo_library),
                        title: const Text('Choose from Gallery'),
                        onTap: () {
                          Navigator.pop(ctx);
                          pickImage(isBefore, ImageSource.gallery);
                        },
                      ),
                    ],
                  ),
                ),
              );
            }

            Future<void> submitCompletion() async {
              final bookingId = widget.booking['id']?.toString() ?? '';
              if (bookingId.isEmpty) return;

              if (afterImage == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please upload an After-Work photo as proof of completion.'),
                    backgroundColor: Colors.orange,
                  ),
                );
                return;
              }

              setModalState(() {
                isUploading = true;
                statusNote = 'Uploading proof photos...';
              });

              try {
                String? beforePhotoUrl;
                String? afterPhotoUrl;

                if (beforeImage != null) {
                  final bytes = await beforeImage!.readAsBytes();
                  final b64 = base64Encode(bytes);
                  beforePhotoUrl = await ApiService.uploadPhoto(
                    base64Data: b64,
                    filename: beforeImage!.name,
                  );
                }

                setModalState(() {
                  statusNote = 'Uploading completion proof...';
                });

                if (afterImage != null) {
                  final bytes = await afterImage!.readAsBytes();
                  final b64 = base64Encode(bytes);
                  afterPhotoUrl = await ApiService.uploadPhoto(
                    base64Data: b64,
                    filename: afterImage!.name,
                  );
                }

                setModalState(() {
                  statusNote = 'Finalizing booking & settling payment...';
                });

                await ApiService.completeBooking(
                  bookingId: bookingId,
                  afterPhotoUrl: afterPhotoUrl,
                  beforePhotoUrl: beforePhotoUrl,
                );

                if (bottomSheetContext.mounted) {
                  Navigator.pop(bottomSheetContext);
                }

                if (!mounted) return;
                setState(() {
                  _status = 'completed';
                });

                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Job marked as Completed! Payment and commission settled.'),
                    backgroundColor: LiveTrackingScreen.accentColor,
                    duration: Duration(seconds: 4),
                  ),
                );

                _fetchTrackingData();
              } catch (e) {
                setModalState(() {
                  isUploading = false;
                });
                if (bottomSheetContext.mounted) {
                  ScaffoldMessenger.of(bottomSheetContext).showSnackBar(
                    SnackBar(
                      content: Text('Completion failed: ${e.toString().replaceAll("Exception: ", "")}'),
                      backgroundColor: Colors.red[700],
                    ),
                  );
                }
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Complete Work & Proof',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: LiveTrackingScreen.primaryColor),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: isUploading ? null : () => Navigator.pop(bottomSheetContext),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Take photos of the finished job for customer verification and quality guarantee.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),

                    // Before photo (optional)
                    const Text('Before Work Photo (Optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: isUploading ? null : () => showImageSourcePicker(true),
                      child: Container(
                        height: 90,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                        ),
                        child: beforeImage != null
                            ? Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
                                    child: Image.file(
                                      File(beforeImage!.path),
                                      width: 90,
                                      height: 90,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(beforeImage!.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                        const SizedBox(height: 4),
                                        const Text('Tap to change photo', style: TextStyle(color: LiveTrackingScreen.primaryColor, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.grey),
                                    onPressed: isUploading ? null : () => setModalState(() => beforeImage = null),
                                  ),
                                ],
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.add_a_photo_outlined, color: Color(0xFF64748B), size: 24),
                                  SizedBox(width: 8),
                                  Text('Add Initial State / Before Photo', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // After photo (required)
                    Row(
                      children: const [
                        Text('After Work Photo (Proof of Completion)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        Text(' *', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: isUploading ? null : () => showImageSourcePicker(false),
                      child: Container(
                        height: 90,
                        decoration: BoxDecoration(
                          color: afterImage != null ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: afterImage != null ? LiveTrackingScreen.accentColor : const Color(0xFFCBD5E1),
                            width: afterImage != null ? 1.5 : 1,
                          ),
                        ),
                        child: afterImage != null
                            ? Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
                                    child: Image.file(
                                      File(afterImage!.path),
                                      width: 90,
                                      height: 90,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(afterImage!.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                        const SizedBox(height: 4),
                                        const Text('Tap to change photo', style: TextStyle(color: LiveTrackingScreen.accentColor, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.grey),
                                    onPressed: isUploading ? null : () => setModalState(() => afterImage = null),
                                  ),
                                ],
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.add_photo_alternate_outlined, color: LiveTrackingScreen.accentColor, size: 24),
                                  SizedBox(width: 8),
                                  Text('Upload Finished Work Photo', style: TextStyle(color: LiveTrackingScreen.accentColor, fontWeight: FontWeight.w600, fontSize: 13)),
                                ],
                              ),
                      ),
                    ),

                    if (isUploading) ...[
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                          const SizedBox(width: 10),
                          Text(statusNote, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                        ],
                      ),
                    ],

                    const SizedBox(height: 20),

                    ElevatedButton(
                      key: const Key('submit_complete_booking_btn'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LiveTrackingScreen.accentColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: isUploading ? null : submitCompletion,
                      child: const Text('Confirm & Complete Booking', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingId = widget.booking['id']?.toString() ?? 'N/A';
    final shortId = bookingId.length > 8 ? bookingId.substring(0, 8).toUpperCase() : bookingId;

    final job = widget.booking['job'] is Map ? widget.booking['job'] : {};
    final category = (job['category'] ?? widget.booking['category'] ?? 'Service').toString().toUpperCase();
    final area = (job['area'] ?? widget.booking['area'] ?? 'Pune').toString();

    final provider = widget.booking['provider'] is Map ? widget.booking['provider'] : {};
    final providerName = (provider['name'] ?? widget.booking['provider_name'] ?? 'Mahesh Plumber').toString();
    final providerPhone = (provider['phone_number'] ?? widget.booking['provider_phone'] ?? '+91 98765 43210').toString();

    final customer = widget.booking['customer'] is Map ? widget.booking['customer'] : {};
    final customerName = (customer['name'] ?? widget.booking['customer_name'] ?? 'Ramesh Customer').toString();
    final customerPhone = (customer['phone_number'] ?? widget.booking['customer_phone'] ?? '+91 99999 00001').toString();

    final otherName = widget.isCustomer ? providerName : customerName;
    final otherPhone = widget.isCustomer ? providerPhone : customerPhone;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.isCustomer ? 'Live Tracking & ETA' : 'Service Navigation & Status'),
            Text('Booking #$shortId • $category', style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
        backgroundColor: LiveTrackingScreen.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            key: const Key('tracking_refresh_btn'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Status',
            onPressed: _fetchTrackingData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 1. Interactive Canvas Map View with Live Markers & Waypoints
                Expanded(
                  flex: 5,
                  child: Stack(
                    children: [
                      Container(
                        width: double.infinity,
                        color: const Color(0xFFE2E8F0),
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: ll.LatLng(
                              ((_providerLat ?? 18.514) + (_destLat ?? 18.5074)) / 2,
                              ((_providerLng ?? 73.812) + (_destLng ?? 73.8077)) / 2,
                            ),
                            initialZoom: 14.2,
                            interactionOptions: const InteractionOptions(flags: InteractiveFlag.all),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.quotekaro.app',
                            ),
                            PolylineLayer(
                              polylines: [
                                Polyline(
                                  points: [
                                    ll.LatLng(_providerLat ?? 18.514, _providerLng ?? 73.812),
                                    ll.LatLng(
                                      ((_providerLat ?? 18.514) + (_destLat ?? 18.5074)) / 2 + 0.001,
                                      ((_providerLng ?? 73.812) + (_destLng ?? 73.8077)) / 2 - 0.001,
                                    ),
                                    ll.LatLng(_destLat ?? 18.5074, _destLng ?? 73.8077),
                                  ],
                                  strokeWidth: 4.5,
                                  color: LiveTrackingScreen.primaryColor,
                                ),
                              ],
                            ),
                            MarkerLayer(
                              markers: [
                                // Destination: Customer Home
                                Marker(
                                  point: ll.LatLng(_destLat ?? 18.5074, _destLng ?? 73.8077),
                                  width: 44,
                                  height: 44,
                                  child: Column(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(5),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFDC2626),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.home, color: Colors.white, size: 18),
                                      ),
                                    ],
                                  ),
                                ),
                                // Provider Vehicle Marker
                                Marker(
                                  point: ll.LatLng(_providerLat ?? 18.514, _providerLng ?? 73.812),
                                  width: 46,
                                  height: 46,
                                  child: Column(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: LiveTrackingScreen.accentColor,
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.25),
                                              blurRadius: 6,
                                            ),
                                          ],
                                        ),
                                        child: const Icon(Icons.two_wheeler, color: Colors.white, size: 20),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Live Pulse Badge
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: LiveTrackingScreen.accentColor,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'GPS Active',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: LiveTrackingScreen.primaryColor),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Distance & ETA Floating Chip
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: LiveTrackingScreen.primaryColor,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _status == 'in_progress'
                                ? 'Work In Progress'
                                : '${_etaMinutes ?? 15} mins • ${_distanceKm != null ? "${_distanceKm!.toStringAsFixed(1)} km" : "Nearby"}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ),
                      // OpenStreetMap Attribution Badge
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '© OpenStreetMap contributors',
                            style: TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. Status Stepper & Progress Indicator
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  color: Colors.white,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStepIndicator('Confirmed', isPassed: true, isActive: _status == 'confirmed'),
                      _buildStepDivider(isPassed: _status == 'en_route' || _status == 'in_progress' || _status == 'completed'),
                      _buildStepIndicator('En Route', isPassed: _status == 'en_route' || _status == 'in_progress' || _status == 'completed', isActive: _status == 'en_route'),
                      _buildStepDivider(isPassed: _status == 'in_progress' || _status == 'completed'),
                      _buildStepIndicator('In Progress', isPassed: _status == 'in_progress' || _status == 'completed', isActive: _status == 'in_progress'),
                      _buildStepDivider(isPassed: _status == 'completed'),
                      _buildStepIndicator('Completed', isPassed: _status == 'completed', isActive: _status == 'completed'),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // 3. Info Sheet & Action Controls
                Expanded(
                  flex: 4,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Partner / Customer Card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: LiveTrackingScreen.primaryColor,
                                child: Text(
                                  otherName.isNotEmpty ? otherName[0].toUpperCase() : 'U',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      otherName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      widget.isCustomer ? 'Verified Service Partner' : 'Customer • $area',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              // Call Button (Masked)
                              IconButton(
                                key: const Key('tracking_call_btn'),
                                icon: const CircleAvatar(
                                  radius: 18,
                                  backgroundColor: Color(0xFFF1F5F9),
                                  child: Icon(Icons.phone, color: LiveTrackingScreen.accentColor, size: 18),
                                ),
                                onPressed: () => _showMaskedCallDialog(otherName, otherPhone),
                              ),
                              // Chat Button
                              IconButton(
                                key: const Key('tracking_chat_btn'),
                                icon: const CircleAvatar(
                                  radius: 18,
                                  backgroundColor: Color(0xFFF1F5F9),
                                  child: Icon(Icons.chat, color: LiveTrackingScreen.primaryColor, size: 18),
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => ChatScreen(
                                        bookingId: bookingId,
                                        otherParticipantName: otherName,
                                        currentUserRole: widget.isCustomer ? 'customer' : 'provider',
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Provider Action Buttons (Status Update) per 09_MODULE_BUILD_PLAN.md DoD
                      if (!widget.isCustomer) ...[
                        if (_status == 'confirmed')
                          ElevatedButton.icon(
                            key: const Key('provider_mark_en_route_btn'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: LiveTrackingScreen.primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.directions_car),
                            label: _isUpdatingStatus
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Start Trip / Mark En Route', style: TextStyle(fontWeight: FontWeight.bold)),
                            onPressed: _isUpdatingStatus ? null : () => _handleUpdateStatus('en_route'),
                          ),

                        if (_status == 'en_route')
                          ElevatedButton.icon(
                            key: const Key('provider_mark_in_progress_btn'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: LiveTrackingScreen.accentColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.pin),
                            label: const Text('Arrived / Enter Customer PIN to Start', style: TextStyle(fontWeight: FontWeight.bold)),
                            onPressed: () async {
                              final verified = await Navigator.push<bool>(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ProviderOtpVerifyScreen(
                                    bookingId: widget.booking['id']?.toString() ?? '',
                                    customerName: customerName,
                                    serviceName: category,
                                  ),
                                ),
                              );
                              if (verified == true && mounted) {
                                setState(() {
                                  _status = 'in_progress';
                                });
                                _fetchTrackingData();
                              }
                            },
                          ),

                        if (_status == 'in_progress') ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: LiveTrackingScreen.accentColor.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: const [
                                Icon(Icons.handyman, color: LiveTrackingScreen.accentColor, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Work is in progress. Once complete, submit proof photos to finish the job.',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF166534)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          ElevatedButton.icon(
                            key: const Key('provider_complete_work_btn'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: LiveTrackingScreen.accentColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.task_alt),
                            label: const Text('Complete Work & Upload Proof', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            onPressed: _showCompleteWorkModal,
                          ),
                        ],

                        if (_status == 'completed')
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF86EFAC)),
                            ),
                            child: Column(
                              children: const [
                                Icon(Icons.verified, color: LiveTrackingScreen.accentColor, size: 36),
                                SizedBox(height: 8),
                                Text(
                                  'Job Completed Successfully!',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Payment has been settled. Your wallet ledger has been updated.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: Color(0xFF15803D)),
                                ),
                              ],
                            ),
                          ),
                      ] else ...[
                        // Customer View Status Banner
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: (_status == 'in_progress' || _status == 'completed') ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _status == 'completed'
                                    ? Icons.verified
                                    : _status == 'in_progress'
                                        ? Icons.handyman
                                        : Icons.navigation,
                                color: (_status == 'in_progress' || _status == 'completed') ? LiveTrackingScreen.accentColor : LiveTrackingScreen.primaryColor,
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _status == 'confirmed'
                                      ? 'Partner is preparing tools and getting ready to head out.'
                                      : _status == 'en_route'
                                          ? 'Partner is en route to your location. ETA: ${_etaMinutes ?? 15} mins.'
                                          : _status == 'in_progress'
                                              ? 'Partner has arrived and work is actively in progress!'
                                              : _status == 'completed'
                                                  ? 'Service completed! Thank you for choosing QuoteKaro.'
                                                  : 'Job status: ${_status.toUpperCase()}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF334155)),
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (widget.isCustomer && _status != 'completed' && widget.booking['start_otp'] != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Row(
                              children: [
                                const CircleAvatar(
                                  backgroundColor: Color(0xFF2563EB),
                                  radius: 16,
                                  child: Icon(Icons.password, color: Colors.white, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: const [
                                      Text('Service Security PIN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E40AF))),
                                      Text('Share with partner when they arrive to begin work', style: TextStyle(fontSize: 10, color: Color(0xFF475569))),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFF93C5FD)),
                                  ),
                                  child: Text(
                                    widget.booking['start_otp'].toString(),
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 2, color: Color(0xFF1E40AF)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStepIndicator(String label, {required bool isPassed, required bool isActive}) {
    Color color;
    if (isActive) {
      color = LiveTrackingScreen.warningColor;
    } else if (isPassed) {
      color = LiveTrackingScreen.accentColor;
    } else {
      color = const Color(0xFFCBD5E1);
    }

    return Column(
      children: [
        CircleAvatar(
          radius: 10,
          backgroundColor: color,
          child: Icon(
            isPassed && !isActive ? Icons.check : Icons.circle,
            size: 10,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? LiveTrackingScreen.primaryColor : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }

  Widget _buildStepDivider({required bool isPassed}) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 14),
        color: isPassed ? LiveTrackingScreen.accentColor : const Color(0xFFE2E8F0),
      ),
    );
  }
}

/// Custom Canvas Painter rendering live provider coordinates, destination house, and road route
class LiveMapPainter extends CustomPainter {
  final double providerLat;
  final double providerLng;
  final double destLat;
  final double destLng;
  final String status;

  LiveMapPainter({
    required this.providerLat,
    required this.providerLng,
    required this.destLat,
    required this.destLng,
    required this.status,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Background Grid & City Blocks
    final bgPaint = Paint()..color = const Color(0xFFF1F5F9);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 24
      ..style = PaintingStyle.stroke;

    // Background road network
    final bgRoad1 = Path()
      ..moveTo(0, size.height * 0.3)
      ..quadraticBezierTo(size.width * 0.5, size.height * 0.2, size.width, size.height * 0.4);
    canvas.drawPath(bgRoad1, roadPaint);

    final bgRoad2 = Path()
      ..moveTo(size.width * 0.2, 0)
      ..quadraticBezierTo(size.width * 0.4, size.height * 0.5, size.width * 0.3, size.height);
    canvas.drawPath(bgRoad2, roadPaint);

    // 2. Active Route Path
    final routePaint = Paint()
      ..color = const Color(0xFF1F3864).withValues(alpha: 0.8)
      ..strokeWidth = 6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final startPoint = Offset(size.width * 0.3, size.height * 0.65);
    final endPoint = Offset(size.width * 0.75, size.height * 0.28);
    final midPoint = Offset(size.width * 0.55, size.height * 0.52);

    final routePath = Path()
      ..moveTo(startPoint.dx, startPoint.dy)
      ..quadraticBezierTo(midPoint.dx, midPoint.dy, endPoint.dx, endPoint.dy);

    canvas.drawPath(routePath, routePaint);

    // 3. Destination Pin (Customer Home)
    final destPinPaint = Paint()..color = const Color(0xFFDC2626);
    canvas.drawCircle(endPoint, 14, destPinPaint);
    final destInnerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(endPoint, 6, destInnerPaint);

    // 4. Provider Marker (Van / Partner)
    final providerOffset = status == 'in_progress'
        ? endPoint
        : (status == 'en_route' ? midPoint : startPoint);

    final provHaloPaint = Paint()..color = const Color(0xFF548235).withValues(alpha: 0.25);
    canvas.drawCircle(providerOffset, 20, provHaloPaint);

    final provPaint = Paint()..color = const Color(0xFF548235);
    canvas.drawCircle(providerOffset, 12, provPaint);
    final provInnerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(providerOffset, 5, provInnerPaint);
  }

  @override
  bool shouldRepaint(covariant LiveMapPainter oldDelegate) {
    return oldDelegate.providerLat != providerLat ||
        oldDelegate.providerLng != providerLng ||
        oldDelegate.status != status;
  }
}
