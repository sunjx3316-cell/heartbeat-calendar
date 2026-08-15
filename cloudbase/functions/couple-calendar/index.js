const crypto = require('crypto');
const cloudbase = require('@cloudbase/node-sdk');

// Each self-hosted deployment supplies its own environment ID. Never put a
// real environment ID or API key in this repository.
const ENV_ID = String(process.env.CLOUDBASE_ENV_ID || process.env.TCB_ENV || '').trim();
// Keep the server key only inside the function process. PostgreSQL REST uses
// it as service_role. It is never returned to or embedded in the browser.
const serviceApiKey = String(process.env.CLOUDBASE_APIKEY || '');
const RDB_REST_BASE = ENV_ID ? `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/v1` : '';
let app;
function requireEnvironmentId() {
  if (!ENV_ID) throw new Error('云函数未配置 CLOUDBASE_ENV_ID。请在云函数环境变量中填写当前 CloudBase 环境 ID。');
}
function initialiseCloud(context) {
  requireEnvironmentId();
  // Storage should use the Cloud Function runtime identity. Hiding the API
  // key before SDK init prevents the old Node SDK from attempting to verify
  // that JWT locally (the source of INVALID_ACCESS_TOKEN).
  delete process.env.CLOUDBASE_APIKEY;
  app = cloudbase.init({
    env: ENV_ID,
    context
  });
}
const SPACES = 'heartbeat_spaces';
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const random = (bytes = 18) => crypto.randomBytes(bytes).toString('base64url');
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const now = () => new Date().toISOString();
const fail = (message) => ({ ok: false, message });

