const crypto = require('crypto');
const { isDeepStrictEqual } = require('util');
const cloudbase = require('@cloudbase/node-sdk');
const webpush = require('web-push');

// Each self-hosted deployment supplies its own environment ID. Never put a
// real environment ID or API key in this repository.
const ENV_ID = String(process.env.CLOUDBASE_ENV_ID || process.env.TCB_ENV || '').trim();
// Keep the server key only inside the function process. PostgreSQL REST uses
// it as service_role. It is never returned to or embedded in the browser.
const serviceApiKey = String(process.env.CLOUDBASE_APIKEY || '');
const RDB_REST_BASE = ENV_ID ? `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest` : '';
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
// CloudBase Storage limits file-list operations such as getTempFileURL and
// deleteFile to 50 files per request. Batch these operations so long-running
// spaces can keep thousands of photos without failing the whole memory wall.
const MAX_STORAGE_FILES_PER_REQUEST = 50;
const MAX_PUSH_SUBSCRIPTIONS_PER_MEMBER = 8;
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || '').trim();
const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();

const random = (bytes = 18) => crypto.randomBytes(bytes).toString('base64url');
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const now = () => new Date().toISOString();
const fail = (message) => ({ ok: false, message });
const chunk = (items, size = MAX_STORAGE_FILES_PER_REQUEST) => {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
};

function pushConfigured() {
  return Boolean(VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

function cleanPushSubscription(value) {
  if (!value || typeof value !== 'object') return null;
  const endpoint = String(value.endpoint || '').trim();
  const keys = value.keys && typeof value.keys === 'object' ? value.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2048 || !p256dh || !auth || p256dh.length > 256 || auth.length > 128) return null;
  return { endpoint, expirationTime: value.expirationTime == null ? null : Number(value.expirationTime) || null, keys: { p256dh, auth } };
}

function cleanPushSubscriptions(value) {
  const source = value && typeof value === 'object' ? value : {};
  const subscriptions = {};
  ['owner', 'partner'].forEach((role) => {
    const unique = new Map();
    (Array.isArray(source[role]) ? source[role] : []).forEach((item) => {
      const cleaned = cleanPushSubscription(item);
      if (cleaned) unique.set(cleaned.endpoint, cleaned);
    });
    if (unique.size) subscriptions[role] = [...unique.values()].slice(-MAX_PUSH_SUBSCRIPTIONS_PER_MEMBER);
  });
  return subscriptions;
}

function publicSnapshot(snapshot = {}) {
  const result = cleanSnapshot(snapshot);
  delete result.pushSubscriptions;
  return result;
}

function notificationForChange(previousSnapshot, nextSnapshot, actorRole) {
  const before = cleanSnapshot(previousSnapshot || {});
  const after = cleanSnapshot(nextSnapshot || {});
  const existingMoments = new Map(before.moments.map((moment) => [moment.id, moment]));
  const actor = memberName(after.coupleProfile, actorRole) || 'TA';
  const newMoment = after.moments.find((moment) => !existingMoments.has(moment.id) && momentRole(moment, after.coupleProfile) === actorRole);
  if (newMoment) return { title: '心动日历', body: `${actor} 发布了一条新记录`, url: `./?moment=${encodeURIComponent(newMoment.id)}` };
  for (const moment of after.moments) {
    const oldMoment = existingMoments.get(moment.id);
    if (!oldMoment) continue;
    const previousComments = new Set((oldMoment.comments || []).map((comment) => comment.id));
    const newComment = (moment.comments || []).find((comment) => !previousComments.has(comment.id) && commentRole(comment, after.coupleProfile) === actorRole);
    if (newComment) return { title: '心动日历', body: `${actor} 评论了你们的记录`, url: `./?moment=${encodeURIComponent(moment.id)}` };
  }
  return null;
}

async function sendPushNotifications(subscriptions, payload) {
  if (!pushConfigured() || !subscriptions.length || !payload) return [];
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const expired = [];
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 120, urgency: 'high' });
    } catch (error) {
      const statusCode = Number(error && error.statusCode);
      if (statusCode === 404 || statusCode === 410) expired.push(subscription.endpoint);
      else console.error('消息提醒发送失败：', error && (error.body || error.message || error));
    }
  }));
  return expired;
}

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
    locations: cleanLocations(snapshot.locations),
    // Push subscriptions stay in the server snapshot but are never returned
    // to a browser. A push endpoint is a private device capability URL.
    pushSubscriptions: cleanPushSubscriptions(snapshot.pushSubscriptions)
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
  // Browsers intentionally never receive push subscriptions, so preserve
  // these server-only device credentials through every normal data sync.
  incoming.pushSubscriptions = previous.pushSubscriptions;
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
  const isRead = !options.method || String(options.method).toUpperCase() === 'GET';
  const attempts = isRead ? 4 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${RDB_REST_BASE}/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${serviceApiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch (_) { body = text; }
    }
    if (response.ok) return body;
    if (isRead && response.status >= 500 && attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 120 * (2 ** attempt)));
      continue;
    }
    const message = body && typeof body === 'object' ? (body.message || body.error || JSON.stringify(body)) : (body || `HTTP ${response.status}`);
    const code = body && typeof body === 'object' && body.code ? ` / ${String(body.code).slice(0, 60)}` : '';
    const error = new Error(`云数据库请求失败（HTTP ${response.status}${code}）：${String(message).slice(0, 240)}`);
    error.status = response.status;
    throw error;
  }
}

