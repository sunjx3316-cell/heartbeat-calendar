const assert = require('node:assert/strict');
const { localDateKey } = require('../app/calendar-date.js');

assert.equal(localDateKey(new Date(2026, 7, 15, 0, 1)), '2026-08-15');
assert.equal(localDateKey(new Date(2026, 7, 15, 7, 40)), '2026-08-15');
assert.equal(localDateKey(new Date(2026, 7, 15, 23, 59)), '2026-08-15');
assert.equal(localDateKey(new Date(2027, 0, 1, 0, 0)), '2027-01-01');

console.log('calendar local-date smoke test passed');
