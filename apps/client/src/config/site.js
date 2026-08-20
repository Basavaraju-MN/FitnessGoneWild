export const siteConfig = {
  name: 'Fitness Gone Wild',
  shot_name: 'FGW',

  url: import.meta.env.VITE_SITE_URL || window.location.origin,

  description: 'Weekend treks, backpacking and bike rides.',
  keywords: ['treks', 'backpacking', 'bike rides', 'Fitness Gone Wild'],

  authors: [],

  links: {
    github: '',
    documentation: '',
    demo: import.meta.env.VITE_SITE_URL || window.location.origin,
  },
};
