const addressesService = require('./addresses.service');

async function handleGetAddresses(req, res, next) {
  try {
    const addresses = await addressesService.getAddresses(req.user.id);
    res.status(200).json({ addresses });
  } catch (err) {
    next(err);
  }
}

async function handleAddAddress(req, res, next) {
  try {
    const address = await addressesService.addAddress(req.user.id, req.body);
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteAddress(req, res, next) {
  try {
    const { id } = req.params;
    const result = await addressesService.deleteAddress(req.user.id, id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetAddresses,
  handleAddAddress,
  handleDeleteAddress
};

