const db = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { autoMatchUrgentJob } = require('../quotes/quotes.service');

/**
 * Basic string sanitizer to strip harmful script / HTML tags per 07_SECURITY.md §4
 */
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Create a new job posted by a customer
 * For urgent jobs, automatically attempts immediate provider auto-match per 03_SYSTEM_DESIGN.md §4
 */
async function createJob(customerId, jobData) {
  const sanitizedDescription = sanitizeText(jobData.description);
  const sanitizedArea = sanitizeText(jobData.area);

  const res = await db.query(
    `INSERT INTO jobs (
      customer_id, category, urgency_type, description, photo_urls, area, lat, lng, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
    RETURNING *`,
    [
      customerId,
      jobData.category,
      jobData.urgency_type,
      sanitizedDescription,
      jobData.photo_urls || [],
      sanitizedArea,
      jobData.lat,
      jobData.lng
    ]
  );

  const job = res.rows[0];

  // Fetch customer details to return full context
  const userRes = await db.query(
    `SELECT name as customer_name, phone_number as customer_phone FROM users WHERE id = $1`,
    [customerId]
  );
  const user = userRes.rows[0] || {};

  // For urgent jobs, attempt immediate auto-matching per Scenario B
  let booking = null;
  if (job.urgency_type === 'urgent') {
    try {
      booking = await autoMatchUrgentJob(job.id);
      if (booking) {
        job.status = 'booked';
      }
    } catch (err) {
      // If auto-match fails (e.g. no eligible provider online or during isolated unit tests), keep job open
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Auto-match attempt skipped:', err.message);
      }
    }
  }

  return {
    ...job,
    customer_name: user.customer_name,
    customer_phone: user.customer_phone,
    ...(booking ? { booking } : {})
  };
}

/**
 * Get single job by ID with authorization checks (Test Case 7)
 */
async function getJobById(jobId, currentUser) {
  const res = await db.query(
    `SELECT j.*, u.name as customer_name, u.phone_number as customer_phone
     FROM jobs j
     JOIN users u ON u.id = j.customer_id
     WHERE j.id = $1`,
    [jobId]
  );

  if (!res.rows || res.rows.length === 0) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const job = res.rows[0];

  // Authorization Check (07_SECURITY.md §1 & 08_TESTING_STRATEGY.md Test Case 7):
  // A customer can ONLY view their own jobs
  if (currentUser.role === 'customer' && job.customer_id !== currentUser.id) {
    const error = new Error('Access forbidden: Cannot view another customer\'s job');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  return job;
}

/**
 * Get customer jobs list with RBAC enforcement
 */
async function getJobs({ customer_id } = {}, currentUser) {
  // Authorization Check (07_SECURITY.md §1 & 08_TESTING_STRATEGY.md Test Case 7):
  let targetCustomerId;

  if (currentUser.role === 'customer') {
    if (customer_id && customer_id !== currentUser.id) {
      const error = new Error('Access forbidden: Cannot view another customer\'s jobs');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    targetCustomerId = currentUser.id;
  } else if (currentUser.role === 'admin') {
    targetCustomerId = customer_id || null;
  } else if (currentUser.role === 'provider') {
    // Providers use /jobs/nearby for open jobs; they cannot browse a specific customer's private history
    const error = new Error('Access forbidden: Providers cannot browse customer job lists');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  let query = `
    SELECT j.*, u.name as customer_name, u.phone_number as customer_phone
    FROM jobs j
    JOIN users u ON u.id = j.customer_id
  `;
  const params = [];

  if (targetCustomerId) {
    query += ` WHERE j.customer_id = $1`;
    params.push(targetCustomerId);
  }

  query += ` ORDER BY j.created_at DESC`;

  const res = await db.query(query, params);
  return res.rows || [];
}

/**
 * Get nearby open jobs matching category, service area, and radius
 * Used by providers to view their job feed per 05_API_SPEC.md & 09_MODULE_BUILD_PLAN.md
 */
async function getNearbyJobs({ category, lat, lng, radius_km, area } = {}, currentUser) {
  let searchCategory = category || null;
  let searchLat = lat !== undefined && lat !== null ? Number(lat) : null;
  let searchLng = lng !== undefined && lng !== null ? Number(lng) : null;
  let searchRadius = radius_km !== undefined && radius_km !== null ? Number(radius_km) : 25;

  // If parameters are omitted and request is from a provider, use provider profile defaults
  if ((!searchCategory || searchLat === null || searchLng === null) && currentUser.role === 'provider') {
    const profileRes = await db.query(
      `SELECT * FROM provider_profiles WHERE user_id = $1`,
      [currentUser.id]
    );

    if (profileRes.rows && profileRes.rows.length > 0) {
      const profile = profileRes.rows[0];
      if (!searchCategory && profile.categories && profile.categories.length > 0) {
        searchCategory = profile.categories;
      }
      if (searchLat === null && profile.base_location_lat != null) {
        searchLat = Number(profile.base_location_lat);
      }
      if (searchLng === null && profile.base_location_lng != null) {
        searchLng = Number(profile.base_location_lng);
      }
      if (radius_km === undefined && profile.service_area_radius_km != null) {
        searchRadius = Number(profile.service_area_radius_km);
      }
    }
  }

  // Query all open jobs
  let query = `
    SELECT j.*, u.name as customer_name, u.phone_number as customer_phone
    FROM jobs j
    JOIN users u ON u.id = j.customer_id
    WHERE j.status = 'open'
  `;
  const params = [];

  if (searchCategory) {
    if (Array.isArray(searchCategory)) {
      query += ` AND j.category = ANY($${params.length + 1})`;
      params.push(searchCategory);
    } else {
      query += ` AND j.category = $${params.length + 1}`;
      params.push(searchCategory);
    }
  }

  const res = await db.query(query, params);
  let jobs = res.rows || [];

  // Filter and sort by distance if geographic center is provided
  if (searchLat !== null && searchLng !== null) {
    jobs = jobs
      .map(job => {
        const dist = calculateDistanceKm(searchLat, searchLng, Number(job.lat), Number(job.lng));
        return {
          ...job,
          distance_km: dist
        };
      })
      .filter(job => job.distance_km === null || job.distance_km <= searchRadius)
      .sort((a, b) => {
        // Urgent jobs first, then shortest distance
        if (a.urgency_type === 'urgent' && b.urgency_type !== 'urgent') return -1;
        if (b.urgency_type === 'urgent' && a.urgency_type !== 'urgent') return 1;
        return (a.distance_km || 0) - (b.distance_km || 0);
      });
  } else {
    jobs = jobs.map(job => ({ ...job, distance_km: null }));
  }

  return jobs;
}

module.exports = {
  createJob,
  getJobById,
  getJobs,
  getNearbyJobs,
  calculateDistanceKm
};
