const supportService = require('./support.service');

async function handleChatbotMessage(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Message text is required' } });
    }
    const reply = supportService.generateChatbotResponse(message);
    res.status(200).json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

async function handleCreateTicket(req, res, next) {
  try {
    const { subject, category, booking_id, priority, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Subject and message are required' } });
    }
    const ticket = await supportService.createTicket(req.user.id, {
      subject,
      category,
      booking_id,
      priority,
      message
    });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function handleGetTickets(req, res, next) {
  try {
    const tickets = await supportService.getUserTickets(req.user.id);
    res.status(200).json({ count: tickets.length, tickets });
  } catch (err) {
    next(err);
  }
}

async function handleTicketReply(req, res, next) {
  try {
    const { id } = req.params;
    const { text, sender } = req.body;
    if (!text) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Reply text is required' } });
    }
    const ticket = await supportService.addTicketReply(id, req.user.id, {
      text,
      sender: sender || (req.user.role === 'admin' ? 'support' : 'user')
    });
    res.status(200).json({ ticket });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleChatbotMessage,
  handleCreateTicket,
  handleGetTickets,
  handleTicketReply
};
