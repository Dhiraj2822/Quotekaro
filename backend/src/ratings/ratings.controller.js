const ratingsService = require('./ratings.service');

async function handleCreateRating(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const {
      rating_honesty,
      rating_punctuality,
      rating_quality,
      review_text
    } = req.body;

    const result = await ratingsService.submitRating({
      bookingId,
      user: req.user,
      ratingHonesty: rating_honesty,
      ratingPunctuality: rating_punctuality,
      ratingQuality: rating_quality,
      reviewText: review_text
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetBookingRating(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const rating = await ratingsService.getRatingByBookingId({
      bookingId,
      user: req.user
    });

    if (!rating) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No rating found for this booking'
        }
      });
    }

    res.status(200).json({ rating });
  } catch (err) {
    next(err);
  }
}

async function handleGetProviderRatings(req, res, next) {
  try {
    const { id: providerId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await ratingsService.getProviderRatings({
      providerId,
      limit,
      offset
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCreateRating,
  handleGetBookingRating,
  handleGetProviderRatings
};
