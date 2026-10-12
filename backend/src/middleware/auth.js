const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

/**
 * Authentication middleware: verifies Bearer JWT token on incoming requests
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or malformed'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired'
      }
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware:
 * Enforces that req.user.role is in the allowedRoles array.
 * Example: requireRole(['admin']) or requireRole(['provider', 'admin'])
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of: [${allowedRoles.join(', ')}]`
        }
      });
    }

    next();
  };
}

/**
 * Ensures user can only access/modify their own resource unless role is admin
 */
function requireOwnershipOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : req.params.id;

    if (req.user.role !== 'admin' && req.user.id !== ownerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: You cannot access or modify another user\'s resource'
        }
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireOwnershipOrAdmin
};
