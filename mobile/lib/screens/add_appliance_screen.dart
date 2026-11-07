import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AddApplianceScreen extends StatefulWidget {
  const AddApplianceScreen({super.key});

  @override
  State<AddApplianceScreen> createState() => _AddApplianceScreenState();
}

class _AddApplianceScreenState extends State<AddApplianceScreen> {
  final _formKey = GlobalKey<FormState>();
  String _applianceType = 'ac';
  final TextEditingController _brandController = TextEditingController();
  final TextEditingController _modelController = TextEditingController();
  final TextEditingController _propertyController = TextEditingController(text: 'Main Residence');
  final TextEditingController _notesController = TextEditingController();
  String _usageFrequency = 'medium';
  DateTime? _purchaseDate;
  DateTime? _lastServiceDate;
  bool _isSaving = false;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  final List<Map<String, String>> _types = [
    {'value': 'ac', 'label': 'Air Conditioner (AC)'},
    {'value': 'refrigerator', 'label': 'Refrigerator'},
    {'value': 'washing_machine', 'label': 'Washing Machine'},
    {'value': 'water_purifier', 'label': 'Water Purifier (RO)'},
    {'value': 'geyser', 'label': 'Water Geyser'},
    {'value': 'microwave', 'label': 'Microwave Oven'},
    {'value': 'chimney', 'label': 'Kitchen Chimney'},
    {'value': 'television', 'label': 'Smart Television'},
    {'value': 'other', 'label': 'Other Appliance'},
  ];

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      await ApiService.registerAppliance({
        'appliance_type': _applianceType,
        'brand': _brandController.text.trim(),
        'model': _modelController.text.trim(),
        'property_name': _propertyController.text.trim(),
        'usage_frequency': _usageFrequency,
        'purchase_date': _purchaseDate?.toIso8601String().split('T')[0],
        'last_service_date': _lastServiceDate?.toIso8601String().split('T')[0],
        'notes': _notesController.text.trim(),
      });

      if (mounted) {
        setState(() => _isSaving = false);
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Register Appliance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'AI Preventive Health Setup',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryColor),
              ),
              const SizedBox(height: 4),
              const Text(
                'Enter appliance details so QuoteKaro AI can calculate optimal maintenance cycles and warranty alerts.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 20),

              // Appliance Type Dropdown
              const Text('Appliance Type *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _applianceType,
                items: _types
                    .map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!, style: const TextStyle(fontSize: 13))))
                    .toList(),
                onChanged: (val) => setState(() => _applianceType = val ?? 'ac'),
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 16),

              // Brand & Model
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Brand *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _brandController,
                          decoration: InputDecoration(
                            hintText: 'e.g. Daikin, LG, Kent',
                            hintStyle: const TextStyle(fontSize: 12),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Brand is required' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Model / Capacity', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _modelController,
                          decoration: InputDecoration(
                            hintText: 'e.g. 1.5 Ton 5-Star',
                            hintStyle: const TextStyle(fontSize: 12),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Property / Location
              const Text('Property / Room Location', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _propertyController,
                decoration: InputDecoration(
                  hintText: 'e.g. Main Residence - Master Bed',
                  hintStyle: const TextStyle(fontSize: 12),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 16),

              // Usage Frequency
              const Text('Usage Frequency', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Light (<2 hrs/day)', style: TextStyle(fontSize: 11)),
                      selected: _usageFrequency == 'low',
                      onSelected: (_) => setState(() => _usageFrequency = 'low'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Medium (4-6 hrs)', style: TextStyle(fontSize: 11)),
                      selected: _usageFrequency == 'medium',
                      onSelected: (_) => setState(() => _usageFrequency = 'medium'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Heavy (>8 hrs)', style: TextStyle(fontSize: 11)),
                      selected: _usageFrequency == 'heavy',
                      onSelected: (_) => setState(() => _usageFrequency = 'heavy'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Dates Picker (Purchase & Last Service)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().subtract(const Duration(days: 365)),
                          firstDate: DateTime(2015),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null) setState(() => _purchaseDate = picked);
                      },
                      icon: const Icon(Icons.date_range, size: 16),
                      label: Text(
                        _purchaseDate == null ? 'Purchase Date' : '${_purchaseDate!.day}/${_purchaseDate!.month}/${_purchaseDate!.year}',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().subtract(const Duration(days: 90)),
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null) setState(() => _lastServiceDate = picked);
                      },
                      icon: const Icon(Icons.build_circle_outlined, size: 16),
                      label: Text(
                        _lastServiceDate == null ? 'Last Service' : '${_lastServiceDate!.day}/${_lastServiceDate!.month}/${_lastServiceDate!.year}',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Notes
              const Text('Maintenance Notes / Comments', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Any known past repairs or cooling performance remarks...',
                  hintStyle: const TextStyle(fontSize: 12),
                  contentPadding: const EdgeInsets.all(12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save & Run AI Diagnostics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
