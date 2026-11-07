const catalogService = require('./catalog.service');

async function handleGetCategories(req, res, next) {
  try {
    const categories = await catalogService.getCategories();
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

async function handleGetServices(req, res, next) {
  try {
    const { category, query, sort, is_popular, is_recommended, min_price, max_price } = req.query;
    const services = await catalogService.getServices({
      category,
      query,
      sort,
      is_popular,
      is_recommended,
      min_price,
      max_price
    });
    res.status(200).json({
      count: services.length,
      services
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetServiceDetails(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const service = await catalogService.getServiceDetails(idOrSlug);
    res.status(200).json({ service });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetCategories,
  handleGetServices,
  handleGetServiceDetails
};

