(function attachHeartbeatLocation(root) {
  async function cityFromCurrentCoordinates(latitude, longitude, options = {}) {
    const fetchImpl = options.fetchImpl || root.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('当前环境无法连接城市识别服务');
    const endpoint = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    endpoint.searchParams.set('latitude', String(latitude));
    endpoint.searchParams.set('longitude', String(longitude));
    endpoint.searchParams.set('localityLanguage', 'zh');
    const controller = new AbortController();
    const timeout = root.setTimeout(() => controller.abort(), Number(options.timeoutMs) || 9000);
    try {
      const response = await fetchImpl(endpoint.toString(), { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`城市识别服务返回 ${response.status}`);
      const data = await response.json();
      const city = String(data.city || data.locality || data.principalSubdivision || '').trim().slice(0, 40);
      if (!city) throw new Error('城市识别结果为空');
      return city;
    } finally {
      root.clearTimeout(timeout);
    }
  }

  const api = { cityFromCurrentCoordinates };
  root.HeartbeatLocation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
