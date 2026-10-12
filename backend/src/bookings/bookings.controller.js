const {
  getBookingById,
  getBookingsForUser,
  updateBookingStatus,
  updateBookingLocation,
  getBookingTrack,
  createBookingMessage,
  getBookingMessages,
  completeBooking,
  updateBookingPhotos
} = require('./bookings.service');

async function handleGetBooking(req, res, next) {
  try {
    const booking = await getBookingById({
      bookingId: req.params.id,
      user: req.user
    });
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
}

async function handleGetBookings(req, res, next) {
  try {
    const bookings = await getBookingsForUser({
      user: req.user
    });
    return res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateBookingStatus(req, res, next) {
  try {
    const { status, lat, lng, before_photo_url } = req.body;
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      status,
      lat,
      lng,
      beforePhotoUrl: before_photo_url,
      user: req.user
    });
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateBookingLocation(req, res, next) {
  try {
    const { lat, lng } = req.body;
    const result = await updateBookingLocation({
      bookingId: req.params.id,
      lat,
      lng,
      user: req.user
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetBookingTrack(req, res, next) {
  try {
    const track = await getBookingTrack({
      bookingId: req.params.id,
      user: req.user
    });
    return res.status(200).json(track);
  } catch (err) {
    next(err);
  }
}

async function handleCreateBookingMessage(req, res, next) {
  try {
    const { message } = req.body;
    const result = await createBookingMessage({
      bookingId: req.params.id,
      message,
      user: req.user
    });
    return res.status(201).json({ message: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetBookingMessages(req, res, next) {
  try {
    const { since } = req.query;
    const messages = await getBookingMessages({
      bookingId: req.params.id,
      since,
      user: req.user
    });
    return res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}

async function handleCompleteBooking(req, res, next) {
  try {
    const { after_photo_url, before_photo_url } = req.body;
    const result = await completeBooking({
      bookingId: req.params.id,
      afterPhotoUrl: after_photo_url,
      beforePhotoUrl: before_photo_url,
      user: req.user
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleUpdateBookingPhotos(req, res, next) {
  try {
    const { before_photo_url, after_photo_url } = req.body;
    const booking = await updateBookingPhotos({
      bookingId: req.params.id,
      beforePhotoUrl: before_photo_url,
      afterPhotoUrl: after_photo_url,
      user: req.user
    });
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetBooking,
  handleGetBookings,
  handleUpdateBookingStatus,
  handleUpdateBookingLocation,
  handleGetBookingTrack,
  handleCreateBookingMessage,
  handleGetBookingMessages,
  handleCompleteBooking,
  handleUpdateBookingPhotos
};

