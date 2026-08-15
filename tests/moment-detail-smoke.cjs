const assert = require('assert');
const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, '..', 'app');
const html = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(webRoot, 'app.js'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

assert.equal(ids.length, new Set(ids).size, 'HTML must not contain duplicate ids');
['momentDetailDialog', 'momentDetailContent', 'momentDetailClose'].forEach((id) => {
  assert(html.includes(`id="${id}"`), `missing ${id}`);
});
assert(app.includes('data-open-moment'), 'calendar day cards must expose a post-detail action');
assert(app.includes('openMomentDetail(momentTarget.dataset.openMoment)'), 'post-detail action must be wired');
assert(app.includes("$('#momentDetailContent').addEventListener('submit'"), 'detail comments must be wired');
assert(app.includes("event.target.closest('[data-delete-comment]')"), 'detail comment deletion must be wired');

console.log('moment detail smoke test passed');
