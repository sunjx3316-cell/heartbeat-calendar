const assert = require('assert');
const fs = require('fs');
const path = require('path');

const records = new Map();
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

function selectQuery(field, value) {
  return {
    limit: async () => ({ data: [...records.values()].filter((item) => item[field] === value).slice(0, 1).map(clone), error: null })
  };
}

function tableClient() {
  return {
    insert: async (data) => {
      assert(!records.has(data.id));
      records.set(data.id, clone(data));
      return { error: null };
    },
    select: () => ({ eq: (field, value) => selectQuery(field, value) }),
    update: (data) => ({
      eq: async (field, value) => {
        const existing = [...records.values()].find((item) => item[field] === value);
        assert(existing);
        records.set(existing.id, { ...existing, ...clone(data) });
        return { error: null };
      }
    })
  };
}

const fakeApp = {
  rdb() { return { from: () => tableClient() }; },
  async deleteFile() { return { fileList: [] }; },
  async uploadFile({ cloudPath, fileContent }) {
    assert.match(cloudPath, /^heartbeat-calendar\/[0-9a-f-]+\/[A-Za-z0-9_-]+\.jpg$/);
    assert(fileContent.length > 0);
    return { fileID: `cloud://test.bucket/${cloudPath}` };
  },
  async getTempFileURL({ fileList }) {
    return { fileList: fileList.map((fileID) => ({ fileID, tempFileURL: `https://photos.example/${encodeURIComponent(fileID)}` })) };
  }
};
const fakeCloudbase = {
  SYMBOL_CURRENT_ENV: 'test-env',
  SYMBOL_DEFAULT_ENV: 'test-env',
  init() { return fakeApp; }
};

process.env.CLOUDBASE_APIKEY = 'test-service-api-key';
process.env.CLOUDBASE_ENV_ID = 'test-env';
global.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  const method = String(options.method || 'GET').toUpperCase();
  const idFilter = url.searchParams.get('id');
  const inviteFilter = url.searchParams.get('invite_hash');
  const filterValue = (value) => value && value.startsWith('eq.') ? value.slice(3) : value;
  let body = null;
  let status = 200;

  if (method === 'GET') {
    const items = [...records.values()].filter((item) => {
      if (idFilter) return item.id === filterValue(idFilter);
      if (inviteFilter) return item.invite_hash === filterValue(inviteFilter);
      return true;
    });
    body = items.slice(0, Number(url.searchParams.get('limit') || items.length)).map(clone);
  } else if (method === 'POST') {
    const item = JSON.parse(options.body || '{}');
    assert(!records.has(item.id));
    records.set(item.id, clone(item));
  } else if (method === 'PATCH') {
    const id = filterValue(idFilter);
    const existing = records.get(id);
    assert(existing);
    records.set(id, { ...existing, ...clone(JSON.parse(options.body || '{}')) });
  } else {
    status = 405;
    body = { message: 'unsupported test method' };
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return body == null ? '' : JSON.stringify(body); }
  };
};

