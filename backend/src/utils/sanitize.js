/**
 * Strip dangerous HTML and script tags to prevent stored XSS per 07_SECURITY.md §4
 */
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

module.exports = {
  sanitizeText
};
