# chrome-headless-image

Chrome listens on `127.0.0.1:9223` inside the container.

A tiny built-in Node proxy listens on `0.0.0.0:9222` and forwards both HTTP and WebSocket DevTools traffic to Chrome while rewriting the `Host` header to `127.0.0.1:9223`.

Build:

```bash
docker build -t chrome-headless .
```

Run:

```bash
docker run --rm -p 9222:9222 chrome-headless
```

Verify:

```bash
curl http://127.0.0.1:9222/json/version
```
