const TARGET_BASE = (Netlify.env.get("TARGET_DOMAIN") || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-forwarded-for",
  "x-real-ip",
]);

export default async function handler(request) {
  if (!TARGET_BASE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    const headers = new Headers();
    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-nf-") || k.startsWith("x-netlify-")) continue;
      headers.set(k, value);
    }

    const method = request.method;
    const fetchOptions = {
      method,
      headers,
      redirect: "manual",
      body: (method !== "GET" && method !== "HEAD") ? request.body : undefined,
    };

    const upstream = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers) {
      if (key.toLowerCase() !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Bad Gateway: Relay Failed", { status: 502 });
  }
}
