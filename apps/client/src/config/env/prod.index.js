const prodConfig = {
    // Todo: Update api url
    api: process.env.NEXT_PUBLIC_BACKEND_URL || 'localhost:4000/api',
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
};

export default prodConfig;