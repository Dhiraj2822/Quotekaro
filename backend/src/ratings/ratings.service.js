const db = require('../config/db');
const { sanitizeText } = require('../utils/sanitize');

/**
 * Submit 3-axis rating for a completed booking per 05_API_SPEC.md & 08_TESTING_STRATEGY.md §2.10.
 * Atomically updates the provider's denormalized average scores.
 */
async function submitRating({
  bookingId,
  user,
  ratingHonesty,
  ratingPunctuality,
  ratingQuality,
  reviewText = null
}) {
  // 1. Fetch booking with customer and provider info
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, b.provider_id, b.status, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  // 2. Authorization check (08_TESTING_STRATEGY.md §2.7)
  // Only customer who booked the service (or admin) can submit a rating
  if (user) {
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const error = new Error('You are not authorized to rate this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    if (user.role === 'provider') {
      const error = new Error('Providers cannot rate bookings');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  // 3. Status check: Booking must be 'completed'
  if (booking.status !== 'completed') {
    const error = new Error('Cannot rate a booking that has not been completed');
    error.statusCode = 400;
    error.code = 'BOOKING_NOT_COMPLETED';
    throw error;
  }

  // 4. Duplicate rating check
  const existingRes = await db.query(
    'SELECT id FROM ratings WHERE booking_id = $1',
    [bookingId]
  );

  if (existingRes.rowCount > 0) {
    const error = new Error('Booking has already been rated');
    error.statusCode = 409;
    error.code = 'ALREADY_RATED';
    throw error;
  }

  // 5. Insert rating
  const cleanReview = reviewText ? sanitizeText(reviewText) : null;
  const insertRes = await db.query(
    `INSERT INTO ratings (
       booking_id,
       rating_honesty,
       rating_punctuality,
       rating_quality,
       review_text
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, rating_honesty, rating_punctuality, rating_quality, review_text, created_at, updated_at`,
    [bookingId, ratingHonesty, ratingPunctuality, ratingQuality, cleanReview]
  );

  const rating = insertRes.rows[0];

  // 6. Recalculate denormalized averages across all ratings for this provider (Test Case 10)
  const avgRes = await db.query(
    `SELECT 
       ROUND(AVG(r.rating_honesty)::numeric, 1) AS avg_honesty,
       ROUND(AVG(r.rating_punctuality)::numeric, 1) AS avg_punctuality,
       ROUND(AVG(r.rating_quality)::numeric, 1) AS avg_quality,
       COUNT(r.id) AS total_ratings
     FROM ratings r
     JOIN bookings b ON b.id = r.booking_id
     WHERE b.provider_id = $1`,
    [booking.provider_id]
  );

  const stats = avgRes.rows[0];
  const avgHonesty = stats.avg_honesty != null ? parseFloat(stats.avg_honesty) : ratingHonesty;
  const avgPunctuality = stats.avg_punctuality != null ? parseFloat(stats.avg_punctuality) : ratingPunctuality;
  const avgQuality = stats.avg_quality != null ? parseFloat(stats.avg_quality) : ratingQuality;
  const totalRatings = parseInt(stats.total_ratings, 10) || 1;

  // 7. Update provider_profiles with the new denormalized averages
  await db.query(
    `UPDATE provider_profiles
     SET 
       avg_rating_honesty = $1,
       avg_rating_punctuality = $2,
       avg_rating_quality = $3,
       updated_at = NOW()
     WHERE id = $4`,
    [avgHonesty, avgPunctuality, avgQuality, booking.provider_id]
  );

  return {
    rating: {
      id: rating.id,
      booking_id: rating.booking_id,
      rating_honesty: rating.rating_honesty,
      rating_punctuality: rating.rating_punctuality,
      rating_quality: rating.rating_quality,
      review_text: rating.review_text,
      created_at: rating.created_at
    },
    provider_averages: {
      provider_id: booking.provider_id,
      avg_rating_honesty: avgHonesty,
      avg_rating_punctuality: avgPunctuality,
      avg_rating_quality: avgQuality,
      total_ratings: totalRatings
    }
  };
}

/**
 * Get rating for a specific booking.
 */
async function getRatingByBookingId({ bookingId, user }) {
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  if (user && user.role !== 'admin') {
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const error = new Error('You are not authorized to view this rating');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    if (user.role === 'provider' && booking.provider_user_id !== user.id) {
      const error = new Error('You are not authorized to view this rating');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const ratingRes = await db.query(
    `SELECT id, booking_id, rating_honesty, rating_punctuality, rating_quality, review_text, created_at
     FROM ratings
     WHERE booking_id = $1`,
    [bookingId]
  );

  return ratingRes.rows[0] || null;
}

/**
 * Get provider ratings summary and reviews list (for Provider Ratings Dashboard).
 */
async function getProviderRatings({ providerId, limit = 20, offset = 0 }) {
  // Verify provider exists
  const profileRes = await db.query(
    `SELECT pp.id, pp.avg_rating_honesty, pp.avg_rating_punctuality, pp.avg_rating_quality, u.name
     FROM provider_profiles pp
     JOIN users u ON pp.user_id = u.id
     WHERE pp.id = $1`,
    [providerId]
  );

  if (profileRes.rowCount === 0) {
    const error = new Error('Provider not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const profile = profileRes.rows[0];

  const reviewsRes = await db.query(
    `SELECT 
       r.id,
       r.booking_id,
       r.rating_honesty,
       r.rating_punctuality,
       r.rating_quality,
       r.review_text,
       r.created_at,
       c.name AS customer_name,
       j.category AS job_category
     FROM ratings r
     JOIN bookings b ON b.id = r.booking_id
     JOIN jobs j ON b.job_id = j.id
     JOIN users c ON b.customer_id = c.id
     WHERE b.provider_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [providerId, limit, offset]
  );

  return {
    provider_id: profile.id,
    provider_name: profile.name,
    averages: {
      avg_rating_honesty: profile.avg_rating_honesty != null ? parseFloat(profile.avg_rating_honesty) : 5.0,
      avg_rating_punctuality: profile.avg_rating_punctuality != null ? parseFloat(profile.avg_rating_punctuality) : 5.0,
      avg_rating_quality: profile.avg_rating_quality != null ? parseFloat(profile.avg_rating_quality) : 5.0,
    },
    reviews: reviewsRes.rows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      customer_name: row.customer_name,
      job_category: row.job_category,
      rating_honesty: row.rating_honesty,
      rating_punctuality: row.rating_punctuality,
      rating_quality: row.rating_quality,
      review_text: row.review_text,
      created_at: row.created_at
    }))
  };
}

module.exports = {
  submitRating,
  getRatingByBookingId,
  getProviderRatings
};
