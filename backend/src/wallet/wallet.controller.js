const walletService = require('./wallet.service');

/**
 * Wallet Controller per 05_API_SPEC.md
 */

/**
 * GET /providers/:id/wallet
 */
async function handleGetWallet(req, res, next) {
  try {
    const providerProfileId = req.params.id;
    const user = req.user;

    const result = await walletService.getWalletByProviderId({
      providerProfileId,
      user
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /providers/:id/wallet/topup
 */
async function handleTopupWallet(req, res, next) {
  try {
    const providerProfileId = req.params.id;
    const { amount_paise, method } = req.body;

    const result = await walletService.topupWallet({
      providerProfileId,
      amountPaise: amount_paise,
      method
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetWallet,
  handleTopupWallet
};
