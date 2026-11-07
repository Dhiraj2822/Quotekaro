const maintenanceService = require('./maintenance.service');

async function handleRegisterAppliance(req, res, next) {
  try {
    const appliance = await maintenanceService.registerAppliance(req.user.id, req.body);
    res.status(201).json({ appliance });
  } catch (err) {
    next(err);
  }
}

async function handleGetAppliances(req, res, next) {
  try {
    const appliances = await maintenanceService.getUserAppliances(req.user.id);
    res.status(200).json({ count: appliances.length, appliances });
  } catch (err) {
    next(err);
  }
}

async function handleGetPlans(req, res, next) {
  try {
    const plans = await maintenanceService.getSubscriptionPlans();
    res.status(200).json({ plans });
  } catch (err) {
    next(err);
  }
}

async function handleGetUserSubscription(req, res, next) {
  try {
    const subscription = await maintenanceService.getUserSubscription(req.user.id);
    res.status(200).json({ subscription });
  } catch (err) {
    next(err);
  }
}

async function handleSubscribe(req, res, next) {
  try {
    const subscription = await maintenanceService.subscribeUserToPlan(req.user.id, req.body);
    res.status(200).json({ success: true, subscription });
  } catch (err) {
    next(err);
  }
}

async function handleCancelSubscription(req, res, next) {
  try {
    const result = await maintenanceService.cancelSubscription(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetDashboard(req, res, next) {
  try {
    const dashboard = await maintenanceService.getMaintenanceDashboard(req.user.id);
    res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleRegisterAppliance,
  handleGetAppliances,
  handleGetPlans,
  handleGetUserSubscription,
  handleSubscribe,
  handleCancelSubscription,
  handleGetDashboard
};

