import 'package:flutter/material.dart';
import '../services/api_service.dart';

/**
 * Screen 6: Provider Wallet Screen
 * Implements prepaid balance card, threshold warning, top-up actions, and ledger history
 * per 06_UIUX_SPEC.md §3 and 01_PRD.md §4.
 */
class WalletScreen extends StatefulWidget {
  final String providerProfileId;

  const WalletScreen({
    super.key,
    required this.providerProfileId,
  });

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);
  static const Color warningColor = Color(0xFFBF8F00);
  static const Color bgColor = Color(0xFFF8FAFC);

  bool _isLoading = true;
  bool _isToppingUp = false;
  String? _errorMessage;

  int _balancePaise = 0;
  bool _isAvailable = true;
  int _minThresholdPaise = 10000; // ₹100
  List<dynamic> _ledger = [];

  final TextEditingController _customAmountController = TextEditingController();
  int _selectedPresetAmount = 200; // default ₹200

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
  }

  @override
  void dispose() {
    _customAmountController.dispose();
    super.dispose();
  }

  Future<void> _fetchWalletData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await ApiService.getProviderWallet(widget.providerProfileId);
      setState(() {
        _balancePaise = (data['balance_paise'] as int?) ?? 0;
        _isAvailable = data['is_available'] as bool? ?? true;
        _minThresholdPaise = (data['min_threshold_paise'] as int?) ?? 10000;
        _ledger = data['ledger'] as List<dynamic>? ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _handleTopup(int amountRupees) async {
    setState(() {
      _isToppingUp = true;
      _errorMessage = null;
    });

    try {
      final amountPaise = amountRupees * 100;
      final result = await ApiService.topupWallet(
        providerProfileId: widget.providerProfileId,
        amountPaise: amountPaise,
        method: 'upi',
      );

      setState(() {
        _balancePaise = (result['balance_paise'] as int?) ?? (_balancePaise + amountPaise);
        _isAvailable = result['is_available'] as bool? ?? true;
        if (result['ledger_entry'] != null) {
          _ledger.insert(0, result['ledger_entry']);
        }
        _isToppingUp = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: accentColor,
            content: Text('Successfully topped up ₹$amountRupees to wallet!'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isToppingUp = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  void _showCustomTopupDialog() {
    _customAmountController.text = '';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text('Top Up Wallet', style: TextStyle(fontWeight: FontWeight.bold, color: primaryColor)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter amount in Indian Rupees (₹):', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 12),
            TextField(
              key: const Key('custom_amount_input'),
              controller: _customAmountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                prefixText: '₹ ',
                hintText: 'e.g. 250',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('dialog_topup_confirm_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              final val = int.tryParse(_customAmountController.text.trim());
              if (val != null && val > 0) {
                Navigator.pop(ctx);
                _handleTopup(val);
              }
            },
            child: const Text('Top Up', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final balanceRupees = _balancePaise / 100.0;
    final isLowBalance = _balancePaise < _minThresholdPaise;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Prepaid Partner Wallet', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            key: const Key('refresh_wallet_button'),
            icon: const Icon(Icons.refresh),
            onPressed: _fetchWalletData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchWalletData,
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 1. Hero Balance Card
                  _buildBalanceCard(balanceRupees, isLowBalance),
                  const SizedBox(height: 16),

                  // 2. Low Balance Warning Alert Banner
                  if (isLowBalance) ...[
                    _buildLowBalanceWarning(),
                    const SizedBox(height: 16),
                  ],

                  // 3. Quick Top-Up Section
                  _buildTopUpSection(),
                  const SizedBox(height: 24),

                  // 4. Ledger History Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Wallet Ledger & Deductions',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
                      ),
                      Text(
                        '${_ledger.length} entries',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 5. Ledger List
                  if (_ledger.isEmpty)
                    _buildEmptyLedgerView()
                  else
                    ..._ledger.map((entry) => _buildLedgerTile(entry)),
                ],
              ),
            ),
    );
  }

  Widget _buildBalanceCard(double balanceRupees, bool isLowBalance) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isLowBalance
              ? [const Color(0xFF8B2500), const Color(0xFFBF8F00)]
              : [const Color(0xFF142442), const Color(0xFF1F3864)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (isLowBalance ? Colors.orange : primaryColor).withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'CURRENT BALANCE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 1.1),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isLowBalance ? Colors.amber.shade700 : accentColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isLowBalance ? Icons.warning_amber_rounded : Icons.check_circle,
                      color: Colors.white,
                      size: 14,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isLowBalance ? 'LEADS PAUSED (< ₹100)' : 'ACTIVE FOR JOBS',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '₹${balanceRupees.toStringAsFixed(2)}',
            style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -0.5),
          ),
          const SizedBox(height: 8),
          const Row(
            children: [
              Icon(Icons.shield_outlined, color: Colors.white70, size: 14),
              SizedBox(width: 6),
              Text(
                'Automatic 10% platform commission deduction per completed job',
                style: TextStyle(color: Colors.white70, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLowBalanceWarning() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, color: warningColor, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Minimum Wallet Balance Required',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF78350F)),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your wallet balance is below ₹${(_minThresholdPaise / 100).toStringAsFixed(0)}. Per QuoteKaro policy, your availability has been paused. Top up now to start receiving and bidding on new jobs.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopUpSection() {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Quick Wallet Top-Up',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryColor),
            ),
            const SizedBox(height: 12),
            Row(
              children: [100, 200, 500, 1000].map((amt) {
                final isSelected = _selectedPresetAmount == amt;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: ChoiceChip(
                      key: Key('preset_chip_$amt'),
                      label: Text('₹$amt', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : primaryColor)),
                      selected: isSelected,
                      selectedColor: primaryColor,
                      backgroundColor: Colors.grey.shade100,
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedPresetAmount = amt);
                        }
                      },
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    key: const Key('topup_preset_button'),
                    icon: _isToppingUp
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.add_circle_outline, color: Colors.white, size: 18),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentColor,
                      minimumSize: const Size(0, 46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    label: Text(
                      'Top Up ₹$_selectedPresetAmount via UPI',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    onPressed: _isToppingUp ? null : () => _handleTopup(_selectedPresetAmount),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  key: const Key('custom_topup_button'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 46),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    side: const BorderSide(color: primaryColor),
                  ),
                  onPressed: _showCustomTopupDialog,
                  child: const Text('Other', style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLedgerTile(dynamic entry) {
    final entryType = entry['entry_type'] ?? '';
    final amountPaise = (entry['amount_paise'] as int?) ?? 0;
    final balanceAfterPaise = (entry['balance_after_paise'] as int?) ?? 0;
    final bookingId = entry['booking_id'] as String?;
    final isDeduction = entryType == 'commission_deduction' || amountPaise < 0;

    final amountRupees = (amountPaise.abs()) / 100.0;
    final balanceAfterRupees = balanceAfterPaise / 100.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      elevation: 0.5,
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDeduction ? Colors.red.shade50 : Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isDeduction ? Icons.call_split_rounded : Icons.arrow_downward_rounded,
                color: isDeduction ? Colors.red.shade700 : accentColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isDeduction ? '10% Platform Commission' : 'Prepaid Wallet Top-Up',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isDeduction
                        ? 'Job #${bookingId != null && bookingId.length > 8 ? bookingId.substring(0, 8) : 'Completed'}'
                        : 'Instant UPI Settlement',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isDeduction ? '-' : '+'}₹${amountRupees.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDeduction ? Colors.red.shade700 : accentColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Bal: ₹${balanceAfterRupees.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyLedgerView() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Column(
        children: [
          Icon(Icons.history_toggle_off_rounded, size: 48, color: Color(0xFF94A3B8)),
          SizedBox(height: 12),
          Text(
            'No Wallet Transactions Yet',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
          ),
          SizedBox(height: 4),
          Text(
            'Transactions will appear here when commission is deducted on job completion or when you top up.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
