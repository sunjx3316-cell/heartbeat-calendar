const assert = require('node:assert/strict');
const { cityFromCurrentCoordinates } = require('../app/location-utils.js');

async function main() {
  let requestedUrl = '';
  const city = await cityFromCurrentCoordinates(30.2741, 120.1551, {
    timeoutMs: 100,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ({ city: '杭州市', locality: '西湖区' }) };
    }
  });
  assert.equal(city, '杭州市');
  const parsed = new URL(requestedUrl);
  assert.equal(parsed.hostname, 'api.bigdatacloud.net');
  assert.equal(parsed.searchParams.get('latitude'), '30.2741');
  assert.equal(parsed.searchParams.get('longitude'), '120.1551');
  assert.equal(parsed.searchParams.get('localityLanguage'), 'zh');

  await assert.rejects(
    () => cityFromCurrentCoordinates(30.2741, 120.1551, {
      timeoutMs: 100,
      fetchImpl: async () => ({ ok: true, json: async () => ({}) })
    }),
    /城市识别结果为空/
  );
  console.log('location reverse-geocoding smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