function inviteCode() {
  // Hex is deliberately used here instead of base64url: removing "-" and
  // "_" from base64url could occasionally create a too-short code.
  return `LOVE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function cleanLiveStatus(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return null;
  const text = String(value.text || '').trim().slice(0, 20);
  if (!text) return null;
  return {
    emoji: String(value.emoji || '💭').slice(0, 16),
    text,
    presetId: String(value.presetId || '').slice(0, 12),
    createdAt: String(value.createdAt || now()).slice(0, 32),
    expiresAt: value.expiresAt ? String(value.expiresAt).slice(0, 32) : '',
    duration: ['1h', '4h', 'today', 'until'].includes(value.duration) ? value.duration : 'until'
  };
}

function cleanStatuses(value) {
  if (!value || typeof value !== 'object') return {};
  const statuses = {};
  ['owner', 'partner'].forEach((role) => {
    if (Object.prototype.hasOwnProperty.call(value, role)) statuses[role] = cleanLiveStatus(value[role]);
  });
  return statuses;
}

function cleanLocation(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return null;
  const lat = Number(value.lat), lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    // The client already rounds before sending. Rounding again guarantees
    // that precise GPS coordinates can never be persisted by a modified app.
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
    city: String(value.city || '').trim().slice(0, 40),
    source: ['gps-city', 'gps-unknown'].includes(value.source) ? value.source : '',
    timezone: String(value.timezone || '').trim().slice(0, 64),
    updatedAt: String(value.updatedAt || now()).slice(0, 32)
  };
}

function cleanLocations(value) {
  if (!value || typeof value !== 'object') return {};
  const locations = {};
  ['owner', 'partner'].forEach((role) => {
    if (Object.prototype.hasOwnProperty.call(value, role)) locations[role] = cleanLocation(value[role]);
  });
  return locations;
}

function cleanSnapshot(snapshot = {}) {
  const sourceProfile = snapshot.coupleProfile && typeof snapshot.coupleProfile === 'object' ? snapshot.coupleProfile : {};
  const coupleProfile = {
    complete: true,
    myName: String(sourceProfile.myName || '').slice(0, 32),
    partnerName: String(sourceProfile.partnerName || '').slice(0, 32),
    myNickname: String(sourceProfile.myNickname || '').slice(0, 32),
    partnerNickname: String(sourceProfile.partnerNickname || '').slice(0, 32),
    myGender: ['female', 'male'].includes(sourceProfile.myGender) ? sourceProfile.myGender : '',
    partnerGender: ['female', 'male'].includes(sourceProfile.partnerGender) ? sourceProfile.partnerGender : '',
    loveStart: String(sourceProfile.loveStart || '').slice(0, 10),
    longDistance: sourceProfile.longDistance === true
  };
  const inferRole = (item) => {
    if (item.authorRole === 'owner' || item.authorRole === 'partner') return item.authorRole;
    if (item.author && item.author === coupleProfile.partnerName) return 'partner';
    if (item.author && item.author === coupleProfile.myName) return 'owner';
    return '';
  };
  const moments = Array.isArray(snapshot.moments)
    ? snapshot.moments.slice(0, 1200).map((item) => ({
        id: String(item.id || random(9)).slice(0, 96),
        date: String(item.date || '').slice(0, 10),
        type: ['diary', 'date', 'anniversary'].includes(item.type) ? item.type : 'diary',
        title: String(item.title || '').slice(0, 80),
        note: String(item.note || '').slice(0, 1000),
        author: String(item.author || '').slice(0, 32),
        authorRole: inferRole(item),
        photos: (Array.isArray(item.photos) ? item.photos : [])
          .filter((fileID) => String(fileID).startsWith('cloud://'))
          .slice(0, 9),
        seenBy: [...new Set((Array.isArray(item.seenBy) ? item.seenBy : []).filter((role) => role === 'owner' || role === 'partner'))],
        comments: (Array.isArray(item.comments) ? item.comments : []).slice(0, 80).map((comment) => ({
          id: String(comment.id || random(9)).slice(0, 96),
          body: String(comment.body || '').trim().slice(0, 300),
          author: String(comment.author || '').slice(0, 32),
          authorRole: comment.authorRole === 'partner' ? 'partner' : comment.authorRole === 'owner' ? 'owner' : '',
          createdAt: String(comment.createdAt || now()).slice(0, 32)
        })).filter((comment) => comment.body),
        deletedCommentIds: [...new Set((Array.isArray(item.deletedCommentIds) ? item.deletedCommentIds : [])
          .map((id) => String(id || '').slice(0, 96))
          .filter(Boolean))].slice(-160),
        createdAt: String(item.createdAt || now()).slice(0, 32)
      }))
    : [];

  return {
    coupleProfile,
    moments,
    deletedMomentIds: [...new Set((Array.isArray(snapshot.deletedMomentIds) ? snapshot.deletedMomentIds : [])
      .map((id) => String(id || '').slice(0, 96))
      .filter(Boolean))].slice(-1200),
    remote: snapshot.remote && typeof snapshot.remote === 'object' ? snapshot.remote : {},
    cycle: snapshot.cycle && snapshot.cycle.shared === true ? snapshot.cycle : null,
    moods: snapshot.moods && typeof snapshot.moods === 'object' ? snapshot.moods : {},
    statuses: cleanStatuses(snapshot.statuses),
    locations: cleanLocations(snapshot.locations)
  };
}

function memberName(profile, memberRole) {
  return memberRole === 'partner' ? profile.partnerName : profile.myName;
}

function momentRole(moment, profile) {
  if (moment.authorRole === 'owner' || moment.authorRole === 'partner') return moment.authorRole;
  if (moment.author && moment.author === profile.partnerName) return 'partner';
  return 'owner';
}

function commentRole(comment, profile) {
  if (comment.authorRole === 'owner' || comment.authorRole === 'partner') return comment.authorRole;
  if (comment.author && comment.author === profile.partnerName) return 'partner';
  if (comment.author && comment.author === profile.myName) return 'owner';
  return '';
}

function mergeComments(previousMoment = {}, incomingMoment = {}, memberRole, profile) {
  const previous = Array.isArray(previousMoment.comments) ? previousMoment.comments : [];
  const incoming = Array.isArray(incomingMoment.comments) ? incomingMoment.comments : [];
  const previousById = new Map(previous.map((comment) => [comment.id, comment]));
  const deletedIds = new Set(Array.isArray(previousMoment.deletedCommentIds) ? previousMoment.deletedCommentIds : []);

  // Comment deletion is explicit and personal. Omitting a comment from an old
  // device is not deletion, and a caller can tombstone only their own comment.
  (Array.isArray(incomingMoment.deletedCommentIds) ? incomingMoment.deletedCommentIds : []).forEach((id) => {
    const oldComment = previousById.get(id);
    if (oldComment && commentRole(oldComment, profile) === memberRole) deletedIds.add(id);
  });

  const merged = new Map(previous
    .filter((comment) => !deletedIds.has(comment.id))
    .map((comment) => [comment.id, comment]));
  incoming.forEach((comment) => {
    if (deletedIds.has(comment.id) || merged.has(comment.id)) return;
    merged.set(comment.id, {
      ...comment,
      authorRole: memberRole,
      author: memberName(profile, memberRole)
    });
  });
  return {
    comments: [...merged.values()].slice(-80),
    deletedCommentIds: [...deletedIds].slice(-160)
  };
}

function mergeMemberSnapshot(previousSnapshot, incomingSnapshot, memberRole) {
  const previous = cleanSnapshot(previousSnapshot || {});
  const incoming = cleanSnapshot(incomingSnapshot || {});
  // The database stores the creator-first profile order. A partner device
  // uses a locally mirrored profile, so only the creator may replace this
  // canonical pair metadata. This also keeps older clients from reversing it.
  const hasPreviousProfile = previous.coupleProfile.myName && previous.coupleProfile.partnerName;
  const profile = memberRole === 'partner' && hasPreviousProfile
    ? previous.coupleProfile
    : incoming.coupleProfile.myName && incoming.coupleProfile.partnerName
      ? incoming.coupleProfile
      : previous.coupleProfile;
  incoming.coupleProfile = profile;
  const incomingStatuses = incoming.statuses || {};
  incoming.statuses = { ...(previous.statuses || {}) };
  // A status belongs to one person, just like a personal key. A caller may
  // update or clear only their own role; missing data from an older client
  // must not erase either person's current status.
  if (Object.prototype.hasOwnProperty.call(incomingStatuses, memberRole)) {
    incoming.statuses[memberRole] = incomingStatuses[memberRole];
  }
  const incomingLocations = incoming.locations || {};
  incoming.locations = { ...(previous.locations || {}) };
  // Each member can refresh only their own city-level position. A stale or
  // modified client cannot replace the other member's location.
  if (Object.prototype.hasOwnProperty.call(incomingLocations, memberRole)) {
    incoming.locations[memberRole] = incomingLocations[memberRole];
  }
  const oldById = new Map(previous.moments.map((moment) => [moment.id, moment]));
  const nextById = new Map();
  const deletedIds = new Set(previous.deletedMomentIds || []);
  (incoming.deletedMomentIds || []).forEach((id) => {
    const oldMoment = oldById.get(id);
    if (oldMoment && momentRole(oldMoment, previous.coupleProfile) === memberRole) deletedIds.add(id);
  });

  incoming.moments.forEach((moment) => {
    if (deletedIds.has(moment.id)) return;
    const oldMoment = oldById.get(moment.id);
    if (!oldMoment) {
      const mergedComments = mergeComments({}, moment, memberRole, profile);
      nextById.set(moment.id, {
        ...moment,
        authorRole: memberRole,
        author: memberName(profile, memberRole),
        seenBy: [...new Set([...(moment.seenBy || []), memberRole])],
        ...mergedComments
      });
      return;
    }

    const oldRole = momentRole(oldMoment, previous.coupleProfile);
    const editable = oldRole === memberRole;
    const base = editable ? moment : oldMoment;
    const mergedComments = mergeComments(oldMoment, moment, memberRole, profile);
    nextById.set(moment.id, {
      ...base,
      authorRole: oldRole,
      author: oldMoment.author || memberName(profile, oldRole),
      seenBy: [...new Set([...(oldMoment.seenBy || []), ...(moment.seenBy || [])])],
      ...mergedComments
    });
  });

  previous.moments.forEach((oldMoment) => {
    if (nextById.has(oldMoment.id)) return;
    // Omission can come from an empty or stale device, so it is never treated
    // as deletion. Only an explicit, role-checked tombstone can delete a post.
    if (!deletedIds.has(oldMoment.id)) nextById.set(oldMoment.id, oldMoment);
  });

  incoming.moments = [...nextById.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  incoming.deletedMomentIds = [...deletedIds].slice(-1200);
  return incoming;
}

async function rdbRequest(path, options = {}) {
  requireEnvironmentId();
  if (!serviceApiKey) throw new Error('云函数尚未绑定服务端 API Key');
  const response = await fetch(`${RDB_REST_BASE}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${serviceApiKey}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'public',
      'Content-Profile': 'public',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch (_) { body = text; }
  }
  if (!response.ok) {
    const message = body && typeof body === 'object' ? (body.message || body.error || JSON.stringify(body)) : (body || `HTTP ${response.status}`);
    throw new Error(`云数据库请求失败：${message}`);
  }
  return body;
}

