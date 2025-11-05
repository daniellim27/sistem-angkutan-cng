const errorHandler = (err, req, res, next) => {
  console.error(err); // Log the full error for server-side debugging

  // Check if the error is a Sequelize validation error
  if (err.name === "SequelizeValidationError") {
    const errorItems = Array.isArray(err.errors)
      ? err.errors.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        }))
      : [];

    const messages = errorItems.map((e) => e.message).join(". ");

    // Add actionable notices for known fields/specs
    let notice = undefined;
    const hasPhoneError = errorItems.some((e) => (e.field || '').toLowerCase() === 'phone' || /phone/i.test(e.message));
    const hasBoxSpecError = errorItems.some((e) => /box/i.test(e.field || '') || /box/i.test(e.message));
    if (hasPhoneError) {
      notice = "Driver creation failed due to phone number not meeting required format/specification.";
    }
    if (!notice && hasBoxSpecError) {
      notice = "Creation failed due to box specification not meeting required constraints.";
    }

    return res.status(400).json({
      message: "Validation Failed",
      details: messages,
      errors: errorItems,
      notice,
    });
  }

  // --- Handle other types of errors ---
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "Conflict",
      details: "A record with one of the unique fields already exists.",
    });
  }

  // Default to a 500 server error if it's not a known type
  res.status(500).json({
    message: "An unexpected error occurred on the server.",
    details: err.message,
  });
};

module.exports = errorHandler;
