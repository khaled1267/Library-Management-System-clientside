import { getBackendApiBaseUrl } from '../../../lib/backend-api-url.js';

const requestHopByHopHeaders = [
  'connection', 'content-length', 'host', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'accept-encoding',
];
const responseHopByHopHeaders = [
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'content-length', 'content-encoding',
];

export async function proxy(request, context) {
  const apiBaseUrl = getBackendApiBaseUrl();
  if (!apiBaseUrl) {
    return Response.json({ message: 'The API proxy is not configured.' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { path = [] } = await context.params;
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${path.map(segment => encodeURIComponent(segment)).join('/')}${requestUrl.search}`, `${apiBaseUrl}/`);
  const headers = new Headers(request.headers);
  for (const name of requestHopByHopHeaders) headers.delete(name);

  const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      cache: 'no-store',
      redirect: 'manual',
      signal: request.signal,
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of responseHopByHopHeaders) responseHeaders.delete(name);

    const setCookies = upstream.headers.getSetCookie?.() || [];
    if (setCookies.length) {
      responseHeaders.delete('set-cookie');
      for (const cookie of setCookies) responseHeaders.append('set-cookie', cookie);
    }

    const responseBody = request.method.toUpperCase() === 'HEAD' || [204, 304].includes(upstream.status)
      ? null
      : upstream.body;
    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ message: 'The API service could not be reached.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
