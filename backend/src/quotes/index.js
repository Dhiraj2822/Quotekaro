const service = require('./quotes.service');
const controller = require('./quotes.controller');
const validation = require('./quotes.validation');

module.exports = {
  ...service,
  ...controller,
  ...validation
};