async function sqlReadSpace(field, value) {
  if (field !== 'id' && field !== 'invite_hash') throw new Error('不支持的数据库查询字段');
  const pattern = field === 'id'
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    : /^[0-9a-f]{64}$/i;
  if (!pattern.test(String(value))) throw new Error('数据库查询参数无效');
  const response = await fetch(`https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/exec-pgsql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: `SELECT * FROM public.${SPACES} WHERE ${field} = '${value}' LIMIT 1`, role: 'cloudbase_postgres' })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data)) throw new Error(`备用数据库读取失败（HTTP ${response.status}）`);
  return data[0] || null;
}

async function sqlConfirmOrWriteSnapshot(spaceId, data, previousRevision) {
  const current = await sqlReadSpace('id', spaceId);
  if (!current) throw new Error('情侣空间不存在，本机仍将保留待同步内容');
  const nextRevision = Number(data.revision);
  if (!Number.isSafeInteger(previousRevision) || previousRevision < 1 || !Number.isSafeInteger(nextRevision) || nextRevision !== previousRevision + 1) {
    throw new Error('云端版本号无效，本机仍将保留待同步内容');
  }
  if (Number(current.revision) === nextRevision && isDeepStrictEqual(current.snapshot, data.snapshot)) return;
  if (Number(current.revision) !== previousRevision) throw new Error('云端已有新的记录，本机内容将稍后重新合并');
  const encoded = Buffer.from(JSON.stringify(data.snapshot), 'utf8').toString('base64');
  const sql = `UPDATE public.${SPACES} SET snapshot = convert_from(decode('${encoded}', 'base64'), 'UTF8')::jsonb, revision = ${nextRevision} WHERE id = '${spaceId}' AND revision = ${previousRevision} RETURNING id`;
  const response = await fetch(`https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/exec-pgsql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, role: 'cloudbase_postgres' })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(result) || result.length !== 1) {
    throw new Error(`备用数据库写入未确认（HTTP ${response.status}），本机仍将保留待同步内容`);
  }
}

function queryValue(value) {
  return encodeURIComponent(`eq.${String(value)}`);
}

async function findSpaceById(spaceId) {
  try {
    const data = await rdbRequest(`${SPACES}?select=*&id=${queryValue(spaceId)}&limit=1`);
    return Array.isArray(data) ? data[0] : null;
  } catch (error) {
    if (!(error.status >= 500)) throw error;
    return sqlReadSpace('id', spaceId);
  }
}

async function findSpaceByInvite(code) {
  const inviteHash = hash(code);
  try {
    const data = await rdbRequest(`${SPACES}?select=*&invite_hash=${queryValue(inviteHash)}&limit=1`);
    return Array.isArray(data) ? data[0] : null;
  } catch (error) {
    if (!(error.status >= 500)) throw error;
    return sqlReadSpace('invite_hash', inviteHash);
  }
}

