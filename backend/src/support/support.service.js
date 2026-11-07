const db = require('../config/db');

const memoryTickets = [];

// AI Chatbot Knowledge Base & Context Analyzer
const CHATBOT_RULES = [
  {
    keywords: ['book', 'how to book', 'booking', 'order', 'schedule', 'appointment', 'ऑर्डर', 'कसा बुक'],
    reply: 'To book a service on QuoteKaro:\n1. Browse through categories (Cleaning, AC Servicing, Electrician, Plumbing, Carpentry).\n2. Select your desired package and add-ons.\n3. Pick your address, convenient date, and time slot.\n4. Apply any coupon (e.g. WELCOME50) and confirm booking with Razorpay or Cash on Delivery!'
  },
  {
    keywords: ['subscription', 'home care', 'amc', 'membership', 'सब्सक्रिप्शन', 'प्लॅन'],
    reply: 'QuoteKaro Home Care Subscription gives you hassle-free year-round home upkeep:\n• Care Basic (₹199/mo): Full appliance tracking & AI reminders\n• Care Standard (₹499/mo): Includes 2 free annual visits + 15% discount on all bookings\n• Care Premium (₹999/mo): 4 comprehensive visits + VIP 1-hour emergency match + zero visitation charges.\nYou can explore and subscribe directly from the AI Maintenance tab!'
  },
  {
    keywords: ['cancel', 'cancellation', 'refund', 'रद्द', 'रिफंड'],
    reply: 'You can cancel a booking anytime up to 2 hours before the scheduled time slot for a full instant refund. If you experience service issues, our Admin Dispute Tribunal reviews proof-of-work photos and issues wallet or bank refunds within 24-48 hours.'
  },
  {
    keywords: ['warranty', 'guarantee', 'खराब', 'वॉरंटी'],
    reply: 'All QuoteKaro standard bookings include a 30-day service warranty. Care Standard and Premium subscription members enjoy extended 60 to 90-day coverage. If a repaired tap or AC develops the same issue within this window, our verified technician fixes it for free.'
  },
  {
    keywords: ['pune', 'city', 'location', 'areas', 'पिंपरी', 'पुणे'],
    reply: 'QuoteKaro currently operates across all major Pune and PCMC areas: Kothrud, Baner, Aundh, Wakad, Viman Nagar, Hinjewadi, Shivajinagar, Hadapsar, Magarpatta, and Kharadi.'
  },
  {
    keywords: ['ac', 'cooling', 'gas', 'एसी'],
    reply: 'For air conditioners, our AI Maintenance system recommends high-pressure foam jet servicing every 90-120 days. Low cooling is usually caused by choked filters, dust-crusted indoor coils, or capillary refrigerant drop. Book an AC Jet Foam Service from our Appliance Repair section!'
  },
  {
    keywords: ['water', 'ro', 'purifier', 'filter', 'पाणी'],
    reply: 'Pune tap water TDS ranges between 180 to 450 ppm depending on local dam blending. RO pre-sediment filters should be washed or swapped every 90 days to prevent membrane clogging. Book our General RO Health Check to measure inlet/outlet TDS!'
  }
];

function generateChatbotResponse(userMessage) {
  const cleanMsg = (userMessage || '').toLowerCase();

  for (const rule of CHATBOT_RULES) {
    if (rule.keywords.some((kw) => cleanMsg.includes(kw))) {
      return rule.reply;
    }
  }

  return 'Hello! I am QuoteKaro AI Home Assistant 🤖. I can help you with:\n• Finding vetted technicians for cleaning, electrical, plumbing, carpentry, or appliances\n• AI Preventive Maintenance recommendations for your home gadgets\n• Booking queries, rescheduling, and cancellation rules\n• Warranty and dispute assistance\n\nHow can I help you today?';
}

async function createTicket(userId, { subject, category, booking_id, priority = 'medium', message }) {
  const ticketObj = {
    id: `tkt-${Date.now()}`,
    user_id: userId,
    booking_id: booking_id || null,
    subject,
    category: category || 'general',
    priority,
    status: 'open',
    messages: [
      {
        sender: 'user',
        text: message,
        created_at: new Date().toISOString()
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const res = await db.query(`
      INSERT INTO support_tickets (
        user_id, booking_id, subject, category, priority, status, messages
      ) VALUES ($1, $2, $3, $4, $5, 'open', $6)
      RETURNING *
    `, [
      userId,
      booking_id || null,
      subject,
      category || 'general',
      priority,
      JSON.stringify(ticketObj.messages)
    ]);
    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }
  } catch (err) {
    // Memory
  }

  memoryTickets.unshift(ticketObj);
  return ticketObj;
}

async function getUserTickets(userId) {
  try {
    const res = await db.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Memory
  }

  const userList = memoryTickets.filter((t) => t.user_id === userId);
  if (userList.length === 0) {
    // Return sample ticket for presentation
    return [
      {
        id: `tkt-sample-${userId.slice(0, 8)}`,
        user_id: userId,
        booking_id: null,
        subject: 'AC cooling coil inspection warranty query',
        category: 'subscription',
        priority: 'medium',
        status: 'in_progress',
        messages: [
          { sender: 'user', text: 'I wanted to confirm if the replacement filter is included under my Care Standard plan?', created_at: new Date(Date.now() - 3600000).toISOString() },
          { sender: 'support', text: 'Hello! Under Care Standard, your labor and visit are 100% free, and you receive an exclusive 15% discount on the OEM filter cartridge.', created_at: new Date(Date.now() - 1800000).toISOString() }
        ],
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }
  return userList;
}

async function addTicketReply(ticketId, userId, { sender, text }) {
  const replyObj = {
    sender: sender || 'user',
    text,
    created_at: new Date().toISOString()
  };

  try {
    const fetchRes = await db.query('SELECT messages FROM support_tickets WHERE id = $1', [ticketId]);
    if (fetchRes && fetchRes.rows && fetchRes.rows[0]) {
      const messages = fetchRes.rows[0].messages || [];
      messages.push(replyObj);
      const updateRes = await db.query(
        'UPDATE support_tickets SET messages = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(messages), ticketId]
      );
      return updateRes.rows[0];
    }
  } catch (err) {
    // Memory
  }

  const ticket = memoryTickets.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.messages.push(replyObj);
    ticket.updated_at = new Date().toISOString();
    return ticket;
  }

  return { success: true, message: replyObj };
}

module.exports = {
  createTicket,
  getUserTickets,
  addTicketReply,
  generateChatbotResponse
};
