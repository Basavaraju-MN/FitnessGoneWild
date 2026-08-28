const localConfig = {
  api: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  debug: true,
};

export default localConfig;
