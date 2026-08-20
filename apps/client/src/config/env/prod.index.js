const prodConfig = {
  api: import.meta.env.VITE_API_BASE_URL || '/api',
  debug: import.meta.env.VITE_DEBUG === 'true',
};

export default prodConfig;
