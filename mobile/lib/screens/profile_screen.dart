import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const ProfileScreen({super.key, required this.user, required this.onLogout});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<dynamic> _addresses = [];
  String _selectedLanguage = 'en'; // 'en', 'hi', 'mr'
  bool _isLoading = true;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final list = await ApiService.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddAddressDialog() {
    final labelCtrl = TextEditingController(text: 'Home');
    final addrCtrl = TextEditingController();
    final areaCtrl = TextEditingController(text: 'Kothrud');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Saved Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: labelCtrl,
              decoration: const InputDecoration(labelText: 'Label (e.g. Home, Office, Parents)'),
            ),
            TextField(
              controller: addrCtrl,
              decoration: const InputDecoration(labelText: 'Flat / Building / Street Address'),
            ),
            TextField(
              controller: areaCtrl,
              decoration: const InputDecoration(labelText: 'Area / Locality in Pune'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (addrCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              await ApiService.addAddress({
                'label': labelCtrl.text.trim(),
                'address_line1': addrCtrl.text.trim(),
                'area': areaCtrl.text.trim(),
                'city': 'Pune',
              });
              _loadAddresses();
            },
            style: ElevatedButton.styleFrom(backgroundColor: primaryColor, foregroundColor: Colors.white),
            child: const Text('Save Address'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
        content: const Text(
          'Are you sure you want to delete your QuoteKaro account? All active subscriptions, registered appliances, and booking histories will be permanently deactivated.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              widget.onLogout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Confirm Deactivate'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.user['name'] ?? 'QuoteKaro Member';
    final phone = widget.user['phone_number'] ?? '';
    final email = widget.user['email'] ?? 'member@quotekaro.com';
    final role = widget.user['role'] ?? 'customer';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Avatar Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: primaryColor,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'Q',
                      style: const TextStyle(fontSize: 24, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor)),
                        const SizedBox(height: 2),
                        Text(phone, style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontFamily: 'monospace')),
                        Text(email, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                    child: Text(
                      role.toUpperCase(),
                      style: const TextStyle(color: Color(0xFF15803D), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Multilingual Support Selector
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Preferred Language / भाषा / भाषा निवडा', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('English'),
                          selected: _selectedLanguage == 'en',
                          onSelected: (_) => setState(() => _selectedLanguage = 'en'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('हिंदी'),
                          selected: _selectedLanguage == 'hi',
                          onSelected: (_) => setState(() => _selectedLanguage = 'hi'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('मराठी'),
                          selected: _selectedLanguage == 'mr',
                          onSelected: (_) => setState(() => _selectedLanguage = 'mr'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Saved Addresses Book
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Saved Addresses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      TextButton.icon(
                        onPressed: _showAddAddressDialog,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Add New', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                  if (_addresses.isEmpty)
                    const Text('No saved addresses. Add one to speed up checkout.', style: TextStyle(fontSize: 12, color: Colors.grey))
                  else
                    ..._addresses.map((a) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.location_on_outlined, color: primaryColor),
                          title: Text(a['label'] ?? 'Address', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('${a['address_line1']}, ${a['area'] ?? 'Pune'}', style: const TextStyle(fontSize: 11)),
                          trailing: const Icon(Icons.check_circle, color: accentColor, size: 16),
                        )),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Logout & Account Actions
            ListTile(
              onTap: widget.onLogout,
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade300)),
              leading: const Icon(Icons.logout, color: Colors.orange),
              title: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              trailing: const Icon(Icons.chevron_right),
            ),

            const SizedBox(height: 12),

            ListTile(
              onTap: _confirmDeleteAccount,
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade300)),
              leading: const Icon(Icons.delete_forever, color: Colors.red),
              title: const Text('Delete Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.red)),
              trailing: const Icon(Icons.chevron_right, color: Colors.red),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
