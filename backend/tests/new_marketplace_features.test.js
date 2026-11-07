const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { predictApplianceMaintenance } = require('../src/maintenance/maintenance.engine');
const { validateAndApplyCoupon } = require('../src/coupons/coupons.service');
const { generateChatbotResponse } = require('../src/support/support.service');

describe('New Marketplace & AI Home Maintenance Features', () => {
  const secret = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';
  const customerToken = jwt.sign(
    { id: '20000000-0000-0000-0000-000000000001', phone_number: '+919999900010', role: 'customer' },
    secret,
    { expiresIn: '1h' }
  );

  describe('1. Catalog API', () => {
    it('GET /api/v1/catalog/categories returns active categories', async () => {
      const res = await request(app).get('/api/v1/catalog/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(5);
      const cleaning = res.body.categories.find((c) => c.slug === 'cleaning');
      expect(cleaning).toBeDefined();
    });

    it('GET /api/v1/catalog/services returns services with packages', async () => {
      const res = await request(app).get('/api/v1/catalog/services?category=cleaning');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.services[0].category_slug).toBe('cleaning');
    });

    it('GET /api/v1/catalog/services/:idOrSlug returns detailed service', async () => {
      const res = await request(app).get('/api/v1/catalog/services/full-home-deep-cleaning');
      expect(res.status).toBe(200);
      expect(res.body.service.name).toBe('Full Home Deep Cleaning');
      expect(res.body.service.packages.length).toBeGreaterThan(0);
    });
  });

  describe('2. AI Maintenance Prediction Engine & Subscriptions', () => {
    it('predicts overdue maintenance for heavy usage appliance', () => {
      const appliance = {
        id: 'test-ac-1',
        appliance_type: 'ac',
        brand: 'Daikin',
        model: '1.5T Inverter',
        usage_frequency: 'heavy',
        last_service_date: '2025-06-01',
        repair_history: []
      };

      const prediction = predictApplianceMaintenance(appliance);
      expect(prediction).toBeDefined();
      expect(prediction.is_overdue).toBe(true);
      expect(['high', 'critical']).toContain(prediction.priority);
      expect(prediction.suggested_service).toContain('AC');
      expect(prediction.reason).toContain('Daikin');
    });

    it('GET /api/v1/maintenance/plans returns 3 configurable plans', async () => {
      const res = await request(app).get('/api/v1/maintenance/plans');
      expect(res.status).toBe(200);
      expect(res.body.plans.length).toBe(3);
      expect(res.body.plans.map((p) => p.tier)).toEqual(['basic', 'standard', 'premium']);
    });

    it('GET /api/v1/maintenance/dashboard returns appliances & metrics', async () => {
      const res = await request(app)
        .get('/api/v1/maintenance/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.subscription).toBeDefined();
      expect(Array.isArray(res.body.appliances)).toBe(true);
    });
  });

  describe('3. Customer Saved Addresses', () => {
    it('GET /api/v1/addresses returns customer addresses', async () => {
      const res = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.addresses)).toBe(true);
    });

    it('POST /api/v1/addresses creates a new saved address', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          label: 'Parents Home',
          address_line1: 'Bungalow 12, Mayur Colony',
          area: 'Kothrud',
          city: 'Pune',
          pincode: '411038'
        });
      expect(res.status).toBe(201);
      expect(res.body.address.label).toBe('Parents Home');
    });
  });

  describe('4. Coupons & Discounts Engine', () => {
    it('GET /api/v1/coupons returns available discount coupons', async () => {
      const res = await request(app).get('/api/v1/coupons');
      expect(res.status).toBe(200);
      expect(res.body.coupons.length).toBeGreaterThan(0);
    });

    it('calculates flat discount correctly', async () => {
      const result = await validateAndApplyCoupon('WELCOME50', 50000); // ₹500 order
      expect(result.valid).toBe(true);
      expect(result.discount_paise).toBe(5000); // ₹50
      expect(result.final_price_paise).toBe(45000);
    });

    it('calculates percentage discount correctly', async () => {
      const result = await validateAndApplyCoupon('PUNE20', 100000); // ₹1,000 order, 20%
      expect(result.valid).toBe(true);
      expect(result.discount_paise).toBe(20000); // ₹200
      expect(result.final_price_paise).toBe(80000);
    });
  });

  describe('5. Support Tickets & AI Chatbot', () => {
    it('Chatbot responds to booking queries', () => {
      const reply = generateChatbotResponse('How can I book a service in Pune?');
      expect(reply).toContain('QuoteKaro');
      expect(reply).toContain('Cleaning');
    });

    it('Chatbot responds to subscription queries', () => {
      const reply = generateChatbotResponse('Tell me about your home maintenance subscription plans');
      expect(reply).toContain('Care Basic');
      expect(reply).toContain('Care Standard');
    });

    it('POST /api/v1/support/chat generates reply', async () => {
      const res = await request(app)
        .post('/api/v1/support/chat')
        .send({ message: 'What is the warranty policy?' });
      expect(res.status).toBe(200);
      expect(res.body.reply).toContain('warranty');
    });

    it('GET /api/v1/support/tickets retrieves user tickets', async () => {
      const res = await request(app)
        .get('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });
  });

  describe('6. User In-App Notifications', () => {
    it('GET /api/v1/notifications returns notifications feed', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });
  });
});

