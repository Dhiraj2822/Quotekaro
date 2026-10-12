const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const razorpayService = require('../src/payments/razorpay.service');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 6 - Task 3: Payment Endpoints & Webhook Signature Verification', () => {
  let memDb;

  let customerAId;
  let customerAToken;
  let customerBId;
  let customerBToken;

  let providerUserId;
  let providerProfileId;
  let providerToken;

  let jobId;
  let quoteId;
  let bookingId;

  beforeAll(() => {
    memDb = newDb();
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: memDb.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    memDb.public.none(`
      CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        role user_role NOT NULL,
        name VARCHAR(100),
        email VARCHAR(150),
        profile_photo_url TEXT,
        city VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE kyc_status_enum AS ENUM ('pending', 'approved', 'rejected');

      CREATE TABLE IF NOT EXISTS provider_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        kyc_status kyc_status_enum NOT NULL DEFAULT 'approved',
        categories TEXT[],
        is_available BOOLEAN DEFAULT true,
        wallet_balance_paise INTEGER DEFAULT 50000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE urgency_type_enum AS ENUM ('urgent', 'planned');
      CREATE TYPE job_status_enum AS ENUM ('open', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled');

      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(30) NOT NULL,
        urgency_type urgency_type_enum NOT NULL,
        description TEXT,
        status job_status_enum NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE quote_status_enum AS ENUM ('pending', 'accepted', 'rejected');
      CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'en_route', 'in_progress', 'completed', 'cancelled');

      CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        price_paise INTEGER NOT NULL,
        eta_minutes INTEGER,
        message TEXT,
        status quote_status_enum NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
        quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        status booking_status_enum NOT NULL DEFAULT 'confirmed',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE payment_method_enum AS ENUM ('upi', 'card', 'cash');
      CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed');
      CREATE TYPE wallet_entry_type_enum AS ENUM ('commission_deduction', 'topup', 'payout');

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
        amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
        method payment_method_enum NOT NULL,
        gateway_txn_id VARCHAR(100),
        status payment_status_enum NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        entry_type wallet_entry_type_enum NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    function executeSql(text, params) {
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }

      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          let val;
          if (param === null || param === undefined) {
            val = 'NULL';
          } else if (Array.isArray(param)) {
            val = `ARRAY[${param.map(p => `'${p}'`).join(',')}]`;
          } else if (typeof param === 'number') {
            val = `${param}`;
          } else if (typeof param === 'boolean') {
            val = param ? 'TRUE' : 'FALSE';
          } else {
            val = `'${String(param).replace(/'/g, "''")}'`;
          }
          const regex = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
          queryStr = queryStr.replace(regex, val);
        });
      }

      const res = memDb.public.query(queryStr);
      return {
        rows: res.rows || [],
        rowCount: res.rowCount !== undefined ? res.rowCount : (res.rows ? res.rows.length : 0)
      };
    }

    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      return executeSql(text, params);
    });

    jest.spyOn(db, 'getClient').mockImplementation(async () => {
      return {
        query: async (text, params) => executeSql(text, params),
        release: () => {}
      };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    memDb.public.none('DELETE FROM wallet_ledger;');
    memDb.public.none('DELETE FROM payments;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    const custA = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900031', 'customer', 'Customer A')
      RETURNING id, phone_number, role;
    `);
    customerAId = custA.id;
    customerAToken = makeToken({ id: customerAId, phone_number: custA.phone_number, role: 'customer' });

    const custB = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900032', 'customer', 'Customer B')
      RETURNING id, phone_number, role;
    `);
    customerBId = custB.id;
    customerBToken = makeToken({ id: customerBId, phone_number: custB.phone_number, role: 'customer' });

    const provU = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900033', 'provider', 'Provider A')
      RETURNING id, phone_number, role;
    `);
    providerUserId = provU.id;
    providerToken = makeToken({ id: providerUserId, phone_number: provU.phone_number, role: 'provider' });

    const provP = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, wallet_balance_paise)
      VALUES ('${providerUserId}', 'approved', true, 50000)
      RETURNING id;
    `);
    providerProfileId = provP.id;

    const j = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description)
      VALUES ('${customerAId}', 'electrical', 'planned', 'Fix fuse box')
      RETURNING id;
    `);
    jobId = j.id;

    const q = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ('${jobId}', '${providerProfileId}', 35000, 30, 'Ready to fix', 'accepted')
      RETURNING id;
    `);
    quoteId = q.id;

    const b = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${jobId}', '${quoteId}', '${customerAId}', '${providerProfileId}', 'confirmed')
      RETURNING id;
    `);
    bookingId = b.id;
  });

  describe('POST /api/v1/bookings/:id/payment', () => {
    it('creates UPI payment intent with Razorpay order details (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'upi' });

      expect(res.status).toBe(200);
      expect(res.body.payment_intent).toBeDefined();
      expect(res.body.payment_intent.booking_id).toBe(bookingId);
      expect(res.body.payment_intent.amount_paise).toBe(35000);
      expect(res.body.payment_intent.method).toBe('upi');
      expect(res.body.payment_intent.gateway).toBe('razorpay');
      expect(res.body.payment_intent.order_id).toMatch(/^order_[a-f0-9]+$/);
      expect(res.body.payment_intent.status).toBe('pending');

      // Verify row in database
      const row = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
      expect(row.method).toBe('upi');
      expect(row.amount_paise).toBe(35000);
      expect(row.gateway_txn_id).toBe(res.body.payment_intent.order_id);
    });

    it('creates Card payment intent with Razorpay order details (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'card' });

      expect(res.status).toBe(200);
      expect(res.body.payment_intent.method).toBe('card');
      expect(res.body.payment_intent.gateway).toBe('razorpay');
      expect(res.body.payment_intent.order_id).toMatch(/^order_[a-f0-9]+$/);
    });

    it('creates Cash payment intent with null gateway order (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'cash' });

      expect(res.status).toBe(200);
      expect(res.body.payment_intent.method).toBe('cash');
      expect(res.body.payment_intent.gateway).toBeNull();
      expect(res.body.payment_intent.order_id).toBeNull();
      expect(res.body.payment_intent.amount_paise).toBe(35000);
      expect(res.body.payment_intent.status).toBe('pending');

      const row = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
      expect(row.method).toBe('cash');
      expect(row.gateway_txn_id).toBeNull();
    });

    it('blocks Customer B from creating payment for Customer A booking (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ method: 'upi' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid payment method with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'crypto' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent booking ID', async () => {
      const fakeId = crypto.randomUUID();
      const res = await request(app)
        .post(`/api/v1/bookings/${fakeId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'upi' });

      expect(res.status).toBe(404);
    });

    it('rejects payment attempt when booking is already paid in full (400 Bad Request)', async () => {
      memDb.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
        VALUES ('${bookingId}', 35000, 'upi', 'pay_completed_123', 'completed');
      `);

      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ method: 'upi' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAYMENT_ALREADY_COMPLETED');
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('successfully processes genuine webhook with payment.captured (200 OK)', async () => {
      // First create pending payment
      const orderId = 'order_webhook_test_01';
      memDb.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
        VALUES ('${bookingId}', 35000, 'upi', '${orderId}', 'pending');
      `);

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_captured_999',
              order_id: orderId,
              amount: 35000,
              status: 'captured',
              method: 'upi'
            }
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = razorpayService.generateWebhookSignature({ payload: rawBody });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('processed');

      // Verify database updated to completed
      const row = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
      expect(row.status).toBe('completed');
      expect(row.gateway_txn_id).toBe('pay_webhook_captured_999');
    });

    it('rejects webhook without signature header (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('rejects webhook with forged/tampered signature (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', 'forged_fake_signature_abc123')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('updates payment status to failed on payment.failed event', async () => {
      const orderId = 'order_webhook_fail_01';
      memDb.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
        VALUES ('${bookingId}', 35000, 'card', '${orderId}', 'pending');
      `);

      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_111',
              order_id: orderId,
              status: 'failed'
            }
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = razorpayService.generateWebhookSignature({ payload: rawBody });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);

      const row = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
      expect(row.status).toBe('failed');
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('verifies valid client-side checkout callback and marks payment completed', async () => {
      const orderId = 'order_checkout_verify_01';
      const paymentId = 'pay_checkout_verify_01';
      memDb.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
        VALUES ('${bookingId}', 35000, 'upi', '${orderId}', 'pending');
      `);

      const signature = razorpayService.generatePaymentSignature({
        orderId,
        paymentId
      });

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          booking_id: bookingId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.payment.status).toBe('completed');
      expect(res.body.payment.gateway_txn_id).toBe(paymentId);

      const row = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
      expect(row.status).toBe('completed');
    });

    it('rejects tampered checkout verification signature (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          booking_id: bookingId,
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'fake_tampered_signature'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('GET /api/v1/payments/booking/:id', () => {
    it('returns payment record for booking', async () => {
      memDb.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
        VALUES ('${bookingId}', 35000, 'cash', NULL, 'pending');
      `);

      const res = await request(app)
        .get(`/api/v1/payments/booking/${bookingId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.booking_id).toBe(bookingId);
      expect(res.body.payment.method).toBe('cash');
    });
  });
});
