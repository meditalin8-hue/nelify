export default async (request, context) => {
  try {
    const backend = process.env.TARGET_DOMAIN

    if (!backend) {
      return new Response('TARGET_DOMAIN missing', {
        status: 500
      })
    }

    const url = new URL(request.url)

    const upstream = backend + url.pathname + url.search

    const headers = new Headers(request.headers)

    headers.delete('host')
    headers.delete('x-forwarded-for')
    headers.delete('cf-connecting-ip')
    headers.delete('content-length')

    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : request.body,
      duplex: 'half',
      redirect: 'manual'
    })

    const responseHeaders = new Headers(response.headers)

    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
    responseHeaders.delete('transfer-encoding')

    responseHeaders.set('cache-control', 'no-store')
    responseHeaders.set('x-relay', 'edge-stream')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (err) {
    return new Response('relay error', {
      status: 502
    })
  }
}
