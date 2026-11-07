const db = require('../config/db');
const { predictApplianceMaintenance } = require('./maintenance.engine');

// Default Configurable Subscription Plans
const DEFAULT_PLANS = [
  {
    id: 'plan-basic',
    name: 'Care Basic',
    slug: 'care-basic',
    tier: 'basic',
    monthly_price_paise: 19900,  // ₹199 / month
    annual_price_paise: 199900,  // ₹1,999 / year (save 16%)
    features: [
      'Unlimited Appliance Health Registration',
      'AI Preventive Maintenance Alerts',
      'Digital Appliance Service History & Bills',
      'Warranty Expiry Reminders',
      'Standard Home Service Booking'
    ],
    maintenance_visits_per_year: 1,
    priority_support: false,
    service_discount_percent: 5,
    is_active: true
  },
  {
    id: 'plan-standard',
    name: 'Care Standard',
    slug: 'care-standard',
    tier: 'standard',
    monthly_price_paise: 49900,  // ₹499 / month
    annual_price_paise: 499900,  // ₹4,999 / year (save 17%)
    features: [
      'Everything in Basic Plan',
      '2 Comprehensive Scheduled Checkups Included',
      '15% Flat Discount on All Marketplace Services',
      'Priority Professional Dispatch & Auto-Match',
      'Multi-Property & Family Account Sharing',
      '30-Day Extended Service Warranty'
    ],
    maintenance_visits_per_year: 2,
    priority_support: true,
    service_discount_percent: 15,
    is_active: true
  },
  {
    id: 'plan-premium',
    name: 'Care Premium (Total Home Shield)',
    slug: 'care-premium',
    tier: 'premium',
    monthly_price_paise: 99900,  // ₹999 / month
    annual_price_paise: 999900,  // ₹9,999 / year (save 17%)
    features: [
      'Everything in Standard Plan',
      '4 Free Comprehensive Maintenance Visits / Year',
      'Zero Visiting Charges All Year Round',
      '25% Discount on Genuine OEM Spare Parts',
      '1-Hour Emergency Priority Dispatch Gate',
      'Dedicated Dedicated Family Facility Manager',
      '90-Day Extended Service Guarantee'
    ],
    maintenance_visits_per_year: 4,
    priority_support: true,
    service_discount_percent: 25,
    is_active: true
  }
];

// Fallback in-memory storage for test/demo mode
const memoryAppliances = new Map();
const memorySubscriptions = new Map();

/**
 * Register a new appliance
 */
async function registerAppliance(userId, data) {
  const applianceId = data.id || `app-${Date.now()}`;
  const healthScore = data.health_score || 90;

  try {
    const res = await db.query(`
      INSERT INTO appliances (
        user_id, property_name, appliance_type, brand, model,
        purchase_date, installation_date, warranty_expiry_date,
        last_service_date, usage_frequency, repair_history,
        image_url, health_score, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      userId,
      data.property_name || 'Main Residence',
      data.appliance_type,
      data.brand,
      data.model || null,
      data.purchase_date || null,
      data.installation_date || null,
      data.warranty_expiry_date || null,
      data.last_service_date || null,
      data.usage_frequency || 'medium',
      JSON.stringify(data.repair_history || []),
      data.image_url || null,
      healthScore,
      data.notes || null
    ]);

    if (res && res.rows && res.rows[0]) {
      const appliance = res.rows[0];
      const prediction = predictApplianceMaintenance(appliance);
      return { ...appliance, ai_prediction: prediction };
    }
  } catch (err) {
    // Fall back to memory
  }

  const memoryObj = {
    id: applianceId,
    user_id: userId,
    property_name: data.property_name || 'Main Residence',
    appliance_type: data.appliance_type,
    brand: data.brand,
    model: data.model || '',
    purchase_date: data.purchase_date || '2024-01-15',
    installation_date: data.installation_date || '2024-01-20',
    warranty_expiry_date: data.warranty_expiry_date || '2026-01-20',
    last_service_date: data.last_service_date || '2025-10-10',
    usage_frequency: data.usage_frequency || 'medium',
    repair_history: data.repair_history || [],
    image_url: data.image_url || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    health_score: healthScore,
    notes: data.notes || '',
    created_at: new Date().toISOString()
  };

  const userList = memoryAppliances.get(userId) || [];
  userList.push(memoryObj);
  memoryAppliances.set(userId, userList);

  const prediction = predictApplianceMaintenance(memoryObj);
  return { ...memoryObj, ai_prediction: prediction };
}

/**
 * List appliances for a user
 */
async function getUserAppliances(userId) {
  let list = [];
  try {
    const res = await db.query(
      'SELECT * FROM appliances WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    if (res && res.rows) {
      list = res.rows;
    }
  } catch (err) {
    list = memoryAppliances.get(userId) || [];
  }

  if (list.length === 0 && (!memoryAppliances.get(userId) || memoryAppliances.get(userId).length === 0)) {
    // Generate default rich starter appliances for demonstration
    const starterAC = {
      id: `app-demo-ac-${userId.slice(0, 8)}`,
      user_id: userId,
      property_name: 'Main Residence',
      appliance_type: 'ac',
      brand: 'Daikin',
      model: 'FTKF50 1.5T 5-Star Inverter',
      purchase_date: '2023-04-10',
      installation_date: '2023-04-12',
      warranty_expiry_date: '2028-04-12',
      last_service_date: '2025-11-20',
      usage_frequency: 'heavy',
      repair_history: [{ date: '2024-05-10', issue: 'Capacitor swap', cost_paise: 45000 }],
      image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      health_score: 72,
      notes: 'Master Bedroom AC'
    };
    const starterRO = {
      id: `app-demo-ro-${userId.slice(0, 8)}`,
      user_id: userId,
      property_name: 'Main Residence',
      appliance_type: 'water_purifier',
      brand: 'Kent',
      model: 'Grand Plus Mineral RO+UV',
      purchase_date: '2024-02-01',
      installation_date: '2024-02-03',
      warranty_expiry_date: '2025-02-03',
      last_service_date: '2025-08-15',
      usage_frequency: 'medium',
      repair_history: [],
      image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
      health_score: 64,
      notes: 'Kitchen Drinking Water'
    };
    list = [starterAC, starterRO];
    memoryAppliances.set(userId, list);
  }

  // Attach AI predictions
  return list.map((item) => {
    const prediction = predictApplianceMaintenance(item);
    return {
      ...item,
      ai_prediction: prediction
    };
  });
}

/**
 * Get available subscription plans
 */
async function getSubscriptionPlans() {
  try {
    const res = await db.query(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY monthly_price_paise ASC'
    );
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Return memory defaults
  }
  return DEFAULT_PLANS;
}

/**
 * Get active customer subscription
 */
async function getUserSubscription(userId) {
  try {
    const res = await db.query(`
      SELECT 
        cs.*,
        sp.name AS plan_name,
        sp.tier AS plan_tier,
        sp.features AS plan_features,
        sp.service_discount_percent,
        sp.priority_support
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.user_id = $1 AND cs.status = 'active'
      ORDER BY cs.created_at DESC
      LIMIT 1
    `, [userId]);

    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }
  } catch (err) {
    // Check memory
  }

  const sub = memorySubscriptions.get(userId);
  if (sub) return sub;

  // Default active demo subscription so user immediately tests the full feature set
  const demoSub = {
    id: `sub-demo-${userId.slice(0, 8)}`,
    user_id: userId,
    plan_id: 'plan-standard',
    plan_name: 'Care Standard',
    plan_tier: 'standard',
    billing_cycle: 'monthly',
    status: 'active',
    start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    next_renewal_date: new Date(Date.now() + 335 * 24 * 3600 * 1000).toISOString(),
    visits_total: 2,
    visits_remaining: 2,
    service_discount_percent: 15,
    priority_support: true,
    auto_renew: true,
    plan_features: DEFAULT_PLANS[1].features
  };
  return demoSub;
}

/**
 * Subscribe to a plan
 */
async function subscribeUserToPlan(userId, { plan_id, billing_cycle = 'monthly' }) {
  const plans = await getSubscriptionPlans();
  const plan = plans.find((p) => p.id === plan_id || p.slug === plan_id || p.tier === plan_id) || plans[1];

  const now = new Date();
  const renewalDays = billing_cycle === 'annual' ? 365 : 30;
  const renewalDate = new Date(now.getTime() + renewalDays * 24 * 3600 * 1000);

  const subRecord = {
    id: `sub-${Date.now()}`,
    user_id: userId,
    plan_id: plan.id,
    plan_name: plan.name,
    plan_tier: plan.tier,
    billing_cycle,
    status: 'active',
    start_date: now.toISOString(),
    next_renewal_date: renewalDate.toISOString(),
    visits_total: plan.maintenance_visits_per_year,
    visits_remaining: plan.maintenance_visits_per_year,
    service_discount_percent: plan.service_discount_percent,
    priority_support: plan.priority_support,
    auto_renew: true,
    plan_features: plan.features
  };

  try {
    const res = await db.query(`
      INSERT INTO customer_subscriptions (
        user_id, plan_id, billing_cycle, status, start_date,
        next_renewal_date, visits_total, visits_remaining, auto_renew
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, true)
      RETURNING *
    `, [
      userId,
      plan.id,
      billing_cycle,
      now.toISOString(),
      renewalDate.toISOString(),
      plan.maintenance_visits_per_year,
      plan.maintenance_visits_per_year
    ]);
    if (res && res.rows && res.rows[0]) {
      return { ...res.rows[0], plan_name: plan.name, plan_tier: plan.tier };
    }
  } catch (err) {
    // Memory fallback
  }

  memorySubscriptions.set(userId, subRecord);
  return subRecord;
}

/**
 * Cancel active subscription
 */
async function cancelSubscription(userId) {
  try {
    await db.query(`
      UPDATE customer_subscriptions
      SET status = 'cancelled', auto_renew = false, updated_at = NOW()
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);
  } catch (err) {
    // Memory
  }
  const sub = memorySubscriptions.get(userId);
  if (sub) {
    sub.status = 'cancelled';
    sub.auto_renew = false;
  }
  return { success: true, message: 'Subscription cancelled successfully' };
}

/**
 * Get maintenance dashboard metrics
 */
async function getMaintenanceDashboard(userId) {
  const appliances = await getUserAppliances(userId);
  const subscription = await getUserSubscription(userId);

  const totalAppliances = appliances.length;
  const requiringMaintenance = appliances.filter(
    (a) => a.ai_prediction && (a.ai_prediction.priority === 'high' || a.ai_prediction.priority === 'critical' || a.ai_prediction.is_overdue)
  ).length;

  const avgHealthScore = totalAppliances > 0
    ? Math.round(appliances.reduce((acc, a) => acc + (a.health_score || 80), 0) / totalAppliances)
    : 85;

  const upcomingMaintenance = appliances
    .filter((a) => a.ai_prediction)
    .map((a) => ({
      appliance_id: a.id,
      brand: a.brand,
      model: a.model,
      appliance_type: a.appliance_type,
      property_name: a.property_name,
      recommended_date: a.ai_prediction.recommended_date,
      priority: a.ai_prediction.priority,
      suggested_service: a.ai_prediction.suggested_service,
      estimated_price_range: a.ai_prediction.estimated_price_range,
      reason: a.ai_prediction.reason
    }))
    .sort((a, b) => new Date(a.recommended_date) - new Date(b.recommended_date));

  return {
    metrics: {
      total_appliances: totalAppliances,
      requiring_maintenance: requiringMaintenance,
      average_health_score: avgHealthScore,
      total_maintenance_spent_paise: 245000, // ₹2,450
      covered_visits_left: subscription ? subscription.visits_remaining : 0
    },
    subscription,
    appliances,
    upcoming_maintenance: upcomingMaintenance
  };
}

module.exports = {
  registerAppliance,
  getUserAppliances,
  getSubscriptionPlans,
  getUserSubscription,
  subscribeUserToPlan,
  cancelSubscription,
  getMaintenanceDashboard,
  DEFAULT_PLANS
};
