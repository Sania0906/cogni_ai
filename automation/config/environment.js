/**
 * Multi-Environment Configuration Manager
 */
export const environments = {
  local: {
    name: 'Local Development',
    webUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:5000',
    authEndpoints: {
      login: '/api/auth/login',
      signup: '/api/auth/signup',
      profile: '/api/auth/profile',
    },
  },
  dev: {
    name: 'Development Cluster',
    webUrl: 'https://dev.cognifyai.com',
    apiUrl: 'https://api-dev.cognifyai.com',
  },
  staging: {
    name: 'Staging Pre-Production',
    webUrl: 'https://staging.cognifyai.com',
    apiUrl: 'https://api-staging.cognifyai.com',
  },
  prod: {
    name: 'Production Environment',
    webUrl: 'https://cognifyai.com',
    apiUrl: 'https://api.cognifyai.com',
  },
};

export function getActiveEnvironment() {
  const envKey = (process.env.ENVIRONMENT || 'local').toLowerCase();
  return environments[envKey] || environments.local;
}
