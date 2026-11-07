import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SupportChatbotScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const SupportChatbotScreen({super.key, required this.user});

  @override
  State<SupportChatbotScreen> createState() => _SupportChatbotScreenState();
}

class _SupportChatbotScreenState extends State<SupportChatbotScreen> {
  final List<Map<String, dynamic>> _messages = [
    {
      'sender': 'bot',
      'text': 'Hello! I am QuoteKaro AI Home Assistant 🤖.\n\nI can help you with:\n• Troubleshooting home appliance issues\n• Understanding AI Preventive Maintenance cycles\n• Booking, rescheduling, and cancellation rules\n• Warranty and dispute assistance\n\nHow can I help you today?',
      'time': 'Just now'
    }
  ];

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isSending = false;

  static const Color primaryColor = Color(0xFF1F3864);
  static const Color accentColor = Color(0xFF548235);

  final List<String> _quickPrompts = [
    'How do I book a service?',
    'What is included in Care Subscription?',
    'Why is my AC cooling weak?',
    'What is the service warranty policy?',
    'Which areas in Pune are covered?',
  ];

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final userMsg = text.trim();
    _textController.clear();

    setState(() {
      _messages.add({
        'sender': 'user',
        'text': userMsg,
        'time': 'Now',
      });
      _isSending = true;
    });

    _scrollToBottom();

    try {
      final reply = await ApiService.sendChatbotMessage(userMsg);
      if (mounted) {
        setState(() {
          _messages.add({
            'sender': 'bot',
            'text': reply,
            'time': 'Now',
          });
          _isSending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add({
            'sender': 'bot',
            'text': 'I am having trouble connecting to the network. Please check your connection or contact QuoteKaro helpline.',
            'time': 'Now',
          });
          _isSending = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: Colors.white24,
              child: Icon(Icons.smart_toy, size: 16, color: Colors.white),
            ),
            SizedBox(width: 8),
            Text('QuoteKaro AI Assistant', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Suggestion Pills
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _quickPrompts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, idx) {
                return ActionChip(
                  label: Text(_quickPrompts[idx], style: const TextStyle(fontSize: 11)),
                  onPressed: () => _sendMessage(_quickPrompts[idx]),
                  backgroundColor: const Color(0xFFF1F5F9),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                );
              },
            ),
          ),

          const Divider(height: 1),

          // Chat Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final msg = _messages[idx];
                final isUser = msg['sender'] == 'user';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser ? primaryColor : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: isUser ? const Radius.circular(12) : const Radius.circular(2),
                        bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(12),
                      ),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg['text'] ?? '',
                          style: TextStyle(
                            fontSize: 13,
                            color: isUser ? Colors.white : Colors.black87,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          msg['time'] ?? '',
                          style: TextStyle(
                            fontSize: 9,
                            color: isUser ? Colors.white70 : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (_isSending)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Row(
                children: [
                  SizedBox(width: 16),
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('AI is formulating response...', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ),

          // Message Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      onSubmitted: _sendMessage,
                      decoration: InputDecoration(
                        hintText: 'Ask about maintenance, pricing, or bookings...',
                        hintStyle: const TextStyle(fontSize: 12),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: primaryColor,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: () => _sendMessage(_textController.text),
                    ),
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
