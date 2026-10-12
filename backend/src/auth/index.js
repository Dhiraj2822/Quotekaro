const routes = require('./auth.routes');
const service = require('./auth.service');
const controller = require('./auth.controller');
const validation = require('./auth.validation');

module.exports = {
  routes,
  service,
  controller,
  validation
};
