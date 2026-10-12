const providersService = require('./providers.service');

async function handleKycUpload(req, res, next) {
  try {
    const profile = await providersService.submitKyc(req.user.id, req.body.document_url);
    return res.status(200).json({ provider_profile: profile });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateAvailability(req, res, next) {
  try {
    const profile = await providersService.updateAvailability(req.params.id, req.body.is_available);
    return res.status(200).json({ provider_profile: profile });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateServiceArea(req, res, next) {
  try {
    const profile = await providersService.updateServiceArea(req.params.id, req.body);
    return res.status(200).json({ provider_profile: profile });
  } catch (error) {
    next(error);
  }
}

async function handleGetProvider(req, res, next) {
  try {
    const profile = await providersService.getProviderProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Provider profile not found'
        }
      });
    }

    return res.status(200).json({ provider_profile: profile });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleKycUpload,
  handleUpdateAvailability,
  handleUpdateServiceArea,
  handleGetProvider
};
