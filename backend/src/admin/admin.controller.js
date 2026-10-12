const adminService = require('./admin.service');
const analyticsService = require('./analytics.service');

async function handleGetProviders(req, res, next) {
  try {
    const { kyc_status } = req.query;
    const providers = await adminService.getProviders({ kyc_status });
    return res.status(200).json({ providers });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateKyc(req, res, next) {
  try {
    const { id } = req.params;
    const { kyc_status, rejection_reason } = req.body;
    const profile = await adminService.updateProviderKyc(id, { kyc_status, rejection_reason });
    return res.status(200).json({ provider_profile: profile });
  } catch (error) {
    next(error);
  }
}

async function handleGetAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getAdminAnalytics();
    return res.status(200).json(analytics);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetProviders,
  handleUpdateKyc,
  handleGetAnalytics
};