const sourcePath = path.join(__dirname, '..', 'cloudbase', 'functions', 'couple-calendar', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const moduleBox = { exports: {} };
const localRequire = (name) => (name === '@cloudbase/node-sdk' ? fakeCloudbase : require(name));
new Function('exports', 'require', 'module', '__filename', '__dirname', 'console', source)(
  moduleBox.exports,
  localRequire,
  moduleBox,
  sourcePath,
  path.dirname(sourcePath),
  { log: console.log, error() {} }
);

async function run() {
  const api = moduleBox.exports.main;
  const created = await api({
    action: 'create',
    seed: {
      coupleProfile: { myName: 'A', partnerName: 'B', myNickname: 'Alpha', partnerNickname: 'Beta', myGender: 'male', partnerGender: 'female', loveStart: '2026-08-13', longDistance: true },
      moments: [{ id: 'm1', date: '2026-08-13', note: 'hello', photos: ['cloud://ok/photo.jpg', 'data:image/png;base64,bad'] }]
    }
  });
  assert.equal(created.ok, true);
  assert.equal(created.memberRole, 'owner');
  assert.match(created.inviteCode, /^LOVE-[A-F0-9]{8}$/);
  assert.deepEqual(created.snapshot.moments[0].photos, ['cloud://ok/photo.jpg']);
  assert.equal(created.snapshot.coupleProfile.partnerName, 'B');

  const joined = await api({ action: 'join', inviteCode: created.inviteCode });
  assert.equal(joined.ok, true);
  assert.equal(joined.memberRole, 'partner');
  assert.notEqual(joined.session.memberToken, created.session.memberToken);

  const invalidInvite = await api({ action: 'join', inviteCode: 'LOVE-SIQI' });
  assert.equal(invalidInvite.ok, false);
  assert.match(invalidInvite.message, /邀请码不正确/);

  const secondSpace = await api({ action: 'create', seed: {} });
  const replacedInvite = await api({ action: 'newInvite', session: secondSpace.session });
  assert.equal(replacedInvite.ok, true);
  assert.match(replacedInvite.inviteCode, /^LOVE-[A-F0-9]{8}$/);
  assert.notEqual(replacedInvite.inviteCode, secondSpace.inviteCode);
  const partnerCannotReplace = await api({ action: 'newInvite', session: joined.session });
  assert.equal(partnerCannotReplace.ok, false);
  assert.match(partnerCannotReplace.message, /只有创建/);

  const pushed = await api({
    action: 'push',
    session: created.session,
    snapshot: { moments: [{ id: 'm2', date: '2026-08-14', note: 'shared' }] }
  });
  assert.equal(pushed.revision, 2);

  const pulled = await api({ action: 'pull', session: joined.session });
  assert.equal(pulled.ok, true);
  assert(pulled.snapshot.moments.some((moment) => moment.note === 'shared'));
  assert(pulled.snapshot.moments.some((moment) => moment.id === 'm1'));
  assert.equal(pulled.revision, 2);
  assert.equal(pulled.memberRole, 'partner');

  const partnerCommented = await api({
    action: 'push',
    session: joined.session,
    snapshot: {
      ...pulled.snapshot,
      moments: pulled.snapshot.moments.map((moment) => moment.id === 'm2' ? ({
        ...moment,
        seenBy: ['partner'],
        comments: [{ id: 'c1', body: '我看到啦', author: 'fake-name', authorRole: 'owner', createdAt: '2026-08-14T08:00:00.000Z' }]
      }) : moment)
    }
  });
  const commentedMoment = partnerCommented.snapshot.moments.find((moment) => moment.id === 'm2');
  assert.equal(commentedMoment.comments[0].authorRole, 'partner');
  assert.equal(commentedMoment.comments[0].author, 'B');
  assert.deepEqual(commentedMoment.seenBy, ['owner', 'partner']);

  // A comment is personal even when it is attached to the other person's
  // post. The post author cannot remove the partner's comment.
  const ownerTriedDeletePartnerComment = await api({
    action: 'push', session: created.session,
    snapshot: {
      ...partnerCommented.snapshot,
      moments: partnerCommented.snapshot.moments.map((moment) => moment.id === 'm2'
        ? { ...moment, comments: [], deletedCommentIds: ['c1'] }
        : moment)
    }
  });
  assert(ownerTriedDeletePartnerComment.snapshot.moments.find((moment) => moment.id === 'm2').comments.some((comment) => comment.id === 'c1'));

  const partnerDeletedOwnComment = await api({
    action: 'push', session: joined.session,
    snapshot: {
      ...ownerTriedDeletePartnerComment.snapshot,
      moments: ownerTriedDeletePartnerComment.snapshot.moments.map((moment) => moment.id === 'm2'
        ? { ...moment, comments: [], deletedCommentIds: ['c1'] }
        : moment)
    }
  });
  const commentDeletedMoment = partnerDeletedOwnComment.snapshot.moments.find((moment) => moment.id === 'm2');
  assert(!commentDeletedMoment.comments.some((comment) => comment.id === 'c1'));
  assert(commentDeletedMoment.deletedCommentIds.includes('c1'));

  // A stale device still carrying the removed comment cannot resurrect it.
  const staleCommentPush = await api({
    action: 'push', session: created.session,
    snapshot: partnerCommented.snapshot
  });
  assert(!staleCommentPush.snapshot.moments.find((moment) => moment.id === 'm2').comments.some((comment) => comment.id === 'c1'));

  const ownerCommented = await api({
    action: 'push', session: created.session,
    snapshot: {
      ...staleCommentPush.snapshot,
      moments: staleCommentPush.snapshot.moments.map((moment) => moment.id === 'm2'
        ? { ...moment, comments: [...moment.comments, { id: 'c2', body: '我的评论', author: 'spoofed', authorRole: 'partner', createdAt: '2026-08-14T08:01:00.000Z' }] }
        : moment)
    }
  });
  assert.equal(ownerCommented.snapshot.moments.find((moment) => moment.id === 'm2').comments.find((comment) => comment.id === 'c2').authorRole, 'owner');

  const partnerTriedDeleteOwnerComment = await api({
    action: 'push', session: joined.session,
    snapshot: {
      ...ownerCommented.snapshot,
      moments: ownerCommented.snapshot.moments.map((moment) => moment.id === 'm2'
        ? { ...moment, comments: [], deletedCommentIds: [...moment.deletedCommentIds, 'c2'] }
        : moment)
    }
  });
  assert(partnerTriedDeleteOwnerComment.snapshot.moments.find((moment) => moment.id === 'm2').comments.some((comment) => comment.id === 'c2'));

  const ownerDeletedOwnComment = await api({
    action: 'push', session: created.session,
    snapshot: {
      ...partnerTriedDeleteOwnerComment.snapshot,
      moments: partnerTriedDeleteOwnerComment.snapshot.moments.map((moment) => moment.id === 'm2'
        ? { ...moment, comments: [], deletedCommentIds: [...moment.deletedCommentIds, 'c2'] }
        : moment)
    }
  });
  assert(!ownerDeletedOwnComment.snapshot.moments.find((moment) => moment.id === 'm2').comments.some((comment) => comment.id === 'c2'));

  const ownerSetStatus = await api({
    action: 'push', session: created.session,
    snapshot: { ...ownerDeletedOwnComment.snapshot, statuses: {
      owner: { emoji:'🎧', text:'专注中', presetId:'A3', createdAt:'2026-08-14T08:05:00.000Z', duration:'4h', expiresAt:'2026-08-14T12:05:00.000Z' },
      partner: { emoji:'😈', text:'伪造对方状态', duration:'until' }
    } }
  });
  assert.equal(ownerSetStatus.snapshot.statuses.owner.text, '专注中');
  assert.equal(ownerSetStatus.snapshot.statuses.partner, undefined);

  const partnerSetStatus = await api({
    action: 'push', session: joined.session,
    snapshot: { ...ownerSetStatus.snapshot, statuses: {
      owner: { emoji:'😈', text:'覆盖创建方', duration:'until' },
      partner: { emoji:'🥺', text:'想你了', presetId:'B1', createdAt:'2026-08-14T08:06:00.000Z', duration:'today', expiresAt:'2026-08-14T15:59:59.000Z' }
    } }
  });
  assert.equal(partnerSetStatus.snapshot.statuses.owner.text, '专注中');
  assert.equal(partnerSetStatus.snapshot.statuses.partner.text, '想你了');

  const ownerRefreshedLocation = await api({
    action: 'push', session: created.session,
    snapshot: { ...partnerSetStatus.snapshot, locations: {
      owner: { lat: 31.23456, lng: 121.47891, city: '上海', source: 'gps-city', timezone: 'Asia/Shanghai', updatedAt: '2026-08-14T08:07:00.000Z' },
      partner: { lat: 0, lng: 0, city: '伪造对象位置', updatedAt: '2026-08-14T08:07:00.000Z' }
    } }
  });
  assert.deepEqual(ownerRefreshedLocation.snapshot.locations.owner, { lat: 31.23, lng: 121.48, city: '上海', source: 'gps-city', timezone: 'Asia/Shanghai', updatedAt: '2026-08-14T08:07:00.000Z' });
  assert.equal(ownerRefreshedLocation.snapshot.locations.partner, undefined);

  const partnerRefreshedLocation = await api({
    action: 'push', session: joined.session,
    snapshot: { ...ownerRefreshedLocation.snapshot, locations: {
      owner: { lat: 0, lng: 0, city: '伪造机主位置', updatedAt: '2026-08-14T08:08:00.000Z' },
      partner: { lat: 39.9042, lng: 116.4074, city: '北京', source: 'gps-city', timezone: 'Asia/Shanghai', updatedAt: '2026-08-14T08:08:00.000Z' }
    } }
  });
  assert.equal(partnerRefreshedLocation.snapshot.locations.owner.city, '上海');
  assert.deepEqual(partnerRefreshedLocation.snapshot.locations.partner, { lat: 39.9, lng: 116.41, city: '北京', source: 'gps-city', timezone: 'Asia/Shanghai', updatedAt: '2026-08-14T08:08:00.000Z' });

  // An older client does not have a statuses field. Its next write must keep
  // both existing statuses and locations instead of treating omission as clearing.
  const oldClientPush = await api({
    action: 'push', session: created.session,
    snapshot: { moments: partnerRefreshedLocation.snapshot.moments, coupleProfile: partnerRefreshedLocation.snapshot.coupleProfile }
  });
  assert.equal(oldClientPush.snapshot.statuses.owner.text, '专注中');
  assert.equal(oldClientPush.snapshot.statuses.partner.text, '想你了');
  assert.equal(oldClientPush.snapshot.locations.owner.city, '上海');
  assert.equal(oldClientPush.snapshot.locations.partner.city, '北京');

  // The partner cannot delete the creator's post by omitting it from a stale
  // or manipulated snapshot. The server restores it automatically.
  const partnerTriedDelete = await api({ action: 'push', session: joined.session, snapshot: { ...oldClientPush.snapshot, moments: [] } });
  assert.equal(partnerTriedDelete.snapshot.moments.length, 2);
  assert(partnerTriedDelete.snapshot.moments.some((moment) => moment.id === 'm1'));
  assert(partnerTriedDelete.snapshot.moments.some((moment) => moment.id === 'm2'));

  // An explicit tombstone from the original author is the only operation
  // that removes a post. This distinguishes deletion from a stale device.
  const ownerDeletedOldPost = await api({
    action: 'push', session: created.session,
    snapshot: { ...partnerTriedDelete.snapshot, moments: partnerTriedDelete.snapshot.moments.filter((moment) => moment.id !== 'm1'), deletedMomentIds: ['m1'] }
  });
  assert(!ownerDeletedOldPost.snapshot.moments.some((moment) => moment.id === 'm1'));

  const partnerPosted = await api({
    action: 'push', session: joined.session,
    snapshot: { ...ownerDeletedOldPost.snapshot, moments: [...ownerDeletedOldPost.snapshot.moments, { id: 'm3', date: '2026-08-15', title: 'partner post', author: 'spoofed', authorRole: 'owner' }] }
  });
  const partnerMoment = partnerPosted.snapshot.moments.find((moment) => moment.id === 'm3');
  assert.equal(partnerMoment.authorRole, 'partner');
  assert.equal(partnerMoment.author, 'B');

  const ownerTriedDeletePartner = await api({
    action: 'push', session: created.session,
    snapshot: { ...partnerPosted.snapshot, moments: partnerPosted.snapshot.moments.filter((moment) => moment.id !== 'm3') }
  });
  assert(ownerTriedDeletePartner.snapshot.moments.some((moment) => moment.id === 'm3'));

  // A phone and a computer owned by the same person use the same private
  // member token.  They must both resolve to the creator role, not consume
  // the single partner slot.
  const ownerSecondDevice = await api({ action: 'pull', session: created.session });
  assert.equal(ownerSecondDevice.ok, true);
  assert.equal(ownerSecondDevice.memberRole, 'owner');

  const uploaded = await api({
    action: 'uploadPhoto', session: created.session,
    dataUrl: 'data:image/jpeg;base64,aGVsbG8='
  });
  assert.equal(uploaded.ok, true);
  assert.match(uploaded.fileID, /^cloud:\/\/test\.bucket\/heartbeat-calendar\//);
  const urls = await api({ action: 'getPhotoUrls', session: joined.session, fileIDs: [uploaded.fileID] });
  assert.equal(urls.ok, true);
  assert.equal(urls.fileList[0].fileID, uploaded.fileID);

  const rejected = await api({ action: 'pull', session: { spaceId: created.session.spaceId, memberToken: 'wrong' } });
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /访问权限/);
  console.log('cloud function smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
