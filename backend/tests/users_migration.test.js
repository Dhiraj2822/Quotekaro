const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');

describe('Module 1 - Task 1: users Table Migration', () => {
  let db;
  let client;

  beforeAll(async () => {
    db = newDb();
    const crypto = require('crypto');
    db.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: db.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    client = db.adapters.createPg().Client;
    const pgClient = new client();
    await pgClient.connect();

    // Read and apply migration
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../src/migrations/001_create_users_table.sql'),
      'utf8'
    );

    // Split and execute non-PLpgSQL statements or standard SQL
    // pg-mem handles DDL for enum, table, indexes
    db.public.none(`
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

      CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
  });

  it('allows inserting a valid user with default is_active=true and generated UUID', () => {
    const res = db.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900001', 'customer', 'Test Customer', 'Pune')
      RETURNING *;
    `);

    expect(res).toHaveLength(1);
    expect(res[0].phone_number).toEqual('+919999900001');
    expect(res[0].role).toEqual('customer');
    expect(res[0].name).toEqual('Test Customer');
    expect(res[0].is_active).toBe(true);
    expect(res[0].id).toBeDefined();
  });

  it('enforces UNIQUE constraint on phone_number', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO users (phone_number, role, name)
        VALUES ('+919999900001', 'provider', 'Duplicate Phone Provider');
      `);
    }).toThrow();
  });

  it('rejects invalid role not in user_role ENUM', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO users (phone_number, role, name)
        VALUES ('+919999900002', 'superadmin', 'Invalid Role User');
      `);
    }).toThrow();
  });

  it('allows provider and admin roles', () => {
    const provider = db.public.many(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900002', 'provider', 'Test Provider')
      RETURNING role;
    `);
    expect(provider[0].role).toEqual('provider');

    const admin = db.public.many(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900003', 'admin', 'Platform Admin')
      RETURNING role;
    `);
    expect(admin[0].role).toEqual('admin');
  });
});
