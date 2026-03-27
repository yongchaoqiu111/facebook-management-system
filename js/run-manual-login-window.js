const automation = require('./dist/weibo-browser-automation.js');

(async () => {
  const result = await automation.openManualLoginWindow({
    timeoutSeconds: 900,
    snapshotIntervalMs: 2000
  });
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
