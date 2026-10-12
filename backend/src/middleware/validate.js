/**
 * Middleware factory to validate request body against a Zod schema
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err) {
      const firstIssue = err.issues && err.issues[0];
      const message = firstIssue ? firstIssue.message : 'Invalid request payload';

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message
        }
      });
    }
  };
}

/**
 * Middleware factory to validate request query parameters against a Zod schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (err) {
      const firstIssue = err.issues && err.issues[0];
      const message = firstIssue ? firstIssue.message : 'Invalid query parameters';

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message
        }
      });
    }
  };
}

validate.validate = validate;
validate.validateQuery = validateQuery;

module.exports = validate;
