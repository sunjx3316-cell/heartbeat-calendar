const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud-client.js'), 'utf8');
const sandbox = {
  window: { HEARTBEAT_CONFIG: {} },
  crypto: { getRandomValues: (bytes) => bytes },
  Uint8Array,
  String,
  Array,
  Object,
  JSON,
  Error,
  Promise,
  console
};
vm.runInNewContext(source, sandbox, { filename: 'cloud-client.js' });

assert.equal(sandbox.window.HeartbeatCloud.environmentId, '');
assert.rejects(
  () => sandbox.window.HeartbeatCloud.initialise(),
  /尚未配置云端/
).then(() => console.log('blank client configuration guard smoke test passed'));
