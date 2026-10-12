const db = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { getCategoryBounds } = require('../admin/category_bounds.service');

// Pre-set platform rates per category for instant urgent job routing (03_SYSTEM_DESIGN.md §4)
const PLATFORM_RATES_PAISE = {
  plumbing: 49900,   // ₹499
  electrical: 49900, // ₹499
  cleaning: 79900,   // ₹799
  painting: 149900   // ₹1499
};

/**
 * Calculate blended score for quotes balancing provider rating and quote price.
 * 05_API_SPEC.md & 01_PRD.md: Default response order must be the blended score
 * to prevent a race to the bottom while maintaining competitive pricing.
 */
function calculateBlendedScores(quotes) {
  if (!quotes || quotes.length === 0) return [];

  const minPrice = Math.min(...quotes.map((q) => q.price_paise));

  return quotes.map((q) => {
    // Determine overall rating (1.0 to 5.0)
    const validRatings = [
      q.avg_rating_honesty,
      q.avg_rating_punctuality,
      q.avg_rating_quality
    ]
      .map((r) => (r !== null && r !== undefined ? parseFloat(r) : null))
      .filter((r) => r !== null && !isNaN(r));

    const overallRating =
      validRatings.length > 0
        ? validRatings.reduce((acc, val) => acc + val, 0) / validRatings.length
        : 4.0; // Baseline neutral rating for new providers

    const ratingScore = overallRating / 5.0; // 0.2 to 1.0
    const priceScore = minPrice / q.price_paise; // (0, 1]

    // 50% weight on rating, 50% weight on price competitiveness
    const blendedScore = Number(((0.5 * ratingScore) + (0.5 * priceScore)).toFixed(4));

    return {
      ...q,
      overall_rating: Number(overallRating.toFixed(2)),
      blended_score: blendedScore
    };
  });
}

/**
 * Provider submits a quote for an open/quoted job
 */
async function submitQuote({ jobId, userId, pricePaise, etaMinutes, message }) {
  // 1. Verify provider profile exists and is approved (KYC gate)
  const providerRes = await db.query(
    'SELECT id, kyc_status, is_available FROM provider_profiles WHERE user_id = $1',
    [userId]
  );

  if (providerRes.rowCount === 0 || providerRes.rows[0].kyc_status !== 'approved') {
    const error = new Error('Only KYC-approved providers can submit quotes');
    error.statusCode = 403;
    error.code = 'KYC_NOT_APPROVED';
    throw error;
  }

  const providerProfile = providerRes.rows[0];

  // Wallet balance check per 08_TESTING_STRATEGY.md §2.6
  try {
    const balRes = await db.query(
      'SELECT wallet_balance_paise FROM provider_profiles WHERE user_id = $1',
      [userId]
    );
    if (balRes.rowCount > 0 && balRes.rows[0].wallet_balance_paise !== undefined && balRes.rows[0].wallet_balance_paise !== null) {
      const minThreshold = parseInt(process.env.PROVIDER_MIN_WALLET_BALANCE_PAISE || '10000', 10);
      const currentBalance = parseInt(balRes.rows[0].wallet_balance_paise, 10);
      if (currentBalance < minThreshold) {
        const error = new Error('Wallet balance is below minimum threshold (₹100). Please top up your wallet to submit quotes.');
        error.statusCode = 403;
        error.code = 'INSUFFICIENT_WALLET_BALANCE';
        throw error;
      }
    }
  } catch (err) {
    if (err.code === 'INSUFFICIENT_WALLET_BALANCE') throw err;
  }

  // 2. Verify job exists and is open for quotes
  const jobRes = await db.query(
    'SELECT id, customer_id, category, status FROM jobs WHERE id = $1',
    [jobId]
  );

  if (jobRes.rowCount === 0) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const job = jobRes.rows[0];
  if (job.status !== 'open' && job.status !== 'quoted') {
    const error = new Error('Job is no longer open for quotes');
    error.statusCode = 400;
    error.code = 'JOB_NOT_OPEN';
    throw error;
  }

  // Verify price is within category bounds per 07_SECURITY.md §4 & 06_UIUX_SPEC.md §4
  const bounds = getCategoryBounds(job.category);
  if (bounds) {
    if (pricePaise < bounds.min_price_paise || pricePaise > bounds.max_price_paise) {
      const minRs = Math.round(bounds.min_price_paise / 100);
      const maxRs = Math.round(bounds.max_price_paise / 100);
      const error = new Error(`Quote price must be between ₹${minRs} and ₹${maxRs} for ${job.category} category`);
      error.statusCode = 400;
      error.code = 'PRICE_OUT_OF_BOUNDS';
      throw error;
    }
  }

  // 3. Enforce one quote per provider per job (DB constraint + API check)
  const existingQuoteRes = await db.query(
    'SELECT id FROM quotes WHERE job_id = $1 AND provider_id = $2',
    [jobId, providerProfile.id]
  );

  if (existingQuoteRes.rowCount > 0) {
    const error = new Error('You have already submitted a quote for this job');
    error.statusCode = 409;
    error.code = 'DUPLICATE_QUOTE';
    throw error;
  }

  // 4. Insert quote and update job status to 'quoted' if 'open'
  const quoteInsertRes = await db.query(
    `INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, job_id, provider_id, price_paise, eta_minutes, message, status, created_at, updated_at`,
    [jobId, providerProfile.id, pricePaise, etaMinutes || null, message || null]
  );

  if (job.status === 'open') {
    await db.query(
      `UPDATE jobs SET status = 'quoted', updated_at = NOW() WHERE id = $1 AND status = 'open'`,
      [jobId]
    );
  }

  return quoteInsertRes.rows[0];
}

