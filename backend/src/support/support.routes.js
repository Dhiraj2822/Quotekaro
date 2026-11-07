const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  handleChatbotMessage,
  handleCreateTicket,
  handleGetTickets,
  handleTicketReply
} = require('./support.controller');

// AI Chatbot can be used with or without authentication
router.post('/chat', handleChatbotMessage);

// Ticket endpoints require authentication
router.use(authenticate);
router.post('/tickets', handleCreateTicket);
router.get('/tickets', handleGetTickets);
router.post('/tickets/:id/reply', handleTicketReply);

module.exports = router;

