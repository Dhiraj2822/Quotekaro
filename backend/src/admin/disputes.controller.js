const disputesService = require('./disputes.service');

async function handleCreateDispute(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const { reason } = req.body;
    const dispute = await disputesService.createDispute({
      bookingId,
      userId: req.user.id,
      userRole: req.user.role,
      reason
    });
    return res.status(201).json({ dispute });
  } catch (error) {
    next(error);
  }
}

async function handleGetDisputes(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const disputes = await disputesService.getDisputes({
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    return res.status(200).json({ disputes });
  } catch (error) {
    next(error);
  }
}

async function handleGetDisputeById(req, res, next) {
  try {
    const { id } = req.params;
    const dispute = await disputesService.getDisputeById(id);
    return res.status(200).json({ dispute });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;
    const dispute = await disputesService.updateDisputeStatus({
      disputeId: id,
      status,
      resolutionNotes: resolution_notes
    });
    return res.status(200).json({ dispute });
  } catch (error) {
    next(error);
  }
}

async function handleGetBookingDisputes(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const disputes = await disputesService.getBookingDisputes(bookingId, {
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(200).json({ disputes });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleCreateDispute,
  handleGetDisputes,
  handleGetDisputeById,
  handleUpdateDispute,
  handleGetBookingDisputes
};
