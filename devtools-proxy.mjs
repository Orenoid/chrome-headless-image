import http from 'node:http'
import net from 'node:net'

const LISTEN_PORT = 9222
const TARGET_HOST = '127.0.0.1'
const TARGET_PORT = 9223
const TARGET_HOST_HEADER = `${TARGET_HOST}:${TARGET_PORT}`

function rewriteDevToolsJson(body, publicHost) {
  return body.replaceAll(`ws://${TARGET_HOST_HEADER}`, `ws://${publicHost}`)
}

const server = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: TARGET_HOST_HEADER,
      },
    },
    (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || ''
      const shouldRewriteBody =
        typeof contentType === 'string' &&
        contentType.includes('application/json') &&
        req.url?.startsWith('/json/')

      if (!shouldRewriteBody) {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
        proxyRes.pipe(res)
        return
      }

      const chunks = []

      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        const publicHost = req.headers.host || `127.0.0.1:${LISTEN_PORT}`
        const body = Buffer.concat(chunks).toString('utf8')
        const rewrittenBody = rewriteDevToolsJson(body, publicHost)
        const headers = { ...proxyRes.headers, 'content-length': Buffer.byteLength(rewrittenBody) }

        res.writeHead(proxyRes.statusCode || 502, headers)
        res.end(rewrittenBody)
      })
    },
  )

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`proxy error: ${error.message}`)
  })

  req.pipe(proxyReq)
})

server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(TARGET_PORT, TARGET_HOST, () => {
    const headerLines = Object.entries({
      ...req.headers,
      host: TARGET_HOST_HEADER,
      connection: 'Upgrade',
      upgrade: req.headers.upgrade || 'websocket',
    })
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n')

    upstream.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headerLines}\r\n\r\n`,
    )

    if (head?.length) {
      upstream.write(head)
    }

    socket.pipe(upstream)
    upstream.pipe(socket)
  })

  upstream.on('error', () => socket.destroy())
  socket.on('error', () => upstream.destroy())
})

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`DevTools proxy listening on :${LISTEN_PORT}`)
})
