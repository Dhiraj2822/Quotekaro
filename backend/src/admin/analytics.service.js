const db = require('../config/db');

/**
 * Retrieve system-wide analytics for Admin dashboard:
 * - Summary KPIs: total bookings, completed bookings, GMV, platform revenue, active providers
 * - City-wise breakdown: booking counts, GMV, active providers per city
 * - Category breakdown: jobs, bookings, GMV per service category
 * - Disputes overview: counts by status
 */
async function getAdminAnalytics() {
  // 1. Overall Booking & GMV Summary
  const bookingsSummaryRes = await db.query(`
    SELECT 
      COUNT(*) AS total_bookings,
      SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
      SUM(CASE WHEN b.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_bookings,
      SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
      SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN q.price_paise ELSE 0 END), 0) AS gmv_paise
    FROM bookings b
    LEFT JOIN quotes q ON b.quote_id = q.id
  `);

  const bookingStats = (bookingsSummaryRes.rows && bookingsSummaryRes.rows[0]) || {};
  const totalBookings = Number(bookingStats.total_bookings || 0);
  const completedBookings = Number(bookingStats.completed_bookings || 0);
  const inProgressBookings = Number(bookingStats.in_progress_bookings || 0);
  const confirmedBookings = Number(bookingStats.confirmed_bookings || 0);
  const cancelledBookings = Number(bookingStats.cancelled_bookings || 0);
  const gmvPaise = Number(bookingStats.gmv_paise || 0);
  // Universal 10% platform commission on completed GMV
  const platformRevenuePaise = Math.round(gmvPaise * 0.10);

  // 2. Active Providers & Users Summary
  const usersSummaryRes = await db.query(`
    SELECT 
      SUM(CASE WHEN u.role = 'customer' THEN 1 ELSE 0 END) AS total_customers,
      SUM(CASE WHEN u.role = 'provider' THEN 1 ELSE 0 END) AS total_providers,
      SUM(CASE WHEN u.role = 'provider' AND pp.kyc_status = 'approved' AND pp.is_available = true THEN 1 ELSE 0 END) AS active_providers,
      SUM(CASE WHEN u.role = 'provider' AND pp.kyc_status = 'pending' THEN 1 ELSE 0 END) AS pending_kyc_providers
    FROM users u
    LEFT JOIN provider_profiles pp ON pp.user_id = u.id
  `);

  const userStats = (usersSummaryRes.rows && usersSummaryRes.rows[0]) || {};
  const totalCustomers = Number(userStats.total_customers || 0);
  const totalProviders = Number(userStats.total_providers || 0);
  const activeProviders = Number(userStats.active_providers || 0);
  const pendingKycProviders = Number(userStats.pending_kyc_providers || 0);

  // 3. Disputes Summary
  let disputeStats = { open: 0, under_review: 0, resolved: 0, total: 0 };
  try {
    const disputesRes = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS under_review,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
      FROM disputes
    `);
    if (disputesRes.rows && disputesRes.rows[0]) {
      disputeStats = {
        total: Number(disputesRes.rows[0].total || 0),
        open: Number(disputesRes.rows[0].open || 0),
        under_review: Number(disputesRes.rows[0].under_review || 0),
        resolved: Number(disputesRes.rows[0].resolved || 0)
      };
    }
  } catch (e) {
    // Graceful fallback if disputes table is not queried
  }

  // 4. City-wise Breakdown (Booking counts & GMV)
  const cityBookingsRes = await db.query(`
    SELECT 
      COALESCE(u.city, 'Unknown') AS city,
      COUNT(b.id) AS booking_count,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN q.price_paise ELSE 0 END), 0) AS gmv_paise
    FROM bookings b
    JOIN users u ON u.id = b.customer_id
    LEFT JOIN quotes q ON q.id = b.quote_id
    GROUP BY u.city
    ORDER BY booking_count DESC
  `);

  // City-wise Active Providers
  const cityProvidersRes = await db.query(`
    SELECT 
      COALESCE(u.city, 'Unknown') AS city,
      COUNT(*) AS active_providers
    FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.kyc_status = 'approved' AND pp.is_available = true
    GROUP BY u.city
  `);

  const cityProviderMap = {};
  (cityProvidersRes.rows || []).forEach(row => {
    cityProviderMap[row.city] = Number(row.active_providers || 0);
  });

  const cityMap = {};
  (cityBookingsRes.rows || []).forEach(row => {
    const city = row.city || 'Unknown';
    cityMap[city] = {
      city,
      booking_count: Number(row.booking_count || 0),
      gmv_paise: Number(row.gmv_paise || 0),
      active_providers: cityProviderMap[city] || 0
    };
  });

  // Include any cities where active providers exist but no bookings yet
  Object.keys(cityProviderMap).forEach(city => {
    if (!cityMap[city]) {
      cityMap[city] = {
        city,
        booking_count: 0,
        gmv_paise: 0,
        active_providers: cityProviderMap[city]
      };
    }
  });

  const cityWise = Object.values(cityMap);

  // 5. Category Breakdown
  const categoryRes = await db.query(`
    SELECT 
      j.category,
      COUNT(DISTINCT j.id) AS job_count,
      COUNT(DISTINCT b.id) AS booking_count,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN q.price_paise ELSE 0 END), 0) AS gmv_paise
    FROM jobs j
    LEFT JOIN bookings b ON b.job_id = j.id
    LEFT JOIN quotes q ON b.quote_id = q.id
    GROUP BY j.category
    ORDER BY booking_count DESC, job_count DESC
  `);

  const categoryBreakdown = (categoryRes.rows || []).map(row => ({
    category: row.category,
    job_count: Number(row.job_count || 0),
    booking_count: Number(row.booking_count || 0),
    gmv_paise: Number(row.gmv_paise || 0)
  }));

  return {
    summary: {
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      in_progress_bookings: inProgressBookings,
      confirmed_bookings: confirmedBookings,
      cancelled_bookings: cancelledBookings,
      gmv_paise: gmvPaise,
      platform_revenue_paise: platformRevenuePaise,
      active_providers: activeProviders,
      total_providers: totalProviders,
      pending_kyc_providers: pendingKycProviders,
      total_customers: totalCustomers
    },
    city_wise: cityWise,
    category_breakdown: categoryBreakdown,
    disputes_overview: disputeStats
  };
}

module.exports = {
  getAdminAnalytics
};