/**
 * Retrieve all quotes for a job, sorted by blended score or price
 */
async function getQuotesForJob({ jobId, user, sort = 'blended' }) {
  // 1. Verify job exists
  const jobRes = await db.query(
    'SELECT id, customer_id, category, status FROM jobs WHERE id = $1',
    [jobId]
  );

  if (jobRes.rowCount === 0) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const job = jobRes.rows[0];

  // 2. Authorization check: Customer can only view quotes for their own job (Test Case 7)
  if (user.role === 'customer' && job.customer_id !== user.id) {
    const error = new Error('You are not authorized to view quotes for this job');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 3. Query quotes with provider profile and user details
  let query = `
    SELECT 
      q.id,
      q.job_id,
      q.provider_id,
      q.price_paise,
      q.eta_minutes,
      q.message,
      q.status,
      q.created_at,
      q.updated_at,
      pp.avg_rating_honesty,
      pp.avg_rating_punctuality,
      pp.avg_rating_quality,
      pp.service_area_radius_km,
      u.name AS provider_name,
      u.profile_photo_url AS provider_profile_photo_url
    FROM quotes q
    JOIN provider_profiles pp ON q.provider_id = pp.id
    JOIN users u ON pp.user_id = u.id
    WHERE q.job_id = $1
  `;
  const params = [jobId];

  // If a provider is fetching, only show their own quote
  if (user.role === 'provider') {
    query += ` AND pp.user_id = $2`;
    params.push(user.id);
  }

  const quotesRes = await db.query(query, params);
  const rawQuotes = quotesRes.rows;

  if (rawQuotes.length === 0) {
    return [];
  }

  // 4. Calculate blended score
  const quotesWithScores = calculateBlendedScores(rawQuotes);

  // 5. Sort quotes: either price_asc or blended (default)
  if (sort === 'price_asc') {
    quotesWithScores.sort((a, b) => a.price_paise - b.price_paise);
  } else {
    quotesWithScores.sort((a, b) => {
      if (b.blended_score !== a.blended_score) {
        return b.blended_score - a.blended_score;
      }
      return a.price_paise - b.price_paise;
    });
  }

  // Format response matching API specification
  return quotesWithScores.map((q) => ({
    id: q.id,
    job_id: q.job_id,
    provider_id: q.provider_id,
    price_paise: q.price_paise,
    eta_minutes: q.eta_minutes,
    message: q.message,
    status: q.status,
    blended_score: q.blended_score,
    provider: {
      id: q.provider_id,
      name: q.provider_name,
      profile_photo_url: q.provider_profile_photo_url,
      avg_rating_honesty: q.avg_rating_honesty ? parseFloat(q.avg_rating_honesty) : null,
      avg_rating_punctuality: q.avg_rating_punctuality ? parseFloat(q.avg_rating_punctuality) : null,
      avg_rating_quality: q.avg_rating_quality ? parseFloat(q.avg_rating_quality) : null,
      overall_rating: q.overall_rating,
      service_area_radius_km: q.service_area_radius_km
    },
    created_at: q.created_at,
    updated_at: q.updated_at
  }));
}

/**
 * Customer accepts a quote -> creates booking, rejects other quotes, updates job status
 */
async function acceptQuote({ jobId, quoteId, user }) {
  // 1. Verify job exists
  const jobRes = await db.query(
    'SELECT id, customer_id, status FROM jobs WHERE id = $1',
    [jobId]
  );

  if (jobRes.rowCount === 0) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const job = jobRes.rows[0];

  // 2. Authorization check: only job owner or admin can accept quote
  if (user.role === 'customer' && job.customer_id !== user.id) {
    const error = new Error('You are not authorized to accept quotes for this job');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 3. Job status check
  if (job.status !== 'open' && job.status !== 'quoted') {
    const error = new Error('Job is already booked, completed or cancelled');
    error.statusCode = 400;
    error.code = 'JOB_ALREADY_BOOKED';
    throw error;
  }

  // 4. Verify quote belongs to this job and is pending
  const quoteRes = await db.query(
    'SELECT id, job_id, provider_id, price_paise, status FROM quotes WHERE id = $1 AND job_id = $2',
    [quoteId, jobId]
  );

  if (quoteRes.rowCount === 0) {
    const error = new Error('Quote not found for this job');
    error.statusCode = 404;
    error.code = 'INVALID_QUOTE';
    throw error;
  }

  const quote = quoteRes.rows[0];
  if (quote.status !== 'pending') {
    const error = new Error('Quote is no longer pending');
    error.statusCode = 400;
    error.code = 'QUOTE_NOT_PENDING';
    throw error;
  }

  // 5. Execute transaction: update quotes, create booking, update job status
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Mark selected quote as accepted
    await client.query(
      `UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [quote.id]
    );

    // Mark all other quotes for this job as rejected
    await client.query(
      `UPDATE quotes SET status = 'rejected', updated_at = NOW() WHERE job_id = $1 AND id != $2`,
      [job.id, quote.id]
    );

    // Create booking
    const bookingRes = await client.query(
      `INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING id, job_id, quote_id, customer_id, provider_id, status, scheduled_at, completed_at, created_at, updated_at`,
      [job.id, quote.id, job.customer_id, quote.provider_id]
    );

    // Update job status to booked
    await client.query(
      `UPDATE jobs SET status = 'booked', updated_at = NOW() WHERE id = $1`,
      [job.id]
    );

    await client.query('COMMIT');
    return bookingRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Urgent Job Auto-Match Logic per 03_SYSTEM_DESIGN.md §4 & 08_TESTING_STRATEGY.md Scenario B:
 * System auto-matches the nearest available, highest-rated provider at pre-set platform rate.
 * Bypasses the quote comparison flow and creates confirmed booking immediately.
 */
async function autoMatchUrgentJob(jobId) {
  // 1. Fetch job
  const jobRes = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (jobRes.rowCount === 0) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  const job = jobRes.rows[0];

  if (job.urgency_type !== 'urgent') {
    const error = new Error('Only urgent jobs can be auto-matched');
    error.statusCode = 400;
    error.code = 'NOT_URGENT_JOB';
    throw error;
  }

  if (job.status !== 'open') {
    if (job.status === 'booked') {
      const existingBookingRes = await db.query(
        'SELECT * FROM bookings WHERE job_id = $1',
        [jobId]
      );
      if (existingBookingRes.rowCount > 0) {
        return existingBookingRes.rows[0];
      }
    }
    const error = new Error('Job is not open for matching');
    error.statusCode = 400;
    error.code = 'JOB_NOT_OPEN';
    throw error;
  }

  // 2. Query available, KYC-approved providers who service this category
  const providersRes = await db.query(`
    SELECT 
      pp.*,
      u.name,
      u.phone_number,
      u.profile_photo_url
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.kyc_status = 'approved'
      AND pp.is_available = true
      AND $1 = ANY(pp.categories)
  `, [job.category]);

  let candidates = providersRes.rows || [];
  if (candidates.length === 0) {
    return null;
  }

  // Filter out candidates with insufficient wallet balance if tracked per 08_TESTING_STRATEGY.md §2.6
  const minThreshold = parseInt(process.env.PROVIDER_MIN_WALLET_BALANCE_PAISE || '10000', 10);
  candidates = candidates.filter((p) => {
    if (p.wallet_balance_paise !== undefined && p.wallet_balance_paise !== null) {
      return parseInt(p.wallet_balance_paise, 10) >= minThreshold;
    }
    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  // 3. Score candidates by distance and multi-axis rating
  const evaluated = candidates.map((p) => {
    let distanceKm = null;
    if (job.lat != null && job.lng != null && p.base_location_lat != null && p.base_location_lng != null) {
      distanceKm = calculateDistanceKm(
        Number(job.lat),
        Number(job.lng),
        Number(p.base_location_lat),
        Number(p.base_location_lng)
      );
    }

    const validRatings = [
      p.avg_rating_honesty,
      p.avg_rating_punctuality,
      p.avg_rating_quality
    ]
      .map((r) => (r != null ? parseFloat(r) : null))
      .filter((r) => r != null && !isNaN(r));

    const overallRating =
      validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : 4.0;

    return {
      ...p,
      distance_km: distanceKm,
      overall_rating: overallRating,
      max_radius: p.service_area_radius_km || 25
    };
  });

  // Filter candidates within radius
  const eligible = evaluated.filter((p) => p.distance_km === null || p.distance_km <= p.max_radius);

  if (eligible.length === 0) {
    return null;
  }

  // Sort: closest distance first, then highest rating
  eligible.sort((a, b) => {
    if (a.distance_km !== null && b.distance_km !== null) {
      if (a.distance_km !== b.distance_km) {
        return a.distance_km - b.distance_km;
      }
    }
    return b.overall_rating - a.overall_rating;
  });

  const matchedProvider = eligible[0];
  const platformPricePaise = PLATFORM_RATES_PAISE[job.category] || 49900;
  const etaMinutes =
    matchedProvider.distance_km != null
      ? Math.max(15, Math.round(matchedProvider.distance_km * 4))
      : 20;

  // 4. Create auto-accepted quote and confirmed booking in transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const quoteRes = await client.query(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ($1, $2, $3, $4, $5, 'accepted')
      RETURNING *
    `, [
      job.id,
      matchedProvider.id,
      platformPricePaise,
      etaMinutes,
      'Auto-matched at standard platform rate for urgent job'
    ]);
    const quote = quoteRes.rows[0];

    const bookingRes = await client.query(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status, scheduled_at)
      VALUES ($1, $2, $3, $4, 'confirmed', NULL)
      RETURNING *
    `, [
      job.id,
      quote.id,
      job.customer_id,
      matchedProvider.id
    ]);
    const booking = bookingRes.rows[0];

    await client.query(`
      UPDATE jobs SET status = 'booked', updated_at = NOW() WHERE id = $1
    `, [job.id]);

    await client.query('COMMIT');

    return {
      ...booking,
      quote,
      provider: {
        id: matchedProvider.id,
        name: matchedProvider.name,
        phone_number: matchedProvider.phone_number,
        profile_photo_url: matchedProvider.profile_photo_url,
        overall_rating: Number(matchedProvider.overall_rating.toFixed(2)),
        distance_km: matchedProvider.distance_km
      }
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  PLATFORM_RATES_PAISE,
  calculateBlendedScores,
  submitQuote,
  getQuotesForJob,
  acceptQuote,
  autoMatchUrgentJob
};
