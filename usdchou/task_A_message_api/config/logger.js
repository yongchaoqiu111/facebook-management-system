const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = {
  info: (message, metadata = {}) => {
    const log = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    console.log(JSON.stringify(log));
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(log) + '\n'
    );
  },
  
  error: (message, metadata = {}) => {
    const log = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    console.error(JSON.stringify(log));
    fs.appendFileSync(
      path.join(logsDir, 'error.log'),
      JSON.stringify(log) + '\n'
    );
  },
  
  warn: (message, metadata = {}) => {
    const log = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    console.warn(JSON.stringify(log));
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(log) + '\n'
    );
  }
};

module.exports = logger;
