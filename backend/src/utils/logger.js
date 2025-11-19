const LEVELS = ['error', 'warn', 'info', 'debug'];

const levelFromEnv = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevelIndex = LEVELS.indexOf(levelFromEnv) >= 0 ? LEVELS.indexOf(levelFromEnv) : LEVELS.indexOf('info');

const shouldLog = (level) => {
  const targetIndex = LEVELS.indexOf(level);
  if (targetIndex === -1) {
    return false;
  }
  return targetIndex <= currentLevelIndex;
};

const logger = {
  info: (...args) => {
    if (shouldLog('info')) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  debug: (...args) => {
    if (shouldLog('debug')) {
      console.log(...args);
    }
  },
  error: (...args) => {
    console.error(...args);
  },
};

module.exports = logger;

