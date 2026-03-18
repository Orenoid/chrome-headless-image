FROM --platform=$BUILDPLATFORM node:24

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    ca-certificates curl wget gnupg fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 \
    libcups2 libdbus-1-3 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libvulkan1 libxcomposite1 libxdamage1 libxfixes3 \
    libxkbcommon0 libxrandr2 xdg-utils \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH

RUN if [ "$TARGETARCH" = "amd64" ]; then \
        wget -q -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
        apt-get update && apt-get install -y ./chrome.deb && rm -f chrome.deb && \
        ln -sf /usr/bin/google-chrome /usr/bin/chromium-browser; \
    else \
        apt-get update && apt-get install -y chromium && \
        ln -sf /usr/bin/chromium /usr/bin/chromium-browser; \
    fi && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /tmp/chrome-profile

COPY devtools-proxy.mjs /app/devtools-proxy.mjs

EXPOSE 9222

CMD ["/bin/bash", "-lc", "chromium-browser --headless=new --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --no-first-run --no-default-browser-check --user-data-dir=/tmp/chrome-profile --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 about:blank & node /app/devtools-proxy.mjs"]
