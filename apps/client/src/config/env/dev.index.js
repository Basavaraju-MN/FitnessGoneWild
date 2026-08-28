const devConfig = {
  api: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  debug: import.meta.env.DEV,
};

export default devConfig;
