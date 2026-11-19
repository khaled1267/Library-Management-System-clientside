import test from 'node:test';
import assert from 'node:assert/strict';

const { GET, POST } = await import('../src/app/api/[...path]/route.js');

test('same-origin API proxy forwards request data and preserves upstream cookies and responses', async () => {
  const originalFetch = globalThis.fetch;
  const originalBackendUrl = process.env.BACKEND_API_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.BACKEND_API_URL = 'https://library-management-portal-three.vercel.app/api';

  const sessionCookie = 'library_session=test-jwt; Path=/; HttpOnly; Secure; SameSite=None';
  const extraCookie = 'library_preference=compact; Path=/; Secure';
  const upstreamCalls = [];
  globalThis.fetch = async (input, init) => {
    upstreamCalls.push({ url: new URL(input), init });
    return new Response(JSON.stringify({ registered: true }), {
      status: 201,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', sessionCookie],
        ['Set-Cookie', extraCookie],
        ['X-Upstream-Result', 'created'],
      ],
    });
  };

  try {
    const request = new Request('https://library.example/api/auth/register?source=signup', {
      method: 'POST',
      headers: {
        Origin: 'https://library.example',
        Cookie: 'library_session=previous-session',
        'Content-Type': 'application/json',
        Authorization: 'Bearer legacy-token',
      },
      body: JSON.stringify({ email: 'reader@example.test', password: 'test-only-password' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'register'] }) });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('content-type'), 'application/json');
    assert.equal(response.headers.get('x-upstream-result'), 'created');
    assert.deepEqual(response.headers.getSetCookie(), [sessionCookie, extraCookie]);
    assert.deepEqual(await response.json(), { registered: true });

    const call = upstreamCalls[0];
    assert.equal(call.url.href, 'https://library-management-portal-three.vercel.app/api/auth/register?source=signup');
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers.get('cookie'), 'library_session=previous-session');
    assert.equal(call.init.headers.get('origin'), 'https://library.example');
    assert.equal(call.init.headers.get('authorization'), 'Bearer legacy-token');
    assert.deepEqual(JSON.parse(new TextDecoder().decode(call.init.body)), {
      email: 'reader@example.test',
      password: 'test-only-password',
    });

    globalThis.fetch = async (input, init) => {
      upstreamCalls.push({ url: new URL(input), init });
      return new Response(JSON.stringify({ message: 'Sign in to continue.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'X-Upstream-Result': 'unauthorized' },
      });
    };
    const authRequest = new Request('https://library.example/api/auth/me', {
      headers: { Cookie: 'library_session=test-jwt', Origin: 'https://library.example' },
    });
    const authResponse = await GET(authRequest, { params: Promise.resolve({ path: ['auth', 'me'] }) });
    assert.equal(authResponse.status, 401);
    assert.equal(authResponse.headers.get('x-upstream-result'), 'unauthorized');
    assert.equal(upstreamCalls[1].url.href, 'https://library-management-portal-three.vercel.app/api/auth/me');
    assert.equal(upstreamCalls[1].init.headers.get('cookie'), 'library_session=test-jwt');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBackendUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('proxy has a localhost backend default and requires configuration in production', async () => {
  const originalBackendUrl = process.env.BACKEND_API_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = globalThis.fetch;
  delete process.env.BACKEND_API_URL;
  process.env.NODE_ENV = 'development';
  let requestedUrl;
  globalThis.fetch = async input => {
    requestedUrl = new URL(input).href;
    return new Response('ok', { status: 200 });
  };

  try {
    const request = new Request('http://localhost:3000/api/books');
    const localResponse = await GET(request, { params: Promise.resolve({ path: ['books'] }) });
    assert.equal(localResponse.status, 200);
    assert.equal(requestedUrl, 'http://localhost:5000/api/books');

    process.env.NODE_ENV = 'production';
    const productionResponse = await GET(request, { params: Promise.resolve({ path: ['books'] }) });
    assert.equal(productionResponse.status, 500);
    assert.equal(productionResponse.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBackendUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
