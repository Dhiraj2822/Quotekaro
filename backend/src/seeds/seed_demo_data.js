/**
 * Demo Data / Seed Script for Jury Presentation
 * Fulfills Module 9 Task 4 per 09_MODULE_BUILD_PLAN.md and 08_TESTING_STRATEGY.md §3:
 * - Scenario A: Planned painting job with 3 bids (blended sort verification)
 * - Scenario B: Urgent plumbing job with immediate auto-match
 * - Scenario C: Completed cash booking with 10% commission deduction in wallet ledger
 * - Scenario D: Unverified provider KYC gate & low wallet balance gate
 * - Admin dispute ready for arbitration
 */

require('dotenv').config();
const db = require('../config/db');

async function seed() {
  console.log('🌱 Starting QuoteKaro Jury Presentation Demo Data Seed...');

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Clean existing seed data safely
    console.log('🧹 Cleaning existing demo data...');
    await client.query(`
      TRUNCATE TABLE 
        disputes,
        ratings,
        wallet_ledger,
        payments,
        booking_messages,
        bookings,
        quotes,
        jobs,
        provider_profiles,
        users
      CASCADE;
    `);

    // 2. Insert Admin User
    console.log('👤 Seeding Admin User...');
    const adminRes = await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '10000000-0000-0000-0000-000000000001',
        '+919999900000',
        'admin',
        'QuoteKaro Ops Admin',
        'admin@quotekaro.com',
        'Pune',
        true
      )
      RETURNING id, name, phone_number;
    `);

    // 3. Insert Customers
    console.log('👥 Seeding Customers...');
    const customer1 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        '+919999900010',
        'customer',
        'Kavita Patil',
        'kavita.patil@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    const customer2 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '20000000-0000-0000-0000-000000000002',
        '+919999900020',
        'customer',
        'Rahul Deshmukh',
        'rahul.deshmukh@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    const customer3 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '20000000-0000-0000-0000-000000000003',
        '+919999900030',
        'customer',
        'Pooja Kulkarni',
        'pooja.k@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    // 4. Insert Providers & Profiles
    console.log('🔧 Seeding Providers & Verified Profiles...');
    
    // Provider 1: Suresh Electrician (High rating, moderate price)
    const provUser1 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '30000000-0000-0000-0000-000000000001',
        '+919999900001',
        'provider',
        'Suresh Electrician',
        'suresh.electric@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    const provProfile1 = (await client.query(`
      INSERT INTO provider_profiles (
        id, user_id, kyc_status, kyc_document_url, categories, service_area_radius_km,
        base_location_lat, base_location_lng, is_available, wallet_balance_paise,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES (
        '40000000-0000-0000-0000-000000000001',
        '${provUser1.id}',
        'approved',
        'https://storage.quotekaro.com/kyc/suresh_trade_license.pdf',
        ARRAY['electrical', 'painting'],
        15,
        18.5074, 73.8077,
        true,
        50000, -- ₹500
        4.8, 4.7, 4.9
      )
      RETURNING id;
    `)).rows[0];

    // Provider 2: Ramesh Plumber (Nearby, available for urgent auto-match)
    const provUser2 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '30000000-0000-0000-0000-000000000002',
        '+919999900002',
        'provider',
        'Ramesh Plumber',
        'ramesh.plumb@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    const provProfile2 = (await client.query(`
      INSERT INTO provider_profiles (
        id, user_id, kyc_status, kyc_document_url, categories, service_area_radius_km,
        base_location_lat, base_location_lng, is_available, wallet_balance_paise,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES (
        '40000000-0000-0000-0000-000000000002',
        '${provUser2.id}',
        'approved',
        'https://storage.quotekaro.com/kyc/ramesh_aadhaar_card.pdf',
        ARRAY['plumbing', 'electrical'],
        15,
        18.5204, 73.8567,
        true,
        75000, -- ₹750
        4.6, 4.9, 4.7
      )
      RETURNING id;
    `)).rows[0];

    // Provider 3: Mahesh Painter (Premium painter, highest quality rating)
    const provUser3 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '30000000-0000-0000-0000-000000000003',
        '+919999900003',
        'provider',
        'Mahesh Painter',
        'mahesh.paints@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    const provProfile3 = (await client.query(`
      INSERT INTO provider_profiles (
        id, user_id, kyc_status, kyc_document_url, categories, service_area_radius_km,
        base_location_lat, base_location_lng, is_available, wallet_balance_paise,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES (
        '40000000-0000-0000-0000-000000000003',
        '${provUser3.id}',
        'approved',
        'https://storage.quotekaro.com/kyc/mahesh_pan_verified.pdf',
        ARRAY['painting'],
        20,
        18.5089, 73.8340,
        true,
        120000, -- ₹1,200
        4.9, 4.8, 4.8
      )
      RETURNING id;
    `)).rows[0];

    // Provider 4: Ganesh Appliances (Scenario D: Unverified KYC gate)
    const provUser4 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '30000000-0000-0000-0000-000000000004',
        '+919999900004',
        'provider',
        'Ganesh Appliances',
        'ganesh.app@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    await client.query(`
      INSERT INTO provider_profiles (
        id, user_id, kyc_status, kyc_document_url, categories, service_area_radius_km,
        base_location_lat, base_location_lng, is_available, wallet_balance_paise
      )
      VALUES (
        '40000000-0000-0000-0000-000000000004',
        '${provUser4.id}',
        'pending', -- Pending KYC
        'https://storage.quotekaro.com/kyc/ganesh_doc.pdf',
        ARRAY['electrical', 'cleaning'],
        10,
        18.5300, 73.8400,
        false,
        50000
      );
    `);

    // Provider 5: Dinesh Low-Balance (Wallet Balance Gate demonstration)
    const provUser5 = (await client.query(`
      INSERT INTO users (id, phone_number, role, name, email, city, is_active)
      VALUES (
        '30000000-0000-0000-0000-000000000005',
        '+919999900005',
        'provider',
        'Dinesh Carpentry',
        'dinesh.carpenter@example.com',
        'Pune',
        true
      )
      RETURNING id;
    `)).rows[0];

    await client.query(`
      INSERT INTO provider_profiles (
        id, user_id, kyc_status, kyc_document_url, categories, service_area_radius_km,
        base_location_lat, base_location_lng, is_available, wallet_balance_paise
      )
      VALUES (
        '40000000-0000-0000-0000-000000000005',
        '${provUser5.id}',
        'approved',
        'https://storage.quotekaro.com/kyc/dinesh_doc.pdf',
        ARRAY['carpentry'],
        10,
        18.5200, 73.8500,
        true,
        5000 -- ₹50 (Below ₹100 threshold)
      );
    `);

    // 5. Scenario A: Planned Painting Job with 3 Bids
    console.log('🎨 Seeding Scenario A (Planned Painting Job + 3 Quotes for Blended Sort)...');
    const jobA = (await client.query(`
      INSERT INTO jobs (
        id, customer_id, category, urgency_type, description, area, lat, lng, status, photo_urls
      )
      VALUES (
        '50000000-0000-0000-0000-000000000001',
        '${customer1.id}',
        'painting',
        'planned',
        '3BHK Living room and balcony repainting with premium weatherproof finish',
        'Kothrud',
        18.5074, 73.8077,
        'quoted',
        ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80']
      )
      RETURNING id;
    `)).rows[0];

    // Quote 1: Mahesh (High rating 4.83, High price ₹12,000)
    await client.query(`
      INSERT INTO quotes (id, job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES (
        '60000000-0000-0000-0000-000000000001',
        '${jobA.id}',
        '${provProfile3.id}',
        1200000, -- ₹12,000
        120,
        'Premium Asian Paints Royale finish with 2-year guarantee and free cleanup.',
        'pending'
      );
    `);

    // Quote 2: Suresh (Moderate rating 4.80, Lowest price ₹8,000)
    await client.query(`
      INSERT INTO quotes (id, job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES (
        '60000000-0000-0000-0000-000000000002',
        '${jobA.id}',
        '${provProfile1.id}',
        800000, -- ₹8,000
        60,
        'Budget-friendly complete painting package. High-speed 3-person team.',
        'pending'
      );
    `);

    // Quote 3: Ramesh (Solid rating 4.73, Balanced price ₹9,500)
    await client.query(`
      INSERT INTO quotes (id, job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES (
        '60000000-0000-0000-0000-000000000003',
        '${jobA.id}',
        '${provProfile2.id}',
        950000, -- ₹9,500
        90,
        'Durable primer coat + 2 coats tractor emulsion. Material included.',
        'pending'
      );
    `);

    // 6. Scenario B: Urgent Plumbing Job (Direct auto-match booking)
    console.log('🚨 Seeding Scenario B (Urgent Plumbing Job with Direct Auto-Match)...');
    const jobB = (await client.query(`
      INSERT INTO jobs (
        id, customer_id, category, urgency_type, description, area, lat, lng, status
      )
      VALUES (
        '50000000-0000-0000-0000-000000000002',
        '${customer2.id}',
        'plumbing',
        'urgent',
        'Burst water pipe under kitchen sink — flooding floor urgently',
        'Baner',
        18.5204, 73.8567,
        'booked'
      )
      RETURNING id;
    `)).rows[0];

    const quoteB = (await client.query(`
      INSERT INTO quotes (id, job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES (
        '60000000-0000-0000-0000-000000000004',
        '${jobB.id}',
        '${provProfile2.id}',
        49900, -- Standard urgent rate ₹499
        15,
        'Emergency response auto-match.',
        'accepted'
      )
      RETURNING id;
    `)).rows[0];

    await client.query(`
      INSERT INTO bookings (
        id, job_id, quote_id, customer_id, provider_id, status, scheduled_at
      )
      VALUES (
        '70000000-0000-0000-0000-000000000002',
        '${jobB.id}',
        '${quoteB.id}',
        '${customer2.id}',
        '${provProfile2.id}',
        'en_route',
        NOW()
      );
    `);

    // 7. Scenario C: Completed Cash Booking with 10% Platform Commission
    console.log('💵 Seeding Scenario C (Completed Cash Booking with 10% Commission Deduction)...');
    const jobC = (await client.query(`
      INSERT INTO jobs (
        id, customer_id, category, urgency_type, description, area, lat, lng, status
      )
      VALUES (
        '50000000-0000-0000-0000-000000000003',
        '${customer3.id}',
        'electrical',
        'planned',
        'Main MCB switchboard tripping repair and circuit breaker upgrade',
        'Viman Nagar',
        18.5679, 73.9143,
        'completed'
      )
      RETURNING id;
    `)).rows[0];

    const quoteC = (await client.query(`
      INSERT INTO quotes (id, job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES (
        '60000000-0000-0000-0000-000000000005',
        '${jobC.id}',
        '${provProfile1.id}',
        150000, -- ₹1,500
        30,
        'Wiring inspection & MCB upgrade.',
        'accepted'
      )
      RETURNING id;
    `)).rows[0];

    const bookingC = (await client.query(`
      INSERT INTO bookings (
        id, job_id, quote_id, customer_id, provider_id, status,
        scheduled_at, completed_at, before_photo_url, after_photo_url
      )
      VALUES (
        '70000000-0000-0000-0000-000000000003',
        '${jobC.id}',
        '${quoteC.id}',
        '${customer3.id}',
        '${provProfile1.id}',
        'completed',
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '1 hour',
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80'
      )
      RETURNING id;
    `)).rows[0];

    // Record Cash Payment
    await client.query(`
      INSERT INTO payments (booking_id, amount_paise, method, status)
      VALUES ('${bookingC.id}', 150000, 'cash', 'completed');
    `);

    // Record Append-Only Wallet Commission Deduction (-₹150 / 10%)
    await client.query(`
      INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
      VALUES (
        '${provProfile1.id}',
        '${bookingC.id}',
        'commission_deduction',
        -15000, -- 10% of ₹1,500 = -₹150
        35000  -- ₹350
      );
    `);

    // Update provider profile wallet balance
    await client.query(`
      UPDATE provider_profiles
      SET wallet_balance_paise = 35000
      WHERE id = '${provProfile1.id}';
    `);

    // Record 3-axis Rating
    await client.query(`
      INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality, review_text)
      VALUES (
        '${bookingC.id}',
        5, 5, 5,
        'Excellent work by Suresh! Diagnosed the MCB short circuit immediately and fixed everything cleanly.'
      );
    `);

    // 8. Active Dispute for Admin Arbitration Center
    console.log('⚖️ Seeding Active Dispute for Admin Dashboard...');
    await client.query(`
      INSERT INTO disputes (
        id, booking_id, raised_by, reason, status
      )
      VALUES (
        '80000000-0000-0000-0000-000000000001',
        '${bookingC.id}',
        '${customer3.id}',
        'Provider resolved the MCB trip but left one sub-switch disconnected in bedroom 2. Requesting technician callback.',
        'open'
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Demo data successfully seeded!\n');
    console.log('===============================================================');
    console.log('📋 QUOTEKARO JURY PRESENTATION CREDENTIALS & DEMO SCENARIOS:');
    console.log('===============================================================');
    console.log('🔑 ADMIN PORTAL (http://localhost:5173):');
    console.log('   Phone: +919999900000 | Role: admin');
    console.log('   Actions: KYC verification queue, Dispute arbitration, City analytics');
    console.log('---------------------------------------------------------------');
    console.log('📱 MOBILE APP - CUSTOMER (http://localhost:8080 or Flutter):');
    console.log('   Customer 1: +919999900010 (Kavita) -> Scenario A (Quotes comparison)');
    console.log('   Customer 2: +919999900020 (Rahul)  -> Scenario B (Urgent auto-match)');
    console.log('   Customer 3: +919999900030 (Pooja)  -> Scenario C (Ratings & History)');
    console.log('   Default Dev OTP: 123456');
    console.log('---------------------------------------------------------------');
    console.log('🔨 MOBILE APP - PROVIDER:');
    console.log('   Provider 1: +919999900001 (Suresh Electrician - Active, Wallet ₹350)');
    console.log('   Provider 2: +919999900002 (Ramesh Plumber - Active, Wallet ₹750)');
    console.log('   Provider 3: +919999900003 (Mahesh Painter - Active, Wallet ₹1,200)');
    console.log('   Provider 4: +919999900004 (Ganesh - Pending KYC Gate demo)');
    console.log('   Provider 5: +919999900005 (Dinesh - Low Wallet Balance Gate demo)');
    console.log('   Default Dev OTP: 123456');
    console.log('===============================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding demo data:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed };
