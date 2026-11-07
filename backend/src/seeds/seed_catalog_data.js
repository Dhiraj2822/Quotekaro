/**
 * Seed script for Urban Company-style Catalog Services, Subscriptions & Coupons
 */
const { DEFAULT_CATALOG } = require('../catalog/catalog.service');
const { DEFAULT_PLANS } = require('../maintenance/maintenance.service');
const { DEFAULT_COUPONS } = require('../coupons/coupons.service');

async function seedCatalogData(client) {
  console.log('📦 Seeding Catalog Categories, Services, Packages, Subscriptions, and Coupons...');

  // 1. Seed Categories
  for (const cat of DEFAULT_CATALOG) {
    await client.query(`
      INSERT INTO service_categories (id, name, slug, icon, description, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description;
    `, [cat.id, cat.name, cat.slug, cat.icon, cat.description || '', cat.order || 0]);

    // 2. Seed Services under this Category
    for (const s of cat.services) {
      const serviceRes = await client.query(`
        INSERT INTO catalog_services (id, category_id, name, slug, description, image_url, base_price_paise, estimated_duration_minutes, rating, reviews_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          base_price_paise = EXCLUDED.base_price_paise,
          rating = EXCLUDED.rating
        RETURNING id;
      `, [
        s.id,
        cat.id,
        s.name,
        s.slug,
        s.description || '',
        s.image_url || '',
        s.base_price_paise || 29900,
        s.estimated_duration_minutes || 60,
        s.rating || 4.8,
        s.reviews_count || 120
      ]);

      const serviceDbId = serviceRes.rows[0]?.id || s.id;

      // 3. Seed Packages
      if (Array.isArray(s.packages)) {
        for (const pkg of s.packages) {
          await client.query(`
            INSERT INTO service_packages (id, service_id, name, description, price_paise, duration_minutes, is_popular)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              price_paise = EXCLUDED.price_paise,
              name = EXCLUDED.name;
          `, [
            pkg.id,
            serviceDbId,
            pkg.name,
            pkg.description || '',
            pkg.price_paise,
            pkg.duration_minutes || 60,
            pkg.is_popular || false
          ]);
        }
      }

      // 4. Seed Add-ons
      if (Array.isArray(s.addons)) {
        for (const addon of s.addons) {
          await client.query(`
            INSERT INTO service_addons (id, service_id, name, price_paise)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
              price_paise = EXCLUDED.price_paise,
              name = EXCLUDED.name;
          `, [
            addon.id,
            serviceDbId,
            addon.name,
            addon.price_paise
          ]);
        }
      }
    }
  }

  // 5. Seed Subscription Plans
  for (const plan of DEFAULT_PLANS) {
    await client.query(`
      INSERT INTO subscription_plans (id, name, slug, price_monthly_paise, price_annual_paise, features, discount_percent, priority_booking)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (slug) DO UPDATE SET
        price_monthly_paise = EXCLUDED.price_monthly_paise,
        price_annual_paise = EXCLUDED.price_annual_paise,
        features = EXCLUDED.features;
    `, [
      plan.id,
      plan.name,
      plan.slug || plan.name.toLowerCase().replace(/\s+/g, '-'),
      plan.price_monthly_paise,
      plan.price_annual_paise,
      JSON.stringify(plan.features || []),
      plan.discount_percent || 0,
      plan.priority_booking || false
    ]);
  }

  // 6. Seed Coupons
  for (const c of DEFAULT_COUPONS) {
    await client.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (code) DO UPDATE SET
        discount_value = EXCLUDED.discount_value,
        is_active = EXCLUDED.is_active;
    `, [
      c.code,
      c.description || '',
      c.discount_type,
      c.discount_value,
      c.min_order_paise || 0,
      c.max_discount_paise || null,
      true
    ]);
  }

  console.log('✅ Catalog, Subscriptions, and Coupons seeded successfully.');
}

module.exports = { seedCatalogData };
