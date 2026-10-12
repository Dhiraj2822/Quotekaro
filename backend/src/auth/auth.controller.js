const authService = require('./auth.service');
const usersService = require('../users/users.service');

async function handleRequestOtp(req, res, next) {
  try {
    const { phone_number } = req.body;
    const result = await authService.requestOtp(phone_number);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function handleVerifyOtp(req, res, next) {
  try {
    const { phone_number, otp, role } = req.body;
    const result = await authService.verifyOtp(phone_number, otp, role);
    return res.status(200).json({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

async function handleGetMe(req, res, next) {
  try {
    const user = await usersService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User account not found'
        }
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleRequestOtp,
  handleVerifyOtp,
  handleGetMe
};
