// Config module: Database, Redis, Firebase, and Environment configuration
module.exports = {
  port: process.env.PORT || 4000,
  env: process.env.NODE_ENV || 'development'
};
