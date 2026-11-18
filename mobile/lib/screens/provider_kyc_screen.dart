import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';

class ProviderKycScreen extends StatefulWidget {
  final Map<String, dynamic>? initialProfile;
  final VoidCallback? onProfileUpdated;

  const ProviderKycScreen({
    super.key,
    this.initialProfile,
    this.onProfileUpdated,
  });

  @override
  State<ProviderKycScreen> createState() => _ProviderKycScreenState();
}

class _ProviderKycScreenState extends State<ProviderKycScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);

  Map<String, dynamic>? _profile;
  String? _docUrl;
  XFile? _pickedFile;
  String? _selectedDocName;

  final List<String> _availableCategories = ['plumbing', 'electrical', 'painting', 'cleaning'];
  final Set<String> _selectedCategories = {'plumbing', 'electrical'};
  double _radiusKm = 15.0;
  bool _isAvailable = false;

  bool _isLoading = false;
  String? _statusMessage;
  bool _isErrorMessage = false;

  @override
  void initState() {
    super.initState();
    _profile = widget.initialProfile;
    if (_profile != null) {
      _applyProfileData(_profile!);
    }
    _fetchProfileFromServer();
  }

  void _applyProfileData(Map<String, dynamic> p) {
    _isAvailable = p['is_available'] == true;
    if (p['service_area_radius_km'] != null) {
      _radiusKm = (p['service_area_radius_km'] as num).toDouble();
    }
    if (p['categories'] != null && p['categories'] is List) {
      _selectedCategories.clear();
      for (var c in p['categories']) {
        _selectedCategories.add(c.toString());
      }
    }
    if (p['kyc_document_url'] != null && p['kyc_document_url'].toString().isNotEmpty) {
      _docUrl = p['kyc_document_url'].toString();
      _selectedDocName = 'Aadhaar / ID Proof (Attached)';
    }
  }

  Future<void> _fetchProfileFromServer() async {
    try {
      final user = ApiService.currentUser;
      final profileId = user?['provider_profile']?['id']?.toString() ?? user?['id']?.toString();
      if (profileId != null && profileId.isNotEmpty) {
        final profile = await ApiService.getProviderProfile(profileId);
        if (mounted && profile.isNotEmpty) {
          setState(() {
            _profile = profile;
            _applyProfileData(profile);
          });
        }
      }
    } catch (_) {
      // Use existing profile data if offline
    }
  }

  Future<void> _pickDocument(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (picked != null) {
        setState(() {
          _pickedFile = picked;
          _selectedDocName = picked.name;
        });
      }
    } catch (e) {
      _showMessage('Failed to capture document: $e', isError: true);
    }
  }

  Future<void> _submitKycDocument() async {
    if (_pickedFile == null && (_docUrl == null || _docUrl!.isEmpty)) {
      _showMessage('Please select an ID document to upload', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      String documentUrl = _docUrl ?? '';
      if (_pickedFile != null) {
        final bytes = await _pickedFile!.readAsBytes();
        final base64Str = base64Encode(bytes);
        documentUrl = await ApiService.uploadPhoto(
          base64Data: base64Str,
          filename: _pickedFile!.name,
        );
      }

      final updated = await ApiService.submitKyc(documentUrl);
      setState(() {
        _profile = updated;
        _docUrl = documentUrl;
        _isAvailable = false;
        _isLoading = false;
      });
      _showMessage('KYC document submitted successfully! Status is now Pending review.');
      widget.onProfileUpdated?.call();
    } catch (e) {
      setState(() => _isLoading = false);
      _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }

  Future<void> _saveServiceArea() async {
    if (_profile == null) {
      _showMessage('Please submit your KYC document first to create a provider profile.', isError: true);
      return;
    }

    if (_selectedCategories.isEmpty) {
      _showMessage('Please select at least one service category.', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final updated = await ApiService.updateServiceArea(
        profileId: _profile!['id'],
        categories: _selectedCategories.toList(),
        radiusKm: _radiusKm.round(),
        lat: 18.520430, // Pune center
        lng: 73.856744,
      );
      setState(() {
        _profile = updated;
        _isLoading = false;
      });
      _showMessage('Service area and categories saved successfully!');
      widget.onProfileUpdated?.call();
    } catch (e) {
      setState(() => _isLoading = false);
      _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }

  Future<void> _toggleAvailability(bool value) async {
    if (_profile == null) {
      _showMessage('Provider profile not initialized. Submit KYC first.', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final updated = await ApiService.updateAvailability(_profile!['id'], value);
      setState(() {
        _profile = updated;
        _isAvailable = updated['is_available'] == true;
        _isLoading = false;
      });
      _showMessage(
        _isAvailable ? 'You are now ONLINE and available for jobs!' : 'You are now OFFLINE.',
      );
      widget.onProfileUpdated?.call();
    } catch (e) {
      setState(() {
        _isLoading = false;
        _isAvailable = false;
      });
      _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }

  void _showMessage(String msg, {bool isError = false}) {
    setState(() {
      _statusMessage = msg;
      _isErrorMessage = isError;
    });
  }

  @override
  Widget build(BuildContext context) {
    final kycStatus = _profile?['kyc_status'] ?? 'pending';

    Color statusColor;
    String statusLabel;
    IconData statusIcon;

    switch (kycStatus) {
      case 'approved':
        statusColor = accentColor;
        statusLabel = 'KYC Approved & Verified';
        statusIcon = Icons.verified;
        break;
      case 'rejected':
        statusColor = const Color(0xFFDC2626);
        statusLabel = 'KYC Rejected';
        statusIcon = Icons.cancel;
        break;
      case 'pending':
      default:
        statusColor = warningColor;
        statusLabel = 'KYC Pending Review';
        statusIcon = Icons.hourglass_top;
        break;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Provider Setup & KYC', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Status Notification Banner
          if (_statusMessage != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isErrorMessage ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _isErrorMessage ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isErrorMessage ? Icons.error_outline : Icons.check_circle_outline,
                    color: _isErrorMessage ? const Color(0xFFB91C1C) : accentColor,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _statusMessage!,
                      style: TextStyle(
                        color: _isErrorMessage ? const Color(0xFFB91C1C) : const Color(0xFF166534),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // KYC Status Header Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(statusIcon, color: statusColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Verification Status', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            Text(
                              statusLabel,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: statusColor),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (kycStatus == 'rejected') ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 18),
                              SizedBox(width: 8),
                              Text(
                                'Rejection Reason from Admin:',
                                style: TextStyle(
                                  color: Color(0xFF991B1B),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _profile?['rejection_reason'] != null &&
                                    _profile!['rejection_reason'].toString().isNotEmpty
                                ? _profile!['rejection_reason'].toString()
                                : 'Uploaded document does not meet verification requirements. Please upload a clear official ID proof below.',
                            style: const TextStyle(
                              color: Color(0xFFB91C1C),
                              fontSize: 13,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Please re-upload a clear identity proof below. Once submitted, your profile will be placed back into review.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    ),
                  ] else ...[
                    Text(
                      kycStatus == 'approved'
                          ? 'Your profile is approved. You can toggle your availability and submit quotes for nearby customer jobs.'
                          : 'Your ID proof is required for customer safety. You cannot be marked available until approved by an administrator.',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Availability Switch (Gated)
          Card(
            child: SwitchListTile(
              key: const Key('availability_switch'),
              title: const Text('Available for Jobs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              subtitle: Text(
                _isAvailable ? 'Online — receiving nearby job requests' : 'Offline — not receiving jobs',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              value: _isAvailable,
              activeColor: accentColor,
              onChanged: _isLoading ? null : _toggleAvailability,
            ),
          ),

          const SizedBox(height: 16),

          // 1. KYC Upload Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('1. KYC Document Upload', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: primaryColor)),
                  const SizedBox(height: 6),
                  const Text(
                    'Upload your government ID (Aadhaar, Voter ID, or Trade License) for admin verification.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 14),

                  if (_selectedDocName != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF86EFAC)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: accentColor, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedDocName!,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Document ready for admin verification',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: _isLoading ? null : () => _pickDocument(ImageSource.gallery),
                            child: const Text('Change', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.badge_outlined, size: 40, color: primaryColor),
                          const SizedBox(height: 8),
                          const Text(
                            'Attach clear photo of your ID',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: primaryColor),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Supported formats: JPG, PNG, PDF',
                            style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              OutlinedButton.icon(
                                onPressed: _isLoading ? null : () => _pickDocument(ImageSource.camera),
                                icon: const Icon(Icons.camera_alt_outlined, size: 18),
                                label: const Text('Camera'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: primaryColor,
                                  side: const BorderSide(color: primaryColor),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton.icon(
                                onPressed: _isLoading ? null : () => _pickDocument(ImageSource.gallery),
                                icon: const Icon(Icons.photo_library_outlined, size: 18),
                                label: const Text('Upload File'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      key: const Key('submit_kyc_button'),
                      onPressed: _isLoading ? null : _submitKycDocument,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accentColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.cloud_upload_outlined, size: 18),
                      label: Text(
                        _isLoading ? 'Submitting…' : 'Submit Document for Verification',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // 2. Service Area & Category Picker
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('2. Service Categories & Radius', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: primaryColor)),
                  const SizedBox(height: 6),
                  const Text('Select the services you offer and your maximum travel radius.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),

                  // Categories Chips
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _availableCategories.map((category) {
                      final isSelected = _selectedCategories.contains(category);
                      return FilterChip(
                        key: Key('chip_$category'),
                        label: Text(category[0].toUpperCase() + category.substring(1)),
                        selected: isSelected,
                        selectedColor: accentColor.withOpacity(0.2),
                        checkmarkColor: accentColor,
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              _selectedCategories.add(category);
                            } else {
                              _selectedCategories.remove(category);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Radius Slider
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Service Area Radius', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      Text('${_radiusKm.round()} km', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor)),
                    ],
                  ),
                  Slider(
                    key: const Key('radius_slider'),
                    value: _radiusKm,
                    min: 5,
                    max: 50,
                    divisions: 9,
                    activeColor: primaryColor,
                    label: '${_radiusKm.round()} km',
                    onChanged: (val) => setState(() => _radiusKm = val),
                  ),

                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    key: const Key('save_service_area_button'),
                    onPressed: _isLoading ? null : _saveServiceArea,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.save_outlined, size: 18),
                    label: const Text('Save Categories & Radius'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
