const successResponse = (
  res,
  data = null,
  message = "Request successful",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (
  res,
  message = "Request failed",
  statusCode = 500,
  error = null
) => {
  const response = {
    success: false,
    message
  };

  if (error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

const validationErrorResponse = (
  res,
  message = "Invalid request"
) => {
  return errorResponse(
    res,
    message,
    400
  );
};

const notFoundResponse = (
  res,
  message = "Resource not found"
) => {
  return errorResponse(
    res,
    message,
    404
  );
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse
};