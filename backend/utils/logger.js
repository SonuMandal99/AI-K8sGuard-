const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();

  return `[${timestamp}] [${level}] ${message}`;
};

const info = (message) => {
  console.log(formatMessage("INFO", message));
};

const warn = (message) => {
  console.warn(formatMessage("WARN", message));
};

const error = (message) => {
  console.error(formatMessage("ERROR", message));
};

const debug = (message) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug(formatMessage("DEBUG", message));
  }
};

module.exports = {
  info,
  warn,
  error,
  debug
};