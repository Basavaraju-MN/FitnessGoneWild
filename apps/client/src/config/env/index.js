import devConfig from './dev.index.js';
import localConfig from './local.index.js';
import prodConfig from './prod.index.js';

function getEnv() {
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV;
  }

  return import.meta.env.PROD ? 'prod' : 'local';
}

const env = getEnv();

const config = {
  local: localConfig,
  dev: devConfig,
  prod: prodConfig,
}[env] || localConfig;

export default config;