async function updateSpace(spaceId, data, previousRevision = null) {
  const revisionFilter = previousRevision == null ? '' : `&revision=${queryValue(previousRevision)}`;
  try {
    const updated = await rdbRequest(`${SPACES}?id=${queryValue(spaceId)}${revisionFilter}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!Array.isArray(updated) || updated.length !== 1) {
      throw new Error('云端记录已变化或未确认写入，本机仍将保留待同步内容');
    }
  } catch (error) {
    if (previousRevision == null || !data.snapshot || !Number.isSafeInteger(Number(data.revision)) || !(error.status >= 500)) throw error;
    await sqlConfirmOrWriteSnapshot(spaceId, data, previousRevision);
  }
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

async function handleCalendarEvent(event = {}, context = {}) {
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

      return { ok: true, session: { spaceId, memberToken }, memberRole: 'owner', inviteCode: code, snapshot: publicSnapshot(snapshot), revision: 1 };
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
        snapshot: publicSnapshot(space.snapshot || {}),
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
      const fileList = [...new Set((Array.isArray(event.fileIDs) ? event.fileIDs : [])
        .filter((fileID) => String(fileID).includes(prefix)))];
      if (!fileList.length) return { ok: true, fileList: [], memberRole };
      const resolved = [];
      for (const fileBatch of chunk(fileList)) {
        const result = await app.getTempFileURL({ fileList: fileBatch });
        resolved.push(...(result.fileList || []));
      }
      return { ok: true, fileList: resolved, memberRole };
    }

    if (event.action === 'pushConfig') {
      return { ok: true, enabled: pushConfigured(), publicKey: pushConfigured() ? VAPID_PUBLIC_KEY : '', memberRole };
    }

    if (event.action === 'subscribePush') {
      if (!pushConfigured()) return fail('消息提醒尚未在云函数中配置');
      const subscription = cleanPushSubscription(event.subscription);
      if (!subscription) return fail('浏览器没有提供有效的消息提醒订阅信息');
      const snapshot = cleanSnapshot(space.snapshot || {});
      const subscriptions = cleanPushSubscriptions(snapshot.pushSubscriptions);
      const own = new Map((subscriptions[memberRole] || []).map((item) => [item.endpoint, item]));
      own.set(subscription.endpoint, subscription);
      subscriptions[memberRole] = [...own.values()].slice(-MAX_PUSH_SUBSCRIPTIONS_PER_MEMBER);
      snapshot.pushSubscriptions = subscriptions;
      await updateSpace(space.id, { snapshot });
      return { ok: true, enabled: true, memberRole };
    }

    if (event.action === 'unsubscribePush') {
      const endpoint = String(event.endpoint || '').trim();
      const snapshot = cleanSnapshot(space.snapshot || {});
      const subscriptions = cleanPushSubscriptions(snapshot.pushSubscriptions);
      if (endpoint && subscriptions[memberRole]) subscriptions[memberRole] = subscriptions[memberRole].filter((item) => item.endpoint !== endpoint);
      if (subscriptions[memberRole] && !subscriptions[memberRole].length) delete subscriptions[memberRole];
      snapshot.pushSubscriptions = subscriptions;
      await updateSpace(space.id, { snapshot });
      return { ok: true, enabled: false, memberRole };
    }

    if (event.action === 'pull') {
      return { ok: true, snapshot: publicSnapshot(space.snapshot || {}), revision: Number(space.revision || 1), memberRole };
    }

    if (event.action === 'push') {
      const previousSnapshot = space.snapshot || {};
      const snapshot = mergeMemberSnapshot(previousSnapshot, event.snapshot, memberRole);
      const revision = Number(space.revision || 1) + 1;
      await updateSpace(space.id, { snapshot, revision }, Number(space.revision || 1));
      const payload = notificationForChange(previousSnapshot, snapshot, memberRole);
      const recipientRole = memberRole === 'owner' ? 'partner' : 'owner';
      const expiredEndpoints = await sendPushNotifications((snapshot.pushSubscriptions || {})[recipientRole] || [], payload);
      if (expiredEndpoints.length) {
        snapshot.pushSubscriptions[recipientRole] = ((snapshot.pushSubscriptions || {})[recipientRole] || []).filter((item) => !expiredEndpoints.includes(item.endpoint));
        if (!snapshot.pushSubscriptions[recipientRole].length) delete snapshot.pushSubscriptions[recipientRole];
        await updateSpace(space.id, { snapshot });
      }
      return { ok: true, snapshot: publicSnapshot(snapshot), revision, memberRole };
    }

    if (event.action === 'deletePhotos') {
      const files = (Array.isArray(event.fileIDs) ? event.fileIDs : []).filter((fileID) =>
        String(fileID).includes(`/heartbeat-calendar/${space.id}/`)
      );
      for (const fileBatch of chunk(files)) await app.deleteFile({ fileList: fileBatch });
      return { ok: true, memberRole };
    }

    return fail('不支持的操作');
  } catch (error) {
    console.error(error);
    return fail(readableError(error));
  }
};

function httpBody(event = {}) {
  const raw = event.body;
  if (!raw) return {};
  try {
    const text = event.isBase64Encoded ? Buffer.from(String(raw), 'base64').toString('utf8') : String(raw);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function httpResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(payload)
  };
}

// Native clients use this HTTPS form instead of a WebView or the Web SDK.
// Every non-onboarding operation still requires the device's member token;
// the function compares only its hash with the stored server-side value.
exports.main = async (event = {}, context = {}) => {
  const isHttp = Boolean(event && (event.httpMethod || event.requestContext));
  if (!isHttp) return handleCalendarEvent(event, context);

  const method = String(event.httpMethod || 'POST').toUpperCase();
  if (method === 'OPTIONS') return httpResponse(204, {});
  if (method !== 'POST') return httpResponse(405, { ok: false, message: '仅支持 POST 请求' });

  const payload = httpBody(event);
  if (!payload.action) return httpResponse(400, { ok: false, message: '缺少操作类型' });
  const result = await handleCalendarEvent(payload, context);
  return httpResponse(result && result.ok === false ? 400 : 200, result);
};
