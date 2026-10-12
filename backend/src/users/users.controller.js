const usersService = require('./users.service');

async function handleGetUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateUser(req, res, next) {
  try {
    const updated = await usersService.updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    return res.status(200).json({ user: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetUser,
  handleUpdateUser
};
