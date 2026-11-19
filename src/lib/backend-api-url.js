export function getBackendApiBaseUrl() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const configuredUrl = process.env.BACKEND_API_URL?.trim();
  const value = configuredUrl || (isProduction ? '' : 'http://localhost:5000/api');
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    if (isProduction && url.protocol !== 'https:') return null;
    const path = url.pathname.replace(/\/+$/, '').replace(/(?:\/api)+$/i, '');
    url.pathname = `${path}/api`;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}