function queryValue(value) {
  return encodeURIComponent(`eq.${String(value)}`);
}

async function findSpaceById(spaceId) {
  const data = await rdbRequest(`${SPACES}?select=*&id=${queryValue(spaceId)}&limit=1`);
  return Array.isArray(data) ? data[0] : null;
}

async function findSpaceByInvite(code) {
  const data = await rdbRequest(`${SPACES}?select=*&invite_hash=${queryValue(hash(code))}&limit=1`);
  return Array.isArray(data) ? data[0] : null;
}

async function updateSpace(spaceId, data) {
  await rdbRequest(`${SPACES}?id=${queryValue(spaceId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
}

async function insertSpace(data) {
  await rdbRequest(SPACES, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
}

async function spaceFromSession(session = {}) {
  if (!session.spaceId || !session.memberToken) throw new Error('缺少情侣空间凭证');
  const space = await findSpaceById(session.spaceId);
  if (!space) throw new Error('情侣空间不存在');

  const tokenHash = hash(session.memberToken);
  if (tokenHash !== space.owner_token_hash && tokenHash !== space.partner_token_hash) {
    throw new Error('这台设备没有该情侣空间的访问权限');
  }
  return { space, memberRole: tokenHash === space.owner_token_hash ? 'owner' : 'partner' };
}

function readableError(error) {
  const message = String((error && (error.message || error.error_description)) || error || '');
  const code = String((error && error.code) || '');
  if (/RESOURCE_NOT_FOUND|not found|model/i.test(`${code} ${message}`)) {
    return '云数据库还没建好：请在“SQL 型数据库”中创建表 heartbeat_spaces';
  }
  return message || '云端服务暂时不可用';
}

function photoBuffer(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('图片格式不支持，请选择 JPG、PNG 或 WebP 图片');
  const content = Buffer.from(match[2], 'base64');
  if (!content.length || content.length > MAX_PHOTO_BYTES) throw new Error('图片文件过大，请选择小于 4MB 的图片');
  return { content, suffix: match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase() };
}

exports.main = async (event = {}, context = {}) => {
  try {
    initialiseCloud(context);
    if (event.action === 'create') {
      const spaceId = crypto.randomUUID();
      const memberToken = random(32);
      const code = inviteCode();
      const snapshot = cleanSnapshot(event.seed);

      await insertSpace({
        id: spaceId,
        invite_hash: hash(code),
        owner_token_hash: hash(memberToken),
        partner_token_hash: null,
        snapshot,
        revision: 1
      });

      return { ok: true, session: { spaceId, memberToken }, memberRole: 'owner', inviteCode: code, snapshot, revision: 1 };
    }

    if (event.action === 'join') {
      const code = String(event.inviteCode || '').trim().toUpperCase();
      if (!code) return fail('请输入对方发来的邀请码');

      const space = await findSpaceByInvite(code);
      if (!space) return fail('邀请码不正确或已失效');
      if (space.partner_token_hash) return fail('这个情侣空间已经有两位成员');

      const memberToken = random(32);
      await updateSpace(space.id, { partner_token_hash: hash(memberToken) });
      return {
        ok: true,
        session: { spaceId: space.id, memberToken },
        snapshot: space.snapshot || {},
        revision: Number(space.revision || 1),
        memberRole: 'partner'
      };
    }

    const { space, memberRole } = await spaceFromSession(event.session);

    if (event.action === 'newInvite') {
      if (memberRole !== 'owner') return fail('只有创建情侣空间的人可以生成邀请码');
      if (space.partner_token_hash) return fail('这个情侣空间已经有另一位成员，无需再生成邀请码');
      const code = inviteCode();
      await updateSpace(space.id, { invite_hash: hash(code) });
      return { ok: true, inviteCode: code, memberRole };
    }

    if (event.action === 'uploadPhoto') {
      const image = photoBuffer(event.dataUrl);
      const cloudPath = `heartbeat-calendar/${space.id}/${random(18)}.${image.suffix}`;
      const result = await app.uploadFile({ cloudPath, fileContent: image.content });
      if (!result || !result.fileID) throw new Error('云存储没有返回照片标识');
      return { ok: true, fileID: result.fileID, memberRole };
    }

    if (event.action === 'getPhotoUrls') {
      const prefix = `/heartbeat-calendar/${space.id}/`;
      const fileList = (Array.isArray(event.fileIDs) ? event.fileIDs : [])
        .filter((fileID) => String(fileID).includes(prefix))
        .slice(0, 120);
      if (!fileList.length) return { ok: true, fileList: [], memberRole };
      const result = await app.getTempFileURL({ fileList });
      return { ok: true, fileList: result.fileList || [], memberRole };
    }

    if (event.action === 'pull') {
      return { ok: true, snapshot: space.snapshot || {}, revision: Number(space.revision || 1), memberRole };
    }

    if (event.action === 'push') {
      const snapshot = mergeMemberSnapshot(space.snapshot || {}, event.snapshot, memberRole);
      const revision = Number(space.revision || 1) + 1;
      await updateSpace(space.id, { snapshot, revision });
      return { ok: true, snapshot, revision, memberRole };
    }

    if (event.action === 'deletePhotos') {
      const files = (Array.isArray(event.fileIDs) ? event.fileIDs : []).filter((fileID) =>
        String(fileID).includes(`/heartbeat-calendar/${space.id}/`)
      );
      if (files.length) await app.deleteFile({ fileList: files });
      return { ok: true, memberRole };
    }

    return fail('不支持的操作');
  } catch (error) {
    console.error(error);
    return fail(readableError(error));
  }
};
