const db = require('../config/db');

const memoryAddresses = new Map();

async function getAddresses(userId) {
  try {
    const res = await db.query(
      'SELECT * FROM customer_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Memory fallback
  }

  const list = memoryAddresses.get(userId) || [
    {
      id: `addr-1-${userId.slice(0, 8)}`,
      user_id: userId,
      label: 'Home',
      address_line1: 'Flat 402, Rohan Nilay Phase 2',
      address_line2: 'Near Aundh Telephone Exchange',
      landmark: 'Next to Westend Mall',
      area: 'Aundh',
      city: 'Pune',
      pincode: '411007',
      lat: 18.5583,
      lng: 73.8078,
      is_default: true,
      created_at: new Date().toISOString()
    },
    {
      id: `addr-2-${userId.slice(0, 8)}`,
      user_id: userId,
      label: 'Office',
      address_line1: 'Quadron Business Park, Tower 4, 3rd Floor',
      address_line2: 'Phase 2, Rajiv Gandhi Infotech Park',
      landmark: 'Opposite Infosys Gate 2',
      area: 'Hinjewadi',
      city: 'Pune',
      pincode: '411057',
      lat: 18.5913,
      lng: 73.7389,
      is_default: false,
      created_at: new Date().toISOString()
    }
  ];
  return list;
}

async function addAddress(userId, data) {
  const newAddr = {
    id: `addr-${Date.now()}`,
    user_id: userId,
    label: data.label || 'Home',
    address_line1: data.address_line1,
    address_line2: data.address_line2 || '',
    landmark: data.landmark || '',
    area: data.area || 'Pune',
    city: data.city || 'Pune',
    pincode: data.pincode || '411001',
    lat: data.lat || 18.5204,
    lng: data.lng || 73.8567,
    is_default: data.is_default || false,
    created_at: new Date().toISOString()
  };

  try {
    const res = await db.query(`
      INSERT INTO customer_addresses (
        user_id, label, address_line1, address_line2, landmark, area, city, pincode, lat, lng, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId,
      newAddr.label,
      newAddr.address_line1,
      newAddr.address_line2,
      newAddr.landmark,
      newAddr.area,
      newAddr.city,
      newAddr.pincode,
      newAddr.lat,
      newAddr.lng,
      newAddr.is_default
    ]);
    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }
  } catch (err) {
    // Memory
  }

  const existing = memoryAddresses.get(userId) || [];
  existing.unshift(newAddr);
  memoryAddresses.set(userId, existing);
  return newAddr;
}

async function deleteAddress(userId, addressId) {
  try {
    await db.query('DELETE FROM customer_addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
  } catch (err) {
    // Memory
  }
  const existing = memoryAddresses.get(userId) || [];
  memoryAddresses.set(userId, existing.filter((a) => a.id !== addressId));
  return { success: true };
}

module.exports = {
  getAddresses,
  addAddress,
  deleteAddress
};
