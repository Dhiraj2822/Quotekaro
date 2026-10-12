const db = require('../config/db');

/**
 * Basic HTML/script tag sanitizer to prevent stored XSS per 07_SECURITY.md §4
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

/**
 * Find user by UUID
 */
async function getUserById(id) {
  const res = await db.query(
    `SELECT id, phone_number, role, name, email, profile_photo_url, city, is_active, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Update user profile
 */
async function updateUser(id, data) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIdx++}`);
    values.push(sanitizeText(data.name));
  }

  if (data.email !== undefined) {
    fields.push(`email = $${paramIdx++}`);
    values.push(data.email ? data.email.toLowerCase().trim() : null);
  }

  if (data.city !== undefined) {
    fields.push(`city = $${paramIdx++}`);
    values.push(sanitizeText(data.city));
  }

  if (data.profile_photo_url !== undefined) {
    fields.push(`profile_photo_url = $${paramIdx++}`);
    values.push(data.profile_photo_url);
  }

  if (fields.length === 0) {
    return getUserById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const queryText = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING id, phone_number, role, name, email, profile_photo_url, city, is_active, created_at, updated_at
  `;

  const res = await db.query(queryText, values);
  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

module.exports = {
  getUserById,
  updateUser,
  sanitizeText
};
