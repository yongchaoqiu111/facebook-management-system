import { config } from './config';
import { loginWithPasswordHeaded } from './weibo-browser-automation';

(async () => {
  const result = await loginWithPasswordHeaded({
    username: config.weibo.auth.username || '',
    password: config.weibo.auth.password || '',
    timeoutSeconds: 240
  });

  console.log(result);
  if (!result.ok) {
    process.exit(1);
  }
})();
