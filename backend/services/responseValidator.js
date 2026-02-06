/**
 * Validates that an object contains all required keys.
 * @param {Object} data - The object to validate
 * @param {Array<string>} requiredKeys - List of keys that must exist
 * @returns {boolean} - True if valid
 */
function validateSchema(data, requiredKeys) {
  if (!data || typeof data !== 'object') return false;

  for (const key of requiredKeys) {
    if (data[key] === undefined || data[key] === null) {
      console.warn(`Validation Failed: Missing key '${key}'`);
      return false;
    }
  }
  return true;
}

/**
 * Validates and repairs common AI JSON errors (like extra text) if possible.
 * (Currently just a wrapper around schema validation, but extensible).
 */
function sanitizeAndValidate(data, requiredKeys) {
  return validateSchema(data, requiredKeys) ? data : null;
}

module.exports = { validateSchema, sanitizeAndValidate };
