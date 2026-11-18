import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'help_support_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const ProfileScreen({super.key, required this.user, required this.onLogout});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<dynamic> _addresses = [];
  late Map<String, dynamic> _userData;
  bool _isSavingProfile = false;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  @override
  void initState() {
    super.initState();
    _userData = Map<String, dynamic>.from(widget.user);
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final list = await ApiService.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = list;
        });
      }
    } catch (_) {}
  }

  void _showEditProfileDialog() {
    final nameCtrl = TextEditingController(text: _userData['name'] ?? '');
    final emailCtrl = TextEditingController(text: _userData['email'] ?? '');
    final cityCtrl = TextEditingController(text: _userData['city'] ?? 'Pune');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.edit_outlined, color: primaryColor, size: 20),
              SizedBox(width: 8),
              Text('Edit Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Full Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryColor)),
                const SizedBox(height: 4),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    hintText: 'e.g. Rahul Sharma',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Email Address', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryColor)),
                const SizedBox(height: 4),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: 'e.g. rahul@example.com',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('City / Operational Area', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryColor)),
                const SizedBox(height: 4),
                TextField(
                  controller: cityCtrl,
                  decoration: InputDecoration(
                    hintText: 'e.g. Pune',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: _isSavingProfile ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: _isSavingProfile
                  ? null
                  : () async {
                      final newName = nameCtrl.text.trim();
                      final newEmail = emailCtrl.text.trim();
                      final newCity = cityCtrl.text.trim();

                      if (newName.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Name cannot be empty')),
                        );
                        return;
                      }

                      setModalState(() => _isSavingProfile = true);
                      try {
                        final userId = _userData['id']?.toString() ?? '';
                        final payload = <String, dynamic>{
                          'name': newName,
                          if (newEmail.isNotEmpty) 'email': newEmail,
                          if (newCity.isNotEmpty) 'city': newCity,
                        };

                        if (userId.isNotEmpty) {
                          await ApiService.updateUser(userId, payload);
                        }

                        if (mounted) {
                          setState(() {
                            _userData['name'] = newName;
                            if (newEmail.isNotEmpty) _userData['email'] = newEmail;
                            if (newCity.isNotEmpty) _userData['city'] = newCity;
                          });
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: accentColor,
                              content: Text('Profile updated successfully!'),
                            ),
                          );
                        }
                      } catch (e) {
                        setModalState(() => _isSavingProfile = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: Colors.red,
                              content: Text(e.toString().replaceFirst('Exception: ', '')),
                            ),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor, foregroundColor: Colors.white),
              child: _isSavingProfile
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
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

  void _confirmSignOut() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to sign out of QuoteKaro? You will return to the login screen.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // Clear entire navigation stack and return directly to root login
              Navigator.of(context, rootNavigator: true).popUntil((route) => route.isFirst);
              widget.onLogout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade800, foregroundColor: Colors.white),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = _userData['name'] ?? 'QuoteKaro Member';
    final phone = _userData['phone_number'] ?? '';
    final email = _userData['email'] ?? 'member@quotekaro.com';
    final city = _userData['city'] ?? 'Pune';
    final role = _userData['role'] ?? 'customer';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit Profile',
            onPressed: _showEditProfileDialog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Avatar Card with Edit action
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  Row(
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
                            if (city.isNotEmpty)
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 12, color: accentColor),
                                  const SizedBox(width: 2),
                                  Text(city, style: const TextStyle(fontSize: 11, color: accentColor, fontWeight: FontWeight.w600)),
                                ],
                              ),
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
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _showEditProfileDialog,
                    borderRadius: BorderRadius.circular(6),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.edit_note, size: 18, color: primaryColor),
                          SizedBox(width: 6),
                          Text('Edit Profile Information', style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                    ),
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

            const SizedBox(height: 20),

            // Help & Support Shortcut
            ListTile(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => HelpSupportScreen(user: _userData)),
                );
              },
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade300)),
              leading: const Icon(Icons.help_outline, color: primaryColor),
              title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('FAQs, helpline, and dispute assistance', style: TextStyle(fontSize: 11, color: Colors.grey)),
              trailing: const Icon(Icons.chevron_right),
            ),

            const SizedBox(height: 12),

            // Logout Action (Clean redirect to login)
            ListTile(
              onTap: _confirmSignOut,
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade300)),
              leading: const Icon(Icons.logout, color: Colors.orange),
              title: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.orange)),
              subtitle: const Text('Safely log out of your QuoteKaro session', style: TextStyle(fontSize: 11, color: Colors.grey)),
              trailing: const Icon(Icons.chevron_right),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
