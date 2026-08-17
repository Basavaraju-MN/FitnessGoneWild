import devConfig from './dev.index.js';
import localConfig from './local.index.js';
import prodConfig from './prod.index.js';

/**
 * Determines the current environment based on the system environment variable.
 * @returns {string} The name of the environment ('local', 'dev', or 'prod').
 */
function getEnv() {
  return !process.env.NEXT_PUBLIC_PRODUCTION_VAR
    ? 'local'
    : process.env.NEXT_PUBLIC_PRODUCTION_VAR;
}

const env = getEnv();

const config = ({
  local: {
    ...localConfig,
  },
  prod: {
    ...prodConfig,
  },
}[env] || {});

export default config;