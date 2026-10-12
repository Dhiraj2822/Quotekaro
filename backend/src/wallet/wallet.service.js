const db = require('../config/db');

/**
 * Wallet Service
 * Handles append-only ledger entries, commission deduction, and threshold enforcement
 * per 01_PRD.md §4, 04_DATABASE_SCHEMA.md, and 07_SECURITY.md §3.
 */

const COMMISSION_RATE_PERCENT = parseInt(process.env.COMMISSION_RATE_PERCENT || '10', 10);
const PROVIDER_MIN_WALLET_BALANCE_PAISE = parseInt(process.env.PROVIDER_MIN_WALLET_BALANCE_PAISE || '10000', 10);

/**
 * Deduct platform commission from provider's wallet on job completion.
 * Applies identically to BOTH cash and digital payment methods (core differentiator).
 */
async function deductCommission({ providerId, bookingId, bookingPricePaise, client = null }) {
  const queryRunner = client || db;

  const commissionRate = COMMISSION_RATE_PERCENT;
  const commissionPaise = Math.round((bookingPricePaise * commissionRate) / 100);

  // 1. Fetch current provider profile
  const providerRes = await queryRunner.query(
    'SELECT id, user_id, wallet_balance_paise, is_available FROM provider_profiles WHERE id = $1',
    [providerId]
  );

  if (providerRes.rowCount === 0) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const provider = providerRes.rows[0];
  const currentBalance = provider.wallet_balance_paise !== null && provider.wallet_balance_paise !== undefined
    ? parseInt(provider.wallet_balance_paise, 10)
    : 0;

  const newBalance = currentBalance - commissionPaise;

  // 2. Threshold check per 04_DATABASE_SCHEMA.md:
  // If balance drops below minimum threshold (e.g. 10000 paise = ₹100),
  // force is_available = false so provider cannot receive new job matches until top-up.
  const belowThreshold = newBalance < PROVIDER_MIN_WALLET_BALANCE_PAISE;
  const newIsAvailable = belowThreshold ? false : provider.is_available;

  // 3. Update provider profile
  await queryRunner.query(
    `UPDATE provider_profiles 
     SET wallet_balance_paise = $1, is_available = $2, updated_at = NOW() 
     WHERE id = $3`,
    [newBalance, newIsAvailable, providerId]
  );

  // 4. Append-only ledger record (negative amount for deduction per 04_DATABASE_SCHEMA.md)
  const ledgerRes = await queryRunner.query(
    `INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
     VALUES ($1, $2, 'commission_deduction', $3, $4)
     RETURNING id, provider_id, booking_id, entry_type, amount_paise, balance_after_paise, created_at`,
    [providerId, bookingId, -commissionPaise, newBalance]
  );

  return {
    ledgerEntry: ledgerRes.rows[0],
    commissionPaise,
    previousBalance: currentBalance,
    newBalance,
    isAvailable: newIsAvailable,
    belowThreshold
  };
}

/**
 * Top-up provider's prepaid wallet
 */
async function topupWallet({ providerProfileId, amountPaise, method = 'upi' }) {
  if (!amountPaise || typeof amountPaise !== 'number' || amountPaise <= 0) {
    const error = new Error('Valid positive amount_paise is required for wallet topup');
    error.statusCode = 400;
    error.code = 'INVALID_AMOUNT';
    throw error;
  }

  const providerRes = await db.query(
    'SELECT id, wallet_balance_paise, is_available, kyc_status FROM provider_profiles WHERE id = $1',
    [providerProfileId]
  );

  if (providerRes.rowCount === 0) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const provider = providerRes.rows[0];
  const currentBalance = provider.wallet_balance_paise !== null && provider.wallet_balance_paise !== undefined
    ? parseInt(provider.wallet_balance_paise, 10)
    : 0;

  const newBalance = currentBalance + Math.round(amountPaise);

  // If topup brings balance above threshold and KYC is approved, provider can be available again
  let newIsAvailable = provider.is_available;
  if (newBalance >= PROVIDER_MIN_WALLET_BALANCE_PAISE && provider.kyc_status === 'approved') {
    newIsAvailable = true;
  }

  await db.query(
    `UPDATE provider_profiles 
     SET wallet_balance_paise = $1, is_available = $2, updated_at = NOW() 
     WHERE id = $3`,
    [newBalance, newIsAvailable, providerProfileId]
  );

  const ledgerRes = await db.query(
    `INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
     VALUES ($1, NULL, 'topup', $2, $3)
     RETURNING id, provider_id, booking_id, entry_type, amount_paise, balance_after_paise, created_at`,
    [providerProfileId, Math.round(amountPaise), newBalance]
  );

  return {
    ledger_entry: ledgerRes.rows[0],
    balance_paise: newBalance,
    is_available: newIsAvailable
  };
}

/**
 * Retrieve provider's wallet balance and ledger history per 05_API_SPEC.md
 */
async function getWalletByProviderId({ providerProfileId, user = null }) {
  const providerRes = await db.query(
    'SELECT id, user_id, wallet_balance_paise, is_available FROM provider_profiles WHERE id = $1',
    [providerProfileId]
  );

  if (providerRes.rowCount === 0) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const provider = providerRes.rows[0];

  // Authorization check: only the provider or admin can inspect the wallet
  if (user && user.role === 'provider' && provider.user_id !== user.id) {
    const error = new Error('You are not authorized to view this wallet');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const ledgerRes = await db.query(
    `SELECT id, provider_id, booking_id, entry_type, amount_paise, balance_after_paise, created_at 
     FROM wallet_ledger 
     WHERE provider_id = $1 
     ORDER BY created_at DESC`,
    [providerProfileId]
  );

  return {
    balance_paise: parseInt(provider.wallet_balance_paise || 0, 10),
    is_available: provider.is_available,
    min_threshold_paise: PROVIDER_MIN_WALLET_BALANCE_PAISE,
    ledger: ledgerRes.rows
  };
}

module.exports = {
  deductCommission,
  topupWallet,
  getWalletByProviderId,
  COMMISSION_RATE_PERCENT,
  PROVIDER_MIN_WALLET_BALANCE_PAISE
};
