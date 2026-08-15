const STORAGE_KEY = 'heartbeat-calendar-v1';
const SETTINGS_KEY = 'heartbeat-calendar-settings-v1';
const BASE_MOMENTS = [];
const TIMEZONES = [
  ['Pacific/Honolulu', '夏威夷 · UTC−10'], ['America/Anchorage', '阿拉斯加 · UTC−9'], ['America/Los_Angeles', '北美西部 · UTC−8/−7'], ['America/Denver', '北美山区 · UTC−7/−6'], ['America/Chicago', '北美中部 · UTC−6/−5'], ['America/New_York', '北美东部 · UTC−5/−4'], ['America/Sao_Paulo', '巴西 · UTC−3'], ['Atlantic/Reykjavik', '冰岛 / UTC · UTC±0'], ['Europe/London', '英国 · UTC±0/+1'], ['Europe/Paris', '欧洲中部 · UTC+1/+2'], ['Europe/Athens', '东欧 · UTC+2/+3'], ['Africa/Cairo', '埃及 · UTC+2/+3'], ['Asia/Riyadh', '西亚 · UTC+3'], ['Asia/Dubai', '阿联酋 · UTC+4'], ['Asia/Kolkata', '印度 · UTC+5:30'], ['Asia/Dhaka', '孟加拉 · UTC+6'], ['Asia/Bangkok', '东南亚 · UTC+7'], ['Asia/Shanghai', '中国 / UTC+8'], ['Asia/Tokyo', '日本 / 韩国 · UTC+9'], ['Australia/Sydney', '澳洲东部 · UTC+10/+11'], ['Pacific/Auckland', '新西兰 · UTC+12/+13']
];
const CITY_TIMEZONES = Object.fromEntries([
  ['北京','Asia/Shanghai'],['上海','Asia/Shanghai'],['广州','Asia/Shanghai'],['深圳','Asia/Shanghai'],['杭州','Asia/Shanghai'],['成都','Asia/Shanghai'],['重庆','Asia/Shanghai'],['武汉','Asia/Shanghai'],['西安','Asia/Shanghai'],['南京','Asia/Shanghai'],['天津','Asia/Shanghai'],['苏州','Asia/Shanghai'],['长沙','Asia/Shanghai'],['郑州','Asia/Shanghai'],['青岛','Asia/Shanghai'],['厦门','Asia/Shanghai'],['昆明','Asia/Shanghai'],['大连','Asia/Shanghai'],['桂林','Asia/Shanghai'],['贵阳','Asia/Shanghai'],['南宁','Asia/Shanghai'],['福州','Asia/Shanghai'],['合肥','Asia/Shanghai'],['济南','Asia/Shanghai'],['石家庄','Asia/Shanghai'],['太原','Asia/Shanghai'],['哈尔滨','Asia/Shanghai'],['长春','Asia/Shanghai'],['沈阳','Asia/Shanghai'],['兰州','Asia/Shanghai'],['乌鲁木齐','Asia/Shanghai'],['拉萨','Asia/Shanghai'],['海口','Asia/Shanghai'],['三亚','Asia/Shanghai'],['香港','Asia/Hong_Kong'],['澳门','Asia/Macau'],['台北','Asia/Taipei'],['东京','Asia/Tokyo'],['首尔','Asia/Seoul'],['新加坡','Asia/Singapore'],['曼谷','Asia/Bangkok'],['雅加达','Asia/Jakarta'],['河内','Asia/Ho_Chi_Minh'],['德里','Asia/Kolkata'],['孟买','Asia/Kolkata'],['迪拜','Asia/Dubai'],['伦敦','Europe/London'],['巴黎','Europe/Paris'],['柏林','Europe/Berlin'],['罗马','Europe/Rome'],['马德里','Europe/Madrid'],['阿姆斯特丹','Europe/Amsterdam'],['莫斯科','Europe/Moscow'],['纽约','America/New_York'],['波士顿','America/New_York'],['多伦多','America/Toronto'],['芝加哥','America/Chicago'],['休斯顿','America/Chicago'],['洛杉矶','America/Los_Angeles'],['旧金山','America/Los_Angeles'],['西雅图','America/Los_Angeles'],['温哥华','America/Vancouver'],['悉尼','Australia/Sydney'],['墨尔本','Australia/Melbourne'],['奥克兰','Pacific/Auckland'],['honolulu','Pacific/Honolulu'],['tokyo','Asia/Tokyo'],['seoul','Asia/Seoul'],['singapore','Asia/Singapore'],['bangkok','Asia/Bangkok'],['dubai','Asia/Dubai'],['london','Europe/London'],['paris','Europe/Paris'],['berlin','Europe/Berlin'],['new york','America/New_York'],['chicago','America/Chicago'],['los angeles','America/Los_Angeles'],['san francisco','America/Los_Angeles'],['vancouver','America/Vancouver'],['sydney','Australia/Sydney'],['melbourne','Australia/Melbourne'],['auckland','Pacific/Auckland'],['guilin','Asia/Shanghai']
]);
const STATUS_PRESET_GROUPS = [
  { id:'daily', label:'日常', items:[['A1','🌞','元气满满'],['A2','🧱','正在搬砖'],['A3','🎧','专注中'],['A4','🥱','有点困'],['A5','🐟','摸鱼中'],['A6','🍜','吃饭中'],['A7','🚇','在路上'],['A8','🏃','运动中'],['A9','🫧','洗澡中'],['A10','☁️','放空中'],['A11','🌙','准备睡觉'],['A12','💤','已入睡']] },
  { id:'couple', label:'情侣', items:[['B1','🥺','想你了'],['B2','🐾','等你消息'],['B3','🫂','求抱抱'],['B4','💕','想贴贴'],['B5','🎧','想听你的声音'],['B6','✈️','想见你了'],['B7','🍋','在吃醋'],['B8','🥹','需要哄哄'],['B9','💗','今天超爱你'],['B10','🔋','给你充电'],['B11','💌','晚点来找你'],['B12','🌙','梦里见']] },
  { id:'emotion', label:'情绪', items:[['C1','🥳','开心转圈'],['C2','🍃','平静一下'],['C3','🌷','今天有小确幸'],['C4','🥺','有点委屈'],['C5','🌧️','心情低落'],['C6','🌋','烦躁中'],['C7','🫠','压力山大'],['C8','😤','生气勿扰'],['C9','😖','有点紧张'],['C10','🙈','害羞中'],['C11','😭','想哭一下'],['C12','🩹','情绪恢复中']] },
  { id:'cute', label:'可爱抽象', items:[['D1','🪫','电量不足'],['D2','🤯','CPU 过热'],['D3','👻','人已蒸发'],['D4','🛌','躺平了'],['D5','🫥','发呆加载中…'],['D6','🐱','退化成猫'],['D7','🐶','今天是小狗'],['D8','🍚','干饭要紧'],['D9','👾','灵魂出窍'],['D10','🧘','拒绝内耗'],['D11','🧎','在线蹲你'],['D12','🫧','冒个泡']] },
  { id:'work', label:'学习异地', items:[['E1','📚','上课中'],['E2','✍️','自习中'],['E3','💼','开会中'],['E4','⏳','忙完找你'],['E5','🤍','勿扰但爱你'],['E6','🎉','下班啦'],['E7','🏠','到家报平安'],['E8','📵','信号不好'],['E9','✈️','飞行中'],['E10','🧳','正在赶路'],['E11','📅','倒数见面'],['E12','🌕','和你看同一片月亮']] }
];

const state = {
  current: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selected: window.HeartbeatDate.localDateKey(new Date()),
  moments: loadMoments(),
  settings: loadSettings(),
  formType: 'diary', author: '', photos: []
};

const $ = (selector) => document.querySelector(selector);
const calendarGrid = $('#calendarGrid');
const dayContent = $('#dayContent');
const momentDialog = $('#momentDialog');
let pendingPhotoRetryTimer = 0;
let photoViewerMomentId = '';
let photoViewerIndex = 0;
let detailMomentId = '';
let statusEditorGroup = 'daily';
let selectedStatusPreset = 'A1';
let locationRefreshInFlight = false;

function loadMoments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || BASE_MOMENTS; }
  catch { return BASE_MOMENTS; }
}
function saveMoments() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.moments)); }
function defaultSettings() {
  return {
    profile: { complete: false, deviceOwner: 'my', myName: '', partnerName: '', myNickname: '', partnerNickname: '', myGender: '', partnerGender: '', loveStart: '', longDistance: false },
    remote: { meeting: '', cityA: 'Asia/Shanghai|上海', cityB: 'Europe/London|伦敦' },
    cycle: { start: '', length: 29, days: 5, reminderDays: 2, shared: false },
    moods: {},
    statuses: { owner: null, partner: null },
    locations: { owner: null, partner: null },
    locationUi: { prompted: false },
    cloud: { session: null, memberRole: '', inviteCode: '', lastSync: 0, deletedMomentIds: [] }
  };
}
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    const defaults = defaultSettings();
    return { ...defaults, ...saved, profile: { ...defaults.profile, ...saved.profile }, remote: { ...defaults.remote, ...saved.remote }, cycle: { ...defaults.cycle, ...saved.cycle }, moods: saved.moods || {}, statuses: { ...defaults.statuses, ...(saved.statuses || {}) }, locations: { ...defaults.locations, ...(saved.locations || {}) }, locationUi: { ...defaults.locationUi, ...(saved.locationUi || {}) }, cloud: { ...defaults.cloud, ...saved.cloud } };
  }
  catch { return defaultSettings(); }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
function cloudSession() { return state.settings.cloud && state.settings.cloud.session; }
function deviceSyncCode() {
  const session = cloudSession();
  return session && session.spaceId && session.memberToken ? `HC1-${session.spaceId}-${session.memberToken}` : '';
}
function parseDeviceSyncCode(value) {
  const match = String(value || '').trim().match(/^HC1-([0-9a-f-]{36})-([A-Za-z0-9_-]{20,})$/i);
  if (!match) throw new Error('设备同步码格式不正确，请从自己的另一台设备完整复制。');
  return { spaceId: match[1], memberToken: match[2] };
}
function normalizeInviteCode(value) {
  const code = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  // Older spaces may have a 6–7 character suffix because of an early code
  // generator, so keep accepting those valid historical invitations too.
  if (!/^LOVE-[A-Z0-9]{6,8}$/.test(code)) {
    throw new Error('邀请码格式不对。请让 TA 在“邀请”里复制完整的 LOVE- 开头邀请码，不要自己编写。');
  }
  return code;
}
function canonicalRemote() {
  const remote = state.settings.remote || {};
  // The shared snapshot always keeps the creator's city in cityA.  On the
  // partner's device the labels are swapped locally, so swap them back before
  // writing to the shared space.
  return state.settings.cloud?.memberRole === 'partner'
    ? { ...remote, cityA: remote.cityB, cityB: remote.cityA }
    : remote;
}
function currentMemberRole() {
  const role = state.settings.cloud?.memberRole;
  if (role === 'owner' || role === 'partner') return role;
  return state.settings.profile?.deviceOwner === 'partner' ? 'partner' : 'owner';
}
function swapCoupleProfile(source = {}) {
  return {
    ...source,
    myName: source.partnerName || '',
    partnerName: source.myName || '',
    myNickname: source.partnerNickname || '',
    partnerNickname: source.myNickname || '',
    myGender: source.partnerGender || '',
    partnerGender: source.myGender || ''
  };
}
function canonicalProfile() {
  const current = state.settings.profile || {};
  return currentMemberRole() === 'partner' ? swapCoupleProfile(current) : { ...current };
}
function normalizeIncomingProfile(source = {}, memberRole = '') {
  const current = state.settings.profile || {};
  if (!current.myName || !current.partnerName) return source;
  const expectedOwner = memberRole === 'partner' ? current.partnerName : current.myName;
  const expectedPartner = memberRole === 'partner' ? current.myName : current.partnerName;
  return source.myName === expectedPartner && source.partnerName === expectedOwner
    ? swapCoupleProfile(source)
    : source;
}
function remoteForMember(remote = {}, memberRole = '') {
  return memberRole === 'partner'
    ? { ...remote, cityA: remote.cityB, cityB: remote.cityA }
    : remote;
}
function sharedSnapshot() {
  return {
    coupleProfile: canonicalProfile(),
    moments: state.moments.map((moment) => ({ ...moment, photos: moment.storagePhotos || moment.photos || [], photo: (moment.storagePhotos || moment.photos || [])[0] || '' })),
    deletedMomentIds: Array.isArray(state.settings.cloud.deletedMomentIds) ? state.settings.cloud.deletedMomentIds : [],
    remote: canonicalRemote(),
    cycle: state.settings.cycle && state.settings.cycle.shared ? state.settings.cycle : null,
    moods: state.settings.moods,
    statuses: state.settings.statuses || { owner: null, partner: null },
    locations: state.settings.locations || { owner: null, partner: null }
  };
}
function profileForMember(snapshot = {}, memberRole) {
  const owner = snapshot.coupleProfile;
  if (!owner || !owner.myName || !owner.partnerName || !owner.myGender || !owner.partnerGender || !owner.loveStart) return null;
  if (memberRole === 'partner') return joinedPartnerProfile(snapshot);
  return { ...owner, complete: true, deviceOwner: 'owner' };
}
function joinedPartnerProfile(snapshot = {}) {
  const owner = snapshot.coupleProfile;
  if (!owner || !owner.myName || !owner.partnerName || !owner.myGender || !owner.partnerGender || !owner.loveStart) {
    throw new Error('邀请空间还没有完整档案。请让创建方在“我们”里点一次保存，再重新输入邀请码。');
  }
  return {
    complete: true,
    deviceOwner: 'partner',
    myName: owner.partnerName,
    partnerName: owner.myName,
    myNickname: owner.partnerNickname || owner.partnerName,
    partnerNickname: owner.myNickname || owner.myName,
    myGender: owner.partnerGender,
    partnerGender: owner.myGender,
    loveStart: owner.loveStart,
    longDistance: Boolean(owner.longDistance)
  };
}
function setSyncStatus(text, synced = false) {
  const status = $('#syncStatus'); if (!status) return;
  status.innerHTML = `<i></i> ${text}`; status.classList.toggle('synced', synced);
}
function hasPendingPhotoUploads() {
  return state.moments.some((moment) => (moment.storagePhotos || moment.photos || []).some((photo) => /^data:/.test(photo)));
}
async function resizePhoto(dataUrl, maxSide = 1280, quality = 0.74) {
  if (!/^data:image\//.test(dataUrl)) return dataUrl;
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('图片在本机无法读取'));
    element.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
async function photoForCloud(dataUrl) {
  // New selections are already optimized. This fallback also compacts
  // originals left pending by an older app version.
  if (!/^data:image\//.test(dataUrl)) return dataUrl;
  if (dataUrl.length < 900 * 1024) return dataUrl;
  return resizePhoto(dataUrl, 1280, 0.74);
}
async function uploadPendingPhotos() {
  const session = cloudSession();
  if (!hasPendingPhotoUploads()) return null;
  if (!session || !window.HeartbeatCloud) return new Error('照片尚未连接到情侣空间');
  let firstError = null;
  const total = state.moments.reduce((count, moment) => count + (moment.storagePhotos || moment.photos || []).filter((photo) => /^data:/.test(photo)).length, 0);
  let completed = 0;
  for (const moment of state.moments) {
    const originals = [...(moment.storagePhotos || moment.photos || [])];
    if (!originals.some((photo) => /^data:/.test(photo))) continue;
    for (let index = 0; index < originals.length; index += 1) {
      if (!/^data:/.test(originals[index])) continue;
      setSyncStatus(`正在上传照片 ${completed + 1}/${total}…`);
      try {
        originals[index] = await window.HeartbeatCloud.uploadPhoto(session, await photoForCloud(originals[index]));
        completed += 1;
        moment.photos = [...originals];
        moment.storagePhotos = [...originals];
        moment.photo = originals[0] || '';
        saveMoments();
      } catch (error) {
        firstError ||= error;
      }
    }
  }
  saveMoments(); renderAll();
  return firstError;
}
function schedulePendingPhotoRetry() {
  if (pendingPhotoRetryTimer || !hasPendingPhotoUploads()) return;
  pendingPhotoRetryTimer = window.setTimeout(async () => {
    pendingPhotoRetryTimer = 0;
    await pushCloud();
  }, 60000);
}
async function applyCloudSnapshot(snapshot, memberRole = '') {
  if (!snapshot) return;
  const localMoments = [...state.moments];
  const effectiveRole = memberRole || state.settings.cloud.memberRole;
  const normalizedSnapshot = { ...snapshot, coupleProfile: normalizeIncomingProfile(snapshot.coupleProfile || {}, effectiveRole) };
  const mappedProfile = profileForMember(normalizedSnapshot, effectiveRole);
  if (mappedProfile) state.settings.profile = mappedProfile;
  if (memberRole) state.settings.cloud.memberRole = memberRole;
  state.settings.remote = { ...state.settings.remote, ...remoteForMember(normalizedSnapshot.remote || {}, effectiveRole) };
  if (normalizedSnapshot.cycle && normalizedSnapshot.cycle.shared) state.settings.cycle = { ...state.settings.cycle, ...normalizedSnapshot.cycle };
  state.settings.moods = normalizedSnapshot.moods || state.settings.moods;
  state.settings.statuses = { ...(state.settings.statuses || {}), ...(normalizedSnapshot.statuses || {}) };
  state.settings.locations = { ...(state.settings.locations || {}), ...(normalizedSnapshot.locations || {}) };
  state.settings.cloud.deletedMomentIds = [...new Set([
    ...(Array.isArray(state.settings.cloud.deletedMomentIds) ? state.settings.cloud.deletedMomentIds : []),
    ...(Array.isArray(normalizedSnapshot.deletedMomentIds) ? normalizedSnapshot.deletedMomentIds : [])
  ])].slice(-1200);
  const incoming = (normalizedSnapshot.moments || []).map((moment) => normalizeMomentIdentity(moment, normalizedSnapshot.coupleProfile));
  const deletedIds = new Set(state.settings.cloud.deletedMomentIds);
  const safeIncoming = incoming.filter((moment) => !deletedIds.has(moment.id));
  // A stale/blank cloud snapshot must never erase a device that still has
  // records. Keep the local copy visible so it can be used for recovery.
  const preserveLocalRecovery = !safeIncoming.length && localMoments.some((moment) => !deletedIds.has(moment.id));
  const selectedMoments = preserveLocalRecovery
    ? localMoments.filter((moment) => !deletedIds.has(moment.id))
    : safeIncoming;
  state.moments = window.HeartbeatCloud ? await window.HeartbeatCloud.resolvePhotos(cloudSession(), selectedMoments) : selectedMoments;
  const readChanged = markMomentsRead((moment) => moment.date === state.selected, false);
  saveSettings(); saveMoments(); renderAll();
  if (preserveLocalRecovery) {
    setSyncStatus('云端为空，已保护本机旧记录');
    return;
  }
  if (readChanged) window.setTimeout(() => { void pushCloud(); }, 0);
}
async function pushCloud() {
  const session = cloudSession();
  if (!session || !window.HeartbeatCloud) return { ok: false, error: new Error('尚未连接情侣空间') };
  try {
    setSyncStatus('正在同步…');
    const photoError = await uploadPendingPhotos();
    if (photoError) {
      console.warn('照片上传将重试：', photoError);
      setSyncStatus('照片已本机保存，待上传');
      schedulePendingPhotoRetry();
      return { ok: false, error: photoError };
    }
    const result = await window.HeartbeatCloud.push(session, sharedSnapshot());
    state.settings.cloud.lastSync = Date.now(); saveSettings();
    if (result.snapshot) await applyCloudSnapshot(result.snapshot, result.memberRole);
    setSyncStatus('已同步给 TA', true);
    return { ok: true };
  } catch (error) { console.warn(error); setSyncStatus('本机已保存，待同步'); return { ok: false, error }; }
}
async function pullCloud() {
  const session = cloudSession();
  if (!session || !window.HeartbeatCloud) return;
  if (hasPendingPhotoUploads()) {
    setSyncStatus('照片已本机保存，待上传');
    schedulePendingPhotoRetry();
    return;
  }
  try {
    setSyncStatus('正在获取 TA 的记录…');
    const result = await window.HeartbeatCloud.pull(session);
    if (result.snapshot) await applyCloudSnapshot(result.snapshot, result.memberRole);
    state.settings.cloud.lastSync = Date.now(); saveSettings(); setSyncStatus('已同步给 TA', true);
  } catch (error) { console.warn(error); setSyncStatus('本机已保存，待同步'); }
}
function normalizeCity(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function fallbackTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'; }
function suggestedTimezone(city) {
  const normalized = normalizeCity(city);
  if (CITY_TIMEZONES[normalized]) return CITY_TIMEZONES[normalized];
  return /^[\u4e00-\u9fff]+$/.test(normalized) ? 'Asia/Shanghai' : '';
}
function cityParts(value) { const [timezone, ...city] = String(value || '').split('|'); return { timezone: timezone || fallbackTimezone(), city: city.join('|') || '' }; }
function cityValue(city, timezone) { return `${timezone || fallbackTimezone()}|${String(city || '').trim()}`; }
function fillCityOptions() {
  const datalist = $('#citySuggestions'); datalist.innerHTML = '';
  [...new Set(Object.keys(CITY_TIMEZONES).filter((city) => /[\u4e00-\u9fff]/.test(city)))].forEach((city) => { const option = document.createElement('option'); option.value = city; datalist.append(option); });
  ['profileCityATimezoneInput','profileCityBTimezoneInput','cityATimezoneInput','cityBTimezoneInput'].forEach((id) => {
    const select = $(`#${id}`); select.innerHTML = TIMEZONES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  });
}
function setCityControl(cityId, timezoneId, savedValue) {
  const saved = cityParts(savedValue); const select = $(`#${timezoneId}`); const autoTimezone = suggestedTimezone(saved.city); const preferredTimezone = autoTimezone || saved.timezone;
  $(`#${cityId}`).value = saved.city;
  if (![...select.options].some((option) => option.value === preferredTimezone)) { const option = document.createElement('option'); option.value = preferredTimezone; option.textContent = `${preferredTimezone}（已保存时区）`; select.append(option); }
  select.value = preferredTimezone; if (!select.value) select.value = fallbackTimezone();
}
function readCityControl(cityId, timezoneId) { return cityValue($(`#${cityId}`).value, $(`#${timezoneId}`).value); }
function bindCityAutocomplete(cityId, timezoneId) {
  const syncTimezone = () => { const timezone = suggestedTimezone($(`#${cityId}`).value); if (timezone) $(`#${timezoneId}`).value = timezone; };
  ['input','change','blur'].forEach((eventName) => $(`#${cityId}`).addEventListener(eventName, syncTimezone));
}
function isoDate(date) { return window.HeartbeatDate.localDateKey(date); }
function localIso(year, month, day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function dateFromIso(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function formatDate(iso, options = { month: 'long', day: 'numeric' }) { return new Intl.DateTimeFormat('zh-CN', options).format(dateFromIso(iso)); }
function typeLabel(type) { return ({ anniversary: '纪念日', date: '约会', diary: '碎碎念' })[type] || '记录'; }
function typeColor(type) { return ({ anniversary: '#ed6483', date: '#eda97f', diary: '#bda8e5' })[type] || '#ed6483'; }
function momentPhotos(moment) { return Array.isArray(moment.photos) ? moment.photos.filter(Boolean) : moment.photo ? [moment.photo] : []; }
function inferMomentRole(moment = {}, ownerProfile = canonicalProfile()) {
  if (moment.authorRole === 'owner' || moment.authorRole === 'partner') return moment.authorRole;
  if (moment.author && moment.author === ownerProfile.partnerName) return 'partner';
  if (moment.author && moment.author === ownerProfile.myName) return 'owner';
  return '';
}
function normalizeMomentIdentity(moment = {}, ownerProfile = canonicalProfile()) {
  const authorRole = inferMomentRole(moment, ownerProfile);
  const comments = Array.isArray(moment.comments) ? moment.comments.map((comment) => ({
    ...comment,
    authorRole: comment.authorRole === 'partner' ? 'partner' : comment.authorRole === 'owner' ? 'owner' : (comment.author === ownerProfile.partnerName ? 'partner' : comment.author === ownerProfile.myName ? 'owner' : '')
  })) : [];
  return {
    ...moment,
    authorRole,
    comments,
    seenBy: [...new Set((Array.isArray(moment.seenBy) ? moment.seenBy : []).filter((role) => role === 'owner' || role === 'partner'))]
  };
}
function roleDisplayName(role, fallback = '') {
  const current = profile();
  if (role && role === currentMemberRole()) return current.myNickname || current.myName || fallback || '我';
  if (role) return current.partnerNickname || current.partnerName || fallback || 'TA';
  return fallback || '我们';
}
function displayAuthor(moment) {
  return roleDisplayName(inferMomentRole(moment), moment.author);
}
function canEditMoment(moment) {
  const role = inferMomentRole(moment);
  return role ? role === currentMemberRole() : moment.author === profile().myName;
}
function canDeleteComment(comment = {}) {
  if (comment.authorRole === 'owner' || comment.authorRole === 'partner') return comment.authorRole === currentMemberRole();
  return Boolean(comment.author && comment.author === profile().myName);
}
function isPartnerMoment(moment) {
  const role = inferMomentRole(moment);
  return role ? role !== currentMemberRole() : Boolean(moment.author && profile().myName && moment.author !== profile().myName);
}
function isUnreadPartnerMoment(moment) {
  return isPartnerMoment(moment) && !(Array.isArray(moment.seenBy) ? moment.seenBy : []).includes(currentMemberRole());
}
function markMomentsRead(predicate = () => true, sync = true) {
  const role = currentMemberRole();
  let changed = false;
  state.moments.forEach((moment) => {
    if (!predicate(moment) || !isPartnerMoment(moment)) return;
    const seenBy = Array.isArray(moment.seenBy) ? moment.seenBy : [];
    if (!seenBy.includes(role)) { moment.seenBy = [...seenBy, role]; changed = true; }
  });
  if (changed) {
    saveMoments();
    if (sync) void pushCloud();
  }
  return changed;
}
function sortedMoments(filter = () => true) { return state.moments.filter(filter).sort((a, b) => b.date.localeCompare(a.date)); }
function renderCollection(targetId, moments, emptyText) {
  const target = $(`#${targetId}`);
  if (!moments.length) { target.innerHTML = `<div class="collection-empty">${emptyText}</div>`; return; }
  target.innerHTML = moments.map((moment) => `<article class="collection-entry"><div class="collection-date">${formatDate(moment.date, { month:'numeric', day:'numeric' }).replace('月','/').replace('日','')}</div><div class="collection-copy"><h3>${escapeHtml(moment.title)}</h3><p>${typeLabel(moment.type)} · ${escapeHtml(moment.author || '我们')}${moment.note ? ` · ${escapeHtml(moment.note)}` : ''}</p></div></article>`).join('');
}
function renderMemoryFeed() {
  const target = $('#memoriesList'); const moments = sortedMoments();
  if (!moments.length) { target.innerHTML = '<div class="collection-empty">还没有回忆。去日历里的某一天，写下第一条吧。</div>'; return; }
  target.innerHTML = moments.map((moment) => {
    const author = displayAuthor(moment); const photos = momentPhotos(moment); const editable = canEditMoment(moment); const gallery = photos.length ? `<div class="moment-gallery count-${Math.min(photos.length, 9)}">${photos.slice(0,9).map((photo, index) => `<div class="memory-photo"><button type="button" class="memory-photo-open" data-open-photo="${moment.id}" data-photo-index="${index}" aria-label="放大查看第 ${index + 1} 张照片"><img src="${photo}" alt="${escapeHtml(moment.title)} 的第 ${index + 1} 张照片" /></button>${editable ? `<button type="button" class="memory-photo-delete" data-delete-photo="${moment.id}" data-photo-index="${index}" aria-label="删除第 ${index + 1} 张照片">×</button>` : ''}</div>`).join('')}</div>` : '';
    const comments = Array.isArray(moment.comments) ? moment.comments : [];
    const commentsHtml = `<div class="memory-comments">${comments.length ? comments.map((comment) => `<div class="memory-comment"><strong>${escapeHtml(roleDisplayName(comment.authorRole, comment.author))}</strong><span>${escapeHtml(comment.body || '')}</span><time>${formatCommentTime(comment.createdAt)}</time>${canDeleteComment(comment) ? `<button type="button" class="memory-comment-delete" data-delete-comment="${escapeHtml(moment.id)}" data-comment-id="${escapeHtml(comment.id)}" aria-label="删除自己的这条评论">删除</button>` : ''}</div>`).join('') : '<p class="no-comments">还没有评论，给 TA 留句话吧。</p>'}<form class="comment-form" data-comment-form="${moment.id}"><input name="comment" maxlength="180" autocomplete="off" placeholder="评论这条回忆…" aria-label="评论内容" required /><button type="submit">发送</button></form></div>`;
    const actions = editable ? `<div class="memory-actions"><button type="button" class="delete-moment-button" data-delete-moment="${moment.id}">删除这条记录</button></div>` : '';
    return `<article class="memory-feed" id="memory-${escapeHtml(moment.id)}"><div class="memory-head"><div class="memory-avatar">${escapeHtml(firstCharacter(author, '♡'))}</div><div><h3 class="memory-author">${escapeHtml(author)}</h3><p class="memory-date">${formatDate(moment.date, { year:'numeric', month:'long', day:'numeric', weekday:'long' })}</p></div></div><h3>${escapeHtml(moment.title)}</h3>${moment.note ? `<p>${escapeHtml(moment.note)}</p>` : ''}${gallery}${commentsHtml}${actions}</article>`;
  }).join('');
}
function momentDetailHtml(moment) {
  const author = displayAuthor(moment);
  const photos = momentPhotos(moment);
  const editable = canEditMoment(moment);
  const gallery = photos.length ? `<div class="moment-gallery count-${Math.min(photos.length, 9)}">${photos.slice(0, 9).map((photo, index) => `<div class="memory-photo"><button type="button" class="memory-photo-open" data-open-photo="${escapeHtml(moment.id)}" data-photo-index="${index}" aria-label="放大查看第 ${index + 1} 张照片"><img src="${photo}" alt="${escapeHtml(moment.title)} 的第 ${index + 1} 张照片" /></button>${editable ? `<button type="button" class="memory-photo-delete" data-delete-photo="${escapeHtml(moment.id)}" data-photo-index="${index}" aria-label="删除第 ${index + 1} 张照片">×</button>` : ''}</div>`).join('')}</div>` : '';
  const comments = Array.isArray(moment.comments) ? moment.comments : [];
  const commentsHtml = `<div class="memory-comments">${comments.length ? comments.map((comment) => `<div class="memory-comment"><strong>${escapeHtml(roleDisplayName(comment.authorRole, comment.author))}</strong><span>${escapeHtml(comment.body || '')}</span><time>${formatCommentTime(comment.createdAt)}</time>${canDeleteComment(comment) ? `<button type="button" class="memory-comment-delete" data-delete-comment="${escapeHtml(moment.id)}" data-comment-id="${escapeHtml(comment.id)}" aria-label="删除自己的这条评论">删除</button>` : ''}</div>`).join('') : '<p class="no-comments">还没有评论，给 TA 留句话吧。</p>'}<form class="comment-form" data-comment-form="${escapeHtml(moment.id)}"><input name="comment" maxlength="180" autocomplete="off" placeholder="评论这条回忆…" aria-label="评论内容" required /><button type="submit">发送</button></form></div>`;
  const actions = editable ? `<div class="memory-actions"><button type="button" class="delete-moment-button" data-delete-moment="${escapeHtml(moment.id)}">删除这条记录</button></div>` : '';
  return `<article class="memory-feed moment-detail-card"><div class="memory-head"><div class="memory-avatar">${escapeHtml(firstCharacter(author, '♡'))}</div><div><h3 class="memory-author">${escapeHtml(author)}</h3><p class="memory-date">${formatDate(moment.date, { year:'numeric', month:'long', day:'numeric', weekday:'long' })}</p></div></div><h3>${escapeHtml(moment.title)}</h3>${moment.note ? `<p>${escapeHtml(moment.note)}</p>` : ''}${gallery}${commentsHtml}${actions}</article>`;
}
function renderMomentDetail(momentId = detailMomentId) {
  const moment = state.moments.find((item) => item.id === momentId);
  if (!moment) {
    detailMomentId = '';
    $('#momentDetailContent').innerHTML = '<div class="collection-empty">这条帖子已经不存在。</div>';
    return;
  }
  detailMomentId = moment.id;
  $('#momentDetailHeading').textContent = moment.title || '帖子详情';
  $('#momentDetailHint').textContent = `${formatDate(moment.date, { year:'numeric', month:'long', day:'numeric', weekday:'long' })} · ${typeLabel(moment.type)}`;
  $('#momentDetailContent').innerHTML = momentDetailHtml(moment);
}
function openMomentDetail(momentId) {
  const moment = state.moments.find((item) => item.id === momentId);
  if (!moment) return;
  detailMomentId = moment.id;
  markMomentsRead((item) => item.id === moment.id);
  renderCalendar();
  renderMomentDetail(moment.id);
  if (!$('#momentDetailDialog').open) $('#momentDetailDialog').showModal();
}
function formatCommentTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);
}
function firstCharacter(value, fallback) { return Array.from(value || fallback)[0] || fallback; }
function profile() { return state.settings.profile; }
function setAuthorOptions() {
  const current = profile();
  $('#currentAuthorName').textContent = current.myName || '我';
}
function renderProfile() {
  const current = profile();
  $('#avatarA').textContent = firstCharacter(current.myName, '我');
  $('#avatarB').textContent = firstCharacter(current.partnerName, 'TA');
  $('#coupleSubtitle').textContent = current.complete ? `${current.myName} & ${current.partnerName}'S LITTLE UNIVERSE` : 'OUR LITTLE UNIVERSE';
  $('#coupleTitle').textContent = current.complete ? `${current.myNickname} 和 ${current.partnerNickname} 的心动日历` : '我们的心动日历';
  document.body.dataset.longDistance = String(Boolean(current.longDistance));
  document.body.dataset.style = current.myGender === 'male' ? 'masculine' : 'feminine';
  setAuthorOptions();
}
function oppositeMemberRole(role = currentMemberRole()) { return role === 'partner' ? 'owner' : 'partner'; }
function normalizedLiveStatus(value) {
  if (!value || typeof value !== 'object' || !String(value.text || '').trim()) return null;
  const expiresAt = value.expiresAt ? Date.parse(value.expiresAt) : 0;
  if (expiresAt && expiresAt <= Date.now()) return null;
  return {
    emoji: String(value.emoji || '💭').slice(0, 16),
    text: String(value.text || '').trim().slice(0, 20),
    presetId: String(value.presetId || '').slice(0, 12),
    createdAt: String(value.createdAt || new Date().toISOString()).slice(0, 32),
    expiresAt: value.expiresAt ? String(value.expiresAt).slice(0, 32) : '',
    duration: ['1h','4h','today','until'].includes(value.duration) ? value.duration : 'until'
  };
}
function activeStatusForRole(role) { return normalizedLiveStatus((state.settings.statuses || {})[role]); }
function statusRelativeTime(status) {
  const elapsed = Math.max(0, Date.now() - Date.parse(status.createdAt || new Date().toISOString()));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return '刚刚更新';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
function statusDurationLabel(status) {
  if (status.duration === 'until' || !status.expiresAt) return '持续到手动更换';
  if (status.duration === 'today') return '今天结束';
  if (status.duration === '1h') return '保持 1 小时';
  return '保持 4 小时';
}
function renderStatuses() {
  const current = profile();
  const myRole = currentMemberRole();
  const partnerStatus = activeStatusForRole(oppositeMemberRole(myRole));
  const myStatus = activeStatusForRole(myRole);
  const partnerName = current.partnerNickname || current.partnerName || 'TA';
  $('#partnerStatusLabel').textContent = `${partnerName} 此刻`;
  $('#partnerStatusCard').classList.toggle('is-empty', !partnerStatus);
  $('#partnerStatusEmoji').textContent = partnerStatus?.emoji || '💭';
  $('#partnerStatusText').textContent = partnerStatus?.text || `${partnerName}还没有设置状态`;
  $('#partnerStatusMeta').textContent = partnerStatus ? `${statusRelativeTime(partnerStatus)} · ${statusDurationLabel(partnerStatus)}` : '等 TA 冒个泡';
  $('#myStatusEmoji').textContent = myStatus?.emoji || '＋';
  $('#myStatusSummary').textContent = myStatus?.text || '设置我的状态';
  $('#myStatusMeta').textContent = myStatus ? `${statusRelativeTime(myStatus)} · ${statusDurationLabel(myStatus)}` : `让 ${partnerName} 知道你此刻在做什么`;
}
function normalizedLocation(value) {
  if (!value || typeof value !== 'object') return null;
  const lat = Number(value.lat), lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng,
    city: String(value.city || '').trim().slice(0, 40),
    source: String(value.source || '').slice(0, 24),
    timezone: String(value.timezone || '').slice(0, 64),
    updatedAt: String(value.updatedAt || '').slice(0, 32)
  };
}
function locationRelativeTime(location) {
  if (!location?.updatedAt || !Number.isFinite(Date.parse(location.updatedAt))) return '尚未刷新';
  const elapsed = Math.max(0, Date.now() - Date.parse(location.updatedAt));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return '刚刚刷新';
  if (minutes < 60) return `${minutes} 分钟前刷新`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前刷新`;
  return `${Math.floor(hours / 24)} 天前刷新`;
}
function distanceKilometres(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6371;
  const deltaLat = radians(second.lat - first.lat);
  const deltaLng = radians(second.lng - first.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function renderLocations() {
  const current = profile();
  const myRole = currentMemberRole();
  const partnerRole = oppositeMemberRole(myRole);
  const locations = state.settings.locations || {};
  const mine = normalizedLocation(locations[myRole]);
  const partner = normalizedLocation(locations[partnerRole]);
  const myName = current.myNickname || current.myName || '我';
  const partnerName = current.partnerNickname || current.partnerName || 'TA';
  const cityLabel = (location, emptyLabel) => {
    if (!location) return emptyLabel;
    if (location.source === 'gps-city') return location.city || '城市识别失败';
    if (location.source === 'gps-unknown') return '城市识别失败';
    return '请重新刷新';
  };
  $('#myLocationAvatar').textContent = firstCharacter(current.myName, '我');
  $('#partnerLocationAvatar').textContent = firstCharacter(current.partnerName, 'TA');
  $('#myLocationName').textContent = myName;
  $('#partnerLocationName').textContent = partnerName;
  $('#myLocationCity').textContent = cityLabel(mine, '城市待刷新');
  $('#partnerLocationCity').textContent = cityLabel(partner, '等待 TA 刷新');
  $('#myLocationUpdated').textContent = locationRelativeTime(mine);
  $('#partnerLocationUpdated').textContent = locationRelativeTime(partner);
  const distance = mine && partner ? distanceKilometres(mine, partner) : null;
  $('#locationDistance').textContent = distance == null ? '--' : distance < 1 ? '<1' : String(Math.round(distance));
  $('#locationDistanceUnit').textContent = '公里';
  $('#locationDistanceHint').textContent = !mine ? '请先刷新你的位置' : !partner ? `等待 ${partnerName} 刷新` : '城市级直线距离';
}
function locationErrorMessage(error) {
  if (!window.isSecureContext) return '定位需要 HTTPS 安全连接，请使用腾讯云正式网址打开。';
  if (error?.code === 1) return '没有获得定位权限。请在浏览器的网站权限中允许“位置信息”后再试。';
  if (error?.code === 2) return '暂时无法取得位置，请确认手机定位服务和网络已开启。';
  if (error?.code === 3) return '定位等待超时，请到开阔处或稍后重试。';
  return '当前浏览器暂时无法获取位置。';
}
function setLocationPermissionMessage(message = '') {
  const element = $('#locationPermissionMessage');
  element.textContent = message;
  element.hidden = !message;
}
function setLocationRefreshLoading(loading) {
  locationRefreshInFlight = loading;
  $('#refreshLocationButton').disabled = loading;
  $('#allowLocationButton').disabled = loading;
  $('#refreshLocationButton').innerHTML = loading ? '<span aria-hidden="true">⌁</span> 正在定位…' : '<span aria-hidden="true">↻</span> 刷新我的位置';
  $('#allowLocationButton').textContent = loading ? '正在获取城市级位置…' : '允许并刷新我的位置';
}
function refreshMyLocation(fromPermissionDialog = false) {
  if (locationRefreshInFlight) return;
  state.settings.locationUi = { ...(state.settings.locationUi || {}), prompted: true };
  saveSettings();
  if (!navigator.geolocation) {
    const message = '当前浏览器不支持定位，请在手机系统浏览器中打开。';
    if (fromPermissionDialog) setLocationPermissionMessage(message); else alert(message);
    return;
  }
  setLocationPermissionMessage('');
  setLocationRefreshLoading(true);
  navigator.geolocation.getCurrentPosition(async (position) => {
    const role = currentMemberRole();
    const preciseLat = Number(position.coords.latitude);
    const preciseLng = Number(position.coords.longitude);
    let city = '';
    let source = 'gps-unknown';
    try {
      city = await window.HeartbeatLocation.cityFromCurrentCoordinates(preciseLat, preciseLng);
      source = 'gps-city';
    } catch (error) {
      console.warn('已取得 GPS 坐标，但城市名称反查失败。', error);
    }
    // Two decimal places are roughly city-level (about one kilometre). The
    // precise GPS reading is used only for the current reverse-geocoding request
    // and never enters local storage or the shared snapshot.
    const location = {
      lat: Math.round(preciseLat * 100) / 100,
      lng: Math.round(preciseLng * 100) / 100,
      city,
      source,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      updatedAt: new Date().toISOString()
    };
    state.settings.locations = { ...(state.settings.locations || {}), [role]: location };
    saveSettings(); renderLocations(); setLocationRefreshLoading(false);
    if ($('#locationPermissionDialog').open) $('#locationPermissionDialog').close();
    await pushCloud();
    if (!city) alert('已经取得你当前的坐标并更新距离，但城市名称暂时识别失败。请确认网络后再次点击刷新。');
  }, (error) => {
    setLocationRefreshLoading(false);
    const message = locationErrorMessage(error);
    if (fromPermissionDialog) setLocationPermissionMessage(message); else alert(message);
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
}
function maybeOfferLocation() {
  if (!profile().complete || state.settings.locationUi?.prompted) return;
  if ($('#onboardingDialog').open || $('#locationPermissionDialog').open) return;
  setLocationPermissionMessage('');
  $('#locationPermissionDialog').showModal();
}
function statusPresetById(id) {
  for (const group of STATUS_PRESET_GROUPS) {
    const item = group.items.find((preset) => preset[0] === id);
    if (item) return { group: group.id, id:item[0], emoji:item[1], text:item[2] };
  }
  return null;
}
function updateStatusPreview() {
  $('#statusPreviewEmoji').textContent = $('#customStatusEmoji').value.trim() || '💭';
  $('#statusPreviewText').textContent = $('#customStatusText').value.trim() || '写一句此刻的状态';
}
function renderStatusEditor() {
  $('#statusCategoryTabs').innerHTML = STATUS_PRESET_GROUPS.map((group) => `<button type="button" role="tab" aria-selected="${group.id === statusEditorGroup}" class="${group.id === statusEditorGroup ? 'selected' : ''}" data-status-group="${group.id}">${group.label}</button>`).join('');
  const group = STATUS_PRESET_GROUPS.find((item) => item.id === statusEditorGroup) || STATUS_PRESET_GROUPS[0];
  $('#statusPresetGrid').innerHTML = group.items.map(([id, emoji, text]) => `<button type="button" class="status-preset-option${id === selectedStatusPreset ? ' selected' : ''}" data-status-preset="${id}"><span>${emoji}</span><strong>${text}</strong></button>`).join('');
  updateStatusPreview();
}
function openStatusEditor() {
  const current = activeStatusForRole(currentMemberRole());
  const initial = current || statusPresetById('A1');
  selectedStatusPreset = current?.presetId || 'A1';
  statusEditorGroup = statusPresetById(selectedStatusPreset)?.group || 'daily';
  $('#customStatusEmoji').value = initial?.emoji || '🌞';
  $('#customStatusText').value = initial?.text || '元气满满';
  $('#statusDuration').value = current?.duration || 'today';
  $('#statusFormError').hidden = true;
  $('#clearStatusButton').hidden = !current;
  renderStatusEditor();
  $('#statusDialog').showModal();
}
function statusExpiration(duration) {
  if (duration === 'until') return '';
  if (duration === '1h') return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  if (duration === '4h') return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const end = new Date(); end.setHours(23, 59, 59, 999); return end.toISOString();
}
function isCycleDay(iso) {
  const cycle = state.settings.cycle;
  if (!cycle?.start || !cycle.length || !cycle.days) return false;
  const offset = Math.floor((dateFromIso(iso) - dateFromIso(cycle.start)) / 86400000);
  const normalized = ((offset % cycle.length) + cycle.length) % cycle.length;
  return normalized < cycle.days;
}
function nextCycleStart(cycle, reference = new Date()) {
  if (!cycle?.start || !cycle.length) return null;
  const today = new Date(reference); today.setHours(0, 0, 0, 0);
  const start = dateFromIso(cycle.start); const elapsed = Math.floor((today - start) / 86400000);
  const next = new Date(start); next.setDate(next.getDate() + Math.max(0, Math.ceil(elapsed / cycle.length)) * cycle.length);
  if (next < today) next.setDate(next.getDate() + cycle.length);
  return next;
}
function maybeCycleReminder() {
  const cycle = state.settings.cycle; const next = nextCycleStart(cycle);
  if (!next || !('Notification' in window) || Notification.permission !== 'granted') return;
  const today = new Date(); today.setHours(0, 0, 0, 0); const days = Math.ceil((next - today) / 86400000);
  if (days < 0 || days > Number(cycle.reminderDays || 0)) return;
  const key = `heartbeat-cycle-notice-${localIso(next.getFullYear(), next.getMonth(), next.getDate())}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, 'shown'); new Notification('给自己一个温柔提醒', { body: days === 0 ? '预计今天开始，记得好好照顾自己。' : `预计还有 ${days} 天，提前准备一下吧。` });
}

function renderCalendar() {
  const year = state.current.getFullYear(); const month = state.current.getMonth();
  $('#monthTitle').textContent = `${year} 年 ${month + 1} 月`;
  calendarGrid.innerHTML = '';
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells = 42;
  const today = isoDate(new Date());
  for (let index = 0; index < cells; index++) {
    let day, cellMonth = month, cellYear = year, otherMonth = false;
    if (index < firstWeekday) { day = previousMonthDays - firstWeekday + index + 1; cellMonth--; otherMonth = true; if (cellMonth < 0) { cellMonth = 11; cellYear--; } }
    else if (index >= firstWeekday + daysInMonth) { day = index - firstWeekday - daysInMonth + 1; cellMonth++; otherMonth = true; if (cellMonth > 11) { cellMonth = 0; cellYear++; } }
    else day = index - firstWeekday + 1;
    const iso = localIso(cellYear, cellMonth, day);
    const moments = state.moments.filter((moment) => moment.date === iso);
    const markerTypes = new Set();
    const hasPartnerUpdate = moments.some(isUnreadPartnerMoment);
    if (hasPartnerUpdate) markerTypes.add('partner');
    moments.forEach((moment) => { if (moment.type === 'anniversary') markerTypes.add('anniversary'); if (momentPhotos(moment).length) markerTypes.add('photo'); if (moment.note) markerTypes.add('note'); });
    if (isCycleDay(iso)) markerTypes.add('cycle');
    const button = document.createElement('button');
    button.type = 'button'; button.className = `day-cell${otherMonth ? ' other-month' : ''}${iso === state.selected ? ' selected' : ''}${iso === today ? ' today' : ''}`;
    button.dataset.date = iso; button.setAttribute('aria-label', `${formatDate(iso)}，${hasPartnerUpdate ? '对方有新记录，' : ''}${moments.length ? `${moments.length} 条记录` : '暂无记录'}`);
    button.innerHTML = `${hasPartnerUpdate ? '<i class="partner-alert" aria-hidden="true"></i>' : ''}<span class="day-number">${day}</span><span class="markers">${[...markerTypes].slice(0,3).map((type) => `<i class="marker ${type}"></i>`).join('')}</span>`;
    calendarGrid.append(button);
  }
}
function renderDay() {
  const date = dateFromIso(state.selected); const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date);
  $('#selectedWeekday').textContent = weekday; $('#selectedDate').textContent = formatDate(state.selected);
  const moments = state.moments.filter((moment) => moment.date === state.selected);
  if (!moments.length) { dayContent.innerHTML = ''; dayContent.append($('#emptyDayTemplate').content.cloneNode(true)); dayContent.querySelector('.secondary-button').addEventListener('click', openMomentDialog); return; }
  dayContent.innerHTML = `<div class="moments">${moments.map((moment) => {
    const photos = momentPhotos(moment); const photo = photos[0] ? `<button type="button" class="moment-photo-button" data-open-photo="${moment.id}" data-photo-index="0" aria-label="放大查看照片"><img class="moment-photo" src="${photos[0]}" alt="${escapeHtml(moment.title)} 的照片" /></button>` : `<div class="moment-photo-placeholder">${moment.type === 'anniversary' ? '♥' : moment.type === 'date' ? '☼' : '✦'}</div>`;
    const gallery = photos.length > 1 ? `<div class="moment-gallery">${photos.slice(1,4).map((image, index) => `<button type="button" class="moment-gallery-button" data-open-photo="${moment.id}" data-photo-index="${index + 1}" aria-label="放大查看第 ${index + 2} 张照片"><img src="${image}" alt="${escapeHtml(moment.title)} 的第 ${index + 2} 张照片" /></button>`).join('')}</div>` : '';
    return `<article class="moment-card" data-open-moment="${escapeHtml(moment.id)}" tabindex="0" role="button" aria-label="查看帖子：${escapeHtml(moment.title)}" style="--card-color:${typeColor(moment.type)}">${photo}<div class="moment-copy"><div class="moment-meta"><span class="author-badge">${escapeHtml(displayAuthor(moment))}</span><span class="moment-type">${typeLabel(moment.type)}</span></div><h3>${escapeHtml(moment.title)}</h3>${moment.note ? `<p>${escapeHtml(moment.note)}</p>` : ''}${gallery}<span class="moment-open-hint">查看完整帖子与评论 ›</span></div></article>`;
  }).join('')}</div>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' })[character]); }
function renderCounters() {
  const current = profile(); const now = new Date(); now.setHours(0,0,0,0);
  if (!current.loveStart) { $('#togetherDays').textContent = '--'; $('#nextAnniversary').innerHTML = `从恋爱开始那天起<br /><strong>记录每一次心动</strong>`; return; }
  const start = dateFromIso(current.loveStart); const days = Math.max(1, Math.floor((now - start) / 86400000) + 1); $('#togetherDays').textContent = days;
  const anniversary = new Date(now.getFullYear(), start.getMonth(), start.getDate()); if (anniversary < now) anniversary.setFullYear(anniversary.getFullYear() + 1); const until = Math.ceil((anniversary - now) / 86400000); $('#nextAnniversary').innerHTML = `距离下一个纪念日<br /><strong>${until === 0 ? '就是今天' : `${until} 天`}</strong>`;
}
function renderExtras() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const remote = state.settings.remote;
  const meeting = remote.meeting ? dateFromIso(remote.meeting) : null;
  const meetingDelta = meeting ? Math.ceil((meeting - today) / 86400000) : null;
  $('#meetingCountdown').textContent = meetingDelta == null ? '-- 天' : meetingDelta < 0 ? '想见面了' : meetingDelta === 0 ? '就是今天' : `${meetingDelta} 天`;
  $('#meetingDate').textContent = meeting ? `${formatDate(remote.meeting, { month:'long', day:'numeric', weekday:'long' })}见面` : '还没有约好日期';
  const myRole = currentMemberRole(), partnerRole = oppositeMemberRole(myRole);
  const mine = normalizedLocation(state.settings.locations?.[myRole]);
  const partner = normalizedLocation(state.settings.locations?.[partnerRole]);
  const located = (location) => location?.source === 'gps-city' && location.city && location.timezone;
  const clock = (location) => {
    if (!located(location)) return '--:--';
    try { return new Intl.DateTimeFormat('zh-CN', { timeZone: location.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
    catch (_) { return '--:--'; }
  };
  $('#cityALabel').textContent = located(mine) ? mine.city : '我 · 待刷新';
  $('#cityBLabel').textContent = located(partner) ? partner.city : 'TA · 待刷新';
  $('#cityATime').textContent = clock(mine); $('#cityBTime').textContent = clock(partner);
  const cycle = state.settings.cycle; const cycleStart = cycle?.start ? dateFromIso(cycle.start) : null;
  const currentProfile = profile();
  const partnerNeedsCycle = currentProfile.partnerGender === 'female';
  $('#cycleTitle').textContent = currentProfile.myGender === 'female' ? '温柔地照顾自己' : partnerNeedsCycle ? 'TA 的生理期记录与提醒' : '生理期记录与提醒';
  $('#cycleRecordButton').textContent = currentProfile.myGender === 'female' ? '今天开始了' : '记录开始日';
  if (cycleStart) {
    const next = nextCycleStart(cycle, today);
    const daysUntil = Math.ceil((next - today) / 86400000);
    $('#cycleHeadline').textContent = daysUntil === 0 ? '预计今天开始，记得照顾自己' : `下一次预计还有 ${daysUntil} 天`;
    $('#cycleSubline').textContent = `预计 ${formatDate(localIso(next.getFullYear(), next.getMonth(), next.getDate()), { month:'long', day:'numeric' })} 开始 · 提前 ${cycle.reminderDays || 0} 天提醒`;
  } else {
    $('#cycleHeadline').textContent = '设置后，给自己一份温柔提醒';
    $('#cycleSubline').textContent = '预测仅供参考，是否共享完全由你决定';
  }
  $('#privacyStatus').textContent = cycle.shared ? '已允许共享' : '仅自己可见';
  renderStatuses();
  renderLocations();
}
function renderAll() { renderProfile(); renderCalendar(); renderDay(); renderCounters(); renderExtras(); }
function renderPhotoPreviews() {
  $('#photoPreviewGrid').innerHTML = state.photos.map((photo, index) => `<div class="photo-preview-item"><img src="${photo}" alt="待上传照片 ${index + 1}" /><button type="button" data-photo-index="${index}" aria-label="移除第 ${index + 1} 张照片">×</button></div>`).join('');
}
function updatePhotoViewer() {
  const moment = state.moments.find((item) => item.id === photoViewerMomentId);
  const photos = momentPhotos(moment || {});
  if (!moment || !photos.length) { $('#photoViewerDialog').close(); return; }
  photoViewerIndex = (photoViewerIndex + photos.length) % photos.length;
  $('#photoViewerImage').src = photos[photoViewerIndex];
  $('#photoViewerImage').alt = `${moment.title} 的第 ${photoViewerIndex + 1} 张照片`;
  $('#photoViewerCaption').textContent = `${moment.title} · ${photoViewerIndex + 1}/${photos.length}`;
  $('#photoViewerPrevious').hidden = photos.length < 2;
  $('#photoViewerNext').hidden = photos.length < 2;
}
function openPhotoViewer(momentId, index = 0) {
  photoViewerMomentId = momentId;
  photoViewerIndex = Number(index) || 0;
  updatePhotoViewer();
  if (!$('#photoViewerDialog').open) $('#photoViewerDialog').showModal();
}
function movePhotoViewer(direction) {
  photoViewerIndex += direction;
  updatePhotoViewer();
}
function openMomentDialog(defaultType = 'diary') {
  state.formType = defaultType; state.author = profile().myName || ''; state.photos = [];
  $('#momentForm').reset(); $('#formDateContext').textContent = `记录日期：${formatDate(state.selected, { year:'numeric', month:'long', day:'numeric', weekday:'long' })}`;
  renderPhotoPreviews(); document.querySelectorAll('.type-option').forEach((button) => button.classList.toggle('selected', button.dataset.type === defaultType));
  momentDialog.showModal(); $('#momentTitle').focus();
}

calendarGrid.addEventListener('click', (event) => { const cell = event.target.closest('.day-cell'); if (!cell) return; state.selected = cell.dataset.date; const selectedDate = dateFromIso(state.selected); state.current = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); markMomentsRead((moment) => moment.date === state.selected); renderAll(); });
$('#previousMonth').addEventListener('click', () => { state.current.setMonth(state.current.getMonth() - 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', () => { state.current.setMonth(state.current.getMonth() + 1); renderCalendar(); });
$('#todayButton').addEventListener('click', () => { const now = new Date(); state.current = new Date(now.getFullYear(), now.getMonth(), 1); state.selected = isoDate(now); renderAll(); });
$('#addMomentButton').addEventListener('click', openMomentDialog);
$('#momentDialogClose').addEventListener('click', () => momentDialog.close());
document.querySelectorAll('.type-option').forEach((button) => button.addEventListener('click', () => { state.formType = button.dataset.type; document.querySelectorAll('.type-option').forEach((option) => option.classList.toggle('selected', option === button)); }));
document.querySelectorAll('.author-toggle button').forEach((button) => button.addEventListener('click', () => { state.author = button.dataset.author; document.querySelectorAll('.author-toggle button').forEach((option) => option.classList.toggle('selected', option === button)); }));
$('#momentPhoto').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, 9 - state.photos.length));
  event.target.value = '';
  const input = $('#momentPhoto'); const label = $('#photoUploadLabel'); input.disabled = true;
  try {
    for (let index = 0; index < files.length; index += 1) {
      label.textContent = `正在处理照片 ${index + 1}/${files.length}…`;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('照片读取失败'));
        reader.readAsDataURL(files[index]);
      });
      state.photos.push(await resizePhoto(dataUrl, 1280, 0.74));
      renderPhotoPreviews();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch (error) {
    alert(`有一张照片无法处理：${error.message || error}`);
  } finally {
    input.disabled = false;
    label.innerHTML = '＋ 添加照片 <small>一次最多 9 张，选择后自动优化</small>';
  }
});
$('#photoPreviewGrid').addEventListener('click', (event) => { const button = event.target.closest('button[data-photo-index]'); if (!button) return; state.photos.splice(Number(button.dataset.photoIndex), 1); renderPhotoPreviews(); });
dayContent.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-photo]');
  if (button) { openPhotoViewer(button.dataset.openPhoto, button.dataset.photoIndex); return; }
  const momentTarget = event.target.closest('[data-open-moment]');
  if (momentTarget) openMomentDetail(momentTarget.dataset.openMoment);
});
dayContent.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.target.closest('[data-open-photo]')) return;
  const momentTarget = event.target.closest('[data-open-moment]');
  if (!momentTarget) return;
  event.preventDefault();
  openMomentDetail(momentTarget.dataset.openMoment);
});
$('#photoViewerClose').addEventListener('click', () => $('#photoViewerDialog').close());
$('#photoViewerPrevious').addEventListener('click', () => movePhotoViewer(-1));
$('#photoViewerNext').addEventListener('click', () => movePhotoViewer(1));
$('#photoViewerDialog').addEventListener('click', (event) => { if (event.target === $('#photoViewerDialog')) $('#photoViewerDialog').close(); });
$('#momentForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const title = $('#momentTitle').value.trim(); if (!title) return;
  const button = $('#saveMoment'); button.disabled = true;
  const photos = [...state.photos];
  // Save the optimized local copies first. A temporary network or storage
  // error must never make the record disappear from this device.
  const role = currentMemberRole();
  const pendingMoment = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, date: state.selected, type: state.formType, title, note: $('#momentNote').value.trim(), author: profile().myName, authorRole: role, createdAt: new Date().toISOString(), seenBy: [role], comments: [], photos, storagePhotos: photos, photo: photos[0] || '' };
  state.moments.unshift(pendingMoment);
  try {
    saveMoments();
  } catch (error) {
    state.moments.shift(); button.disabled = false;
    alert('手机浏览器的本地空间不足，记录尚未发布。请删除一部分旧的本机照片后重试。');
    return;
  }
  momentDialog.close(); renderAll();
  try {
    const result = await pushCloud();
    if (photos.some((photo) => /^data:/.test(photo)) && !result.ok) {
      const detail = window.HeartbeatCloud?.describeError ? window.HeartbeatCloud.describeError(result.error) : (result.error?.message || '网络暂时不可用');
      alert(`记录和优化后的照片已安全保存到本机。照片暂未上传到云端，会在网络恢复后自动重试。\n\n原因：${detail}`);
    }
  } finally { button.disabled = false; }
});
$('#shareButton').addEventListener('click', () => {
  const code = state.settings.cloud && state.settings.cloud.inviteCode;
  // Older local installs predate the explicit role field. They are the
  // creator's install unless they were explicitly recorded as a partner.
  const isOwner = state.settings.cloud?.memberRole !== 'partner';
  $('#shareDialogCopy').textContent = code ? `把邀请码 ${code} 发给 TA。TA 在另一台设备打开“加入情侣空间”后输入它，就会同步到这里。` : isOwner ? '旧邀请码不会明文保存在云端；你可以在下方生成一个新的系统邀请码。' : '请先完成资料并创建情侣空间，邀请码会在这里出现。';
  $('#inviteCodeBox').hidden = !(code || isOwner);
  $('#inviteCodeHint').textContent = code ? '请直接复制，不要手动改写；TA 加入成功后，这个邀请码不能再添加第三个人。' : '没有可显示的旧邀请码。点击下方按钮，由系统生成一个新的邀请码。';
  $('#inviteCodeValue').textContent = code || '尚未生成';
  $('#copyInviteCode').hidden = !code;
  $('#copyInviteCode').innerHTML = '<span aria-hidden="true">⧉</span> 一键复制';
  $('#inviteCopyFeedback').hidden = true;
  $('#inviteCopyFeedback').textContent = '';
  $('#newInviteCode').hidden = !isOwner;
  const syncCode = deviceSyncCode();
  $('#deviceSyncBox').hidden = !syncCode;
  $('#deviceSyncCode').textContent = syncCode;
  $('#shareDialog').showModal();
});
$('#copyRoadmap').addEventListener('click', () => $('#shareDialog').close());
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('浏览器未允许自动复制');
  return true;
}
async function copyInviteCode() {
  const code = state.settings.cloud && state.settings.cloud.inviteCode;
  if (!code) return;
  try {
    await copyText(code);
    $('#copyInviteCode').innerHTML = '<span aria-hidden="true">✓</span> 已复制';
    $('#inviteCopyFeedback').textContent = '邀请码已复制，可以直接发给 TA。';
    $('#inviteCopyFeedback').hidden = false;
  } catch (_) {
    $('#inviteCopyFeedback').textContent = '浏览器没有允许自动复制，请在弹窗中长按复制。';
    $('#inviteCopyFeedback').hidden = false;
    prompt('请复制这串给 TA 的邀请码：', code);
  }
}
$('#copyInviteCode').addEventListener('click', copyInviteCode);
$('#inviteCodeValue').addEventListener('click', copyInviteCode);
$('#inviteCodeValue').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); copyInviteCode(); }
});
$('#newInviteCode').addEventListener('click', async () => {
  try {
    if (!cloudSession() || !window.HeartbeatCloud) throw new Error('请先完成情侣空间的云端同步');
    const result = await window.HeartbeatCloud.newInvite(cloudSession());
    state.settings.cloud.inviteCode = result.inviteCode;
    if (result.memberRole) state.settings.cloud.memberRole = result.memberRole;
    saveSettings();
    $('#shareDialogCopy').textContent = `把邀请码 ${result.inviteCode} 发给 TA。TA 在另一台设备打开“加入情侣空间”后输入它，就会同步到这里。`;
    $('#inviteCodeHint').textContent = '邀请码已经由系统生成。请直接复制，不要手动改写。';
    $('#inviteCodeValue').textContent = result.inviteCode;
    $('#copyInviteCode').hidden = false;
    $('#copyInviteCode').innerHTML = '<span aria-hidden="true">⧉</span> 一键复制';
    $('#inviteCopyFeedback').hidden = true;
    $('#newInviteCode').textContent = '重新生成邀请码';
  } catch (error) {
    const detail = window.HeartbeatCloud?.describeError ? window.HeartbeatCloud.describeError(error) : (error?.message || String(error));
    alert(`无法生成邀请码：${detail}`);
  }
});
$('#copyDeviceCode').addEventListener('click', async () => {
  const code = deviceSyncCode();
  if (!code) return;
  try { await navigator.clipboard.writeText(code); $('#copyDeviceCode').textContent = '已复制'; }
  catch (_) { prompt('请复制这串个人设备同步码：', code); }
});
function clearOnboardingFieldError(field) {
  if (!field) return;
  const container = field.matches?.('.field-invalid') ? field : field.closest?.('.field-invalid');
  const resolved = container || (field.id === 'myGenderInput' ? $('#myGenderField') : field.id === 'partnerGenderInput' ? $('#partnerGenderField') : field.closest?.('label'));
  if (resolved) {
    resolved.classList.remove('field-invalid');
    resolved.querySelectorAll('.field-error-text').forEach((message) => message.remove());
    resolved.querySelectorAll('[aria-invalid="true"]').forEach((input) => input.removeAttribute('aria-invalid'));
  }
  if ($('#onboardingValidationSummary')) $('#onboardingValidationSummary').hidden = true;
}
function clearOnboardingValidation() {
  document.querySelectorAll('#onboardingForm .field-invalid').forEach((field) => field.classList.remove('field-invalid'));
  document.querySelectorAll('#onboardingForm .field-error-text').forEach((message) => message.remove());
  document.querySelectorAll('#onboardingForm [aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
  $('#onboardingValidationSummary').hidden = true;
  $('#onboardingValidationSummary').textContent = '';
}
function markOnboardingInvalid(field, message, container) {
  const target = typeof field === 'string' ? $(`#${field}`) : field;
  const box = container || target?.closest('label');
  if (!box) return null;
  box.classList.add('field-invalid');
  if (target) target.setAttribute('aria-invalid', 'true');
  const error = document.createElement('small');
  error.className = 'field-error-text';
  error.textContent = message;
  box.appendChild(error);
  return { target, box };
}
function validateOnboarding(mode) {
  clearOnboardingValidation();
  const errors = [];
  const requireText = (id, message) => {
    const field = $(`#${id}`);
    if (!field.value.trim()) errors.push(markOnboardingInvalid(field, message));
  };
  if (mode === 'join') {
    const field = $('#inviteCodeInput');
    if (!field.value.trim()) errors.push(markOnboardingInvalid(field, '请输入 TA 发给你的完整邀请码。'));
    else {
      try { normalizeInviteCode(field.value); }
      catch (_) { errors.push(markOnboardingInvalid(field, '邀请码格式不完整，请直接复制 TA 发来的整串内容。')); }
    }
  } else if (mode === 'device') {
    const field = $('#deviceCodeInput');
    if (!field.value.trim()) errors.push(markOnboardingInvalid(field, '请输入这位用户自己的设备同步码。'));
    else {
      try { parseDeviceSyncCode(field.value); }
      catch (_) { errors.push(markOnboardingInvalid(field, '同步码格式不完整，请复制完整内容后再试。')); }
    }
  } else {
    if (!$('#myGenderInput').value) errors.push(markOnboardingInvalid($('#myGenderInput'), '请选择你自己的身份。', $('#myGenderField')));
    if (!$('#partnerGenderInput').value) errors.push(markOnboardingInvalid($('#partnerGenderInput'), '请选择 TA 的身份。', $('#partnerGenderField')));
    requireText('myNameInput', '请填写你的名字。');
    requireText('partnerNameInput', '请填写 TA 的名字。');
    requireText('partnerNicknameInput', '请填写你想叫 TA 什么。');
    requireText('myNicknameInput', '请填写 TA 想叫你什么。');
    if (!$('#loveStartInput').value) errors.push(markOnboardingInvalid($('#loveStartInput'), '请选择恋爱开始日期。'));
  }
  const validErrors = errors.filter(Boolean);
  if (!validErrors.length) return true;
  const summary = $('#onboardingValidationSummary');
  summary.textContent = `还有 ${validErrors.length} 项没有完成，请查看标红的位置。`;
  summary.hidden = false;
  const first = validErrors[0];
  first.box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusTarget = first.target?.type === 'hidden' ? first.box.querySelector('button,input,select') : first.target;
  window.setTimeout(() => focusTarget?.focus(), 250);
  return false;
}
function selectGender(targetId, gender) {
  $(`#${targetId}`).value = gender;
  document.querySelectorAll(`.gender-picker[data-gender-target="${targetId}"] button`).forEach((button) => button.classList.toggle('selected', button.dataset.gender === gender));
  clearOnboardingFieldError($(`#${targetId}`));
  updateIdentityCopy();
}
function updateIdentityCopy() {
  const gender = $('#partnerGenderInput').value;
  const pronoun = gender === 'male' ? '他' : gender === 'female' ? '她' : 'TA';
  $('#partnerNameLabel').textContent = `${pronoun}的名字`;
  $('#partnerNicknameLabel').textContent = `你想叫${pronoun}什么`;
  $('#myNicknameLabel').textContent = `${pronoun}想叫你什么`;
  $('#identityTip').textContent = $('#myGenderInput').value ? `已识别：这台设备由“我”使用。记录会自动署名，无需再从两个人中选择。` : '先选身份；这台设备会自动记住“我是谁”。';
}
function openOnboarding(editing = false) {
  clearOnboardingValidation();
  const current = profile();
  $('#onboardingTitle').textContent = editing ? '修改我们的档案' : '先为你们建一份档案';
  $('#myNameInput').value = current.myName || '';
  $('#partnerNameInput').value = current.partnerName || '';
  $('#myNicknameInput').value = current.myNickname || '';
  $('#partnerNicknameInput').value = current.partnerNickname || '';
  $('#loveStartInput').value = current.loveStart || '';
  $('#longDistanceInput').checked = Boolean(current.longDistance);
  setOnboardingMode('create', editing);
  $('#inviteCodeInput').value = '';
  $('#deviceCodeInput').value = '';
  selectGender('myGenderInput', current.myGender || '');
  selectGender('partnerGenderInput', current.partnerGender || '');
  updateIdentityCopy();
  $('#onboardingDialog').showModal();
}
function setOnboardingMode(mode, editing = false) {
  clearOnboardingValidation();
  const joining = mode === 'join';
  const syncingDevice = mode === 'device';
  const compactMode = joining || syncingDevice;
  $('#spaceModeInput').value = mode;
  $('#onboardingDialog').classList.toggle('joining', compactMode);
  document.querySelectorAll('.space-mode button').forEach((button) => button.classList.toggle('selected', button.dataset.spaceMode === mode));
  $('#joinExplanation').hidden = !joining;
  $('#joinCodeField').hidden = !joining;
  $('#deviceExplanation').hidden = !syncingDevice;
  $('#deviceCodeField').hidden = !syncingDevice;
  document.querySelectorAll('#onboardingForm .setup-only input, #onboardingForm .setup-only select').forEach((field) => { field.disabled = compactMode; });
  $('#onboardingTitle').textContent = joining ? '输入邀请码，进入 TA 的小宇宙' : syncingDevice ? '同步我自己的另一台设备' : (editing ? '修改我们的档案' : '先为你们建一份档案');
  $('.onboarding-copy').textContent = joining
    ? '邀请码验证后，系统会自动识别你是另一方，并带入对方创建时填写的名字、爱称、纪念日和异地设置。'
    : syncingDevice
      ? '这是同一个人换手机、电脑或浏览器时使用的入口。输入你自己的私人同步码后，会恢复完全相同的身份和情侣空间。'
      : '先建立一个情侣空间，再分别定义两位使用者。每个人打开自己的设备时，都以自己的身份进入同一个空间。';
  $('#onboardingSubmitButton').textContent = joining ? '验证邀请码并加入' : syncingDevice ? '同步并登录这个设备' : '保存我们的开始';
}
$('#profileButton').addEventListener('click', () => openOnboarding(true));
$('#onboardingForm').addEventListener('input', (event) => clearOnboardingFieldError(event.target));
document.querySelectorAll('.gender-picker button').forEach((button) => button.addEventListener('click', () => selectGender(button.closest('.gender-picker').dataset.genderTarget, button.dataset.gender)));
document.querySelectorAll('.space-mode button').forEach((button) => button.addEventListener('click', () => {
  setOnboardingMode(button.dataset.spaceMode);
}));
$('#onboardingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const mode = $('#spaceModeInput').value;
  if (!validateOnboarding(mode)) return;
  if (mode === 'device') {
    try {
      if (!window.HeartbeatCloud) throw new Error('CloudBase SDK unavailable');
      const session = parseDeviceSyncCode($('#deviceCodeInput').value);
      setSyncStatus('正在同步你的情侣空间…');
      const result = await window.HeartbeatCloud.pull(session);
      if (!result.snapshot) throw new Error('没有找到情侣空间的数据');
      state.settings.cloud.session = session;
      state.settings.cloud.memberRole = result.memberRole || '';
      state.settings.cloud.inviteCode = '';
      await applyCloudSnapshot(result.snapshot, result.memberRole);
      state.settings.cloud.lastSync = Date.now();
      saveSettings(); $('#onboardingDialog').close(); renderAll(); setSyncStatus('已同步给 TA', true); window.setTimeout(maybeOfferLocation, 250);
    } catch (error) {
      const detail = window.HeartbeatCloud?.describeError ? window.HeartbeatCloud.describeError(error) : (error?.message || String(error || '未知错误'));
      console.warn('心动日历设备同步失败：' + detail, error);
      setSyncStatus('尚未同步此设备');
      alert('这台设备还没有进入你的情侣空间：' + detail);
    }
    return;
  }
  const profileUpdate = {
    complete: true,
    myName: $('#myNameInput').value.trim(),
    partnerName: $('#partnerNameInput').value.trim(),
    myNickname: $('#myNicknameInput').value.trim(),
    partnerNickname: $('#partnerNicknameInput').value.trim(),
    myGender: $('#myGenderInput').value,
    partnerGender: $('#partnerGenderInput').value,
    loveStart: $('#loveStartInput').value,
    longDistance: $('#longDistanceInput').checked
  };
  if (mode === 'create') {
    state.settings.profile = profileUpdate;
    saveSettings();
  }
  try {
    if (!window.HeartbeatCloud) throw new Error('CloudBase SDK unavailable');
    setSyncStatus('正在连接情侣空间…');
    const result = mode === 'join'
      ? await window.HeartbeatCloud.join(normalizeInviteCode($('#inviteCodeInput').value))
      : cloudSession() ? await window.HeartbeatCloud.push(cloudSession(), sharedSnapshot()) : await window.HeartbeatCloud.create(profileUpdate, sharedSnapshot());
    if (result.session) state.settings.cloud.session = result.session;
    if (result.memberRole) state.settings.cloud.memberRole = result.memberRole;
    if (result.inviteCode) state.settings.cloud.inviteCode = result.inviteCode;
    if (mode === 'join' && result.snapshot) state.settings.profile = joinedPartnerProfile(result.snapshot);
    if (mode === 'create' && result.session) {
      await pushCloud();
    } else if (result.snapshot) await applyCloudSnapshot(result.snapshot, result.memberRole);
    saveSettings(); $('#onboardingDialog').close(); renderAll(); setSyncStatus('已同步给 TA', true); window.setTimeout(maybeOfferLocation, 250);
  } catch (error) {
    const detail = window.HeartbeatCloud?.describeError ? window.HeartbeatCloud.describeError(error) : (error?.message || String(error || '未知错误'));
    console.warn('心动日历云端同步失败：' + detail, error);
    if (mode === 'join') {
      setSyncStatus('邀请码未验证');
      alert(`无法加入情侣空间：${detail}\n\n请从 TA 的“邀请”窗口复制完整邀请码后再试。`);
      return;
    }
    saveSettings(); $('#onboardingDialog').close(); renderAll(); window.setTimeout(maybeOfferLocation, 250);
    setSyncStatus('本机已保存，待同步');
    alert('资料已保存到本机。腾讯云连接尚未完成：' + detail + '。请截取此完整提示发给我。');
  }
});
$('#refreshLocationButton').addEventListener('click', () => refreshMyLocation(false));
$('#allowLocationButton').addEventListener('click', () => refreshMyLocation(true));
$('#skipLocationButton').addEventListener('click', () => {
  state.settings.locationUi = { ...(state.settings.locationUi || {}), prompted: true };
  saveSettings(); setLocationPermissionMessage(''); $('#locationPermissionDialog').close();
});
$('#remoteSettingsButton').addEventListener('click', () => {
  const remote = state.settings.remote;
  $('#meetingInput').value = remote.meeting || '';
  $('#remoteDialog').showModal();
});
$('#cycleSettingsButton').addEventListener('click', () => {
  const cycle = state.settings.cycle;
  $('#cycleStartInput').value = cycle.start || '';
  $('#cycleLengthInput').value = String(cycle.length || 29); $('#cycleDaysInput').value = String(cycle.days || 5); $('#cycleReminderInput').value = String(cycle.reminderDays ?? 2); $('#cycleSharedInput').checked = Boolean(cycle.shared);
  $('#cycleDialog').showModal();
});
document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.closeDialog}`).close()));
$('#remoteForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.settings.remote = { ...state.settings.remote, meeting: $('#meetingInput').value };
  saveSettings(); $('#remoteDialog').close(); renderExtras(); void pushCloud();
});
$('#cycleForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.settings.cycle = { start: $('#cycleStartInput').value, length: Number($('#cycleLengthInput').value), days: Number($('#cycleDaysInput').value), reminderDays: Number($('#cycleReminderInput').value), shared: $('#cycleSharedInput').checked };
  saveSettings(); $('#cycleDialog').close(); renderAll(); void pushCloud();
});
$('#cycleRecordButton').addEventListener('click', () => {
  state.settings.cycle.start = isoDate(new Date()); saveSettings(); renderAll(); void pushCloud();
});
$('#cycleReminderButton').addEventListener('click', async () => {
  if (!('Notification' in window)) { alert('当前浏览器不支持系统通知；应用内预测和提醒仍可正常使用。'); return; }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') { new Notification('心动日历提醒已开启', { body: '预计日期临近时，打开应用会收到温柔提醒。' }); }
  else { alert('没有获得通知权限。你仍可在日历中查看预测日期。'); }
});
$('#addAnniversaryButton').addEventListener('click', () => { $('#anniversariesDialog').close(); openMomentDialog('anniversary'); });
$('#memoriesList').addEventListener('click', (event) => {
  const openButton = event.target.closest('[data-open-photo]');
  const photoButton = event.target.closest('[data-delete-photo]');
  const momentButton = event.target.closest('[data-delete-moment]');
  const commentButton = event.target.closest('[data-delete-comment]');
  if (openButton) { openPhotoViewer(openButton.dataset.openPhoto, openButton.dataset.photoIndex); return; }
  if (commentButton) {
    const moment = state.moments.find((item) => item.id === commentButton.dataset.deleteComment);
    const comment = moment && (Array.isArray(moment.comments) ? moment.comments : []).find((item) => item.id === commentButton.dataset.commentId);
    if (!moment || !comment || !canDeleteComment(comment) || !confirm('删除自己的这条评论吗？')) return;
    moment.deletedCommentIds = [...new Set([...(Array.isArray(moment.deletedCommentIds) ? moment.deletedCommentIds : []), comment.id])].slice(-160);
    moment.comments = moment.comments.filter((item) => item.id !== comment.id);
    saveMoments(); renderMemoryFeed(); void pushCloud(); return;
  }
  if (photoButton) {
    const moment = state.moments.find((item) => item.id === photoButton.dataset.deletePhoto);
    if (!moment || !canEditMoment(moment) || !confirm('删除这张照片吗？')) return;
    const photos = momentPhotos(moment); photos.splice(Number(photoButton.dataset.photoIndex), 1); moment.photos = photos; moment.storagePhotos = photos; moment.photo = photos[0] || ''; saveMoments(); renderAll(); renderMemoryFeed(); void pushCloud(); return;
  }
  if (momentButton) {
    const moment = state.moments.find((item) => item.id === momentButton.dataset.deleteMoment);
    if (!moment || !canEditMoment(moment) || !confirm('删除这条记录及其中的照片吗？此操作无法撤销。')) return;
    state.settings.cloud.deletedMomentIds = [...new Set([...(state.settings.cloud.deletedMomentIds || []), moment.id])].slice(-1200);
    state.moments = state.moments.filter((item) => item.id !== moment.id); saveSettings(); saveMoments(); renderAll(); renderMemoryFeed(); void pushCloud();
  }
});
$('#memoriesList').addEventListener('submit', (event) => {
  const form = event.target.closest('[data-comment-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements.comment;
  const body = String(input.value || '').trim();
  const moment = state.moments.find((item) => item.id === form.dataset.commentForm);
  if (!moment || !body) return;
  const role = currentMemberRole();
  moment.comments = Array.isArray(moment.comments) ? moment.comments : [];
  moment.comments.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, body, author: profile().myName, authorRole: role, createdAt: new Date().toISOString() });
  saveMoments(); renderMemoryFeed(); void pushCloud();
});
$('#memoriesDialogClose').addEventListener('click', () => $('#memoriesDialog').close());
$('#momentDetailClose').addEventListener('click', () => $('#momentDetailDialog').close());
$('#momentDetailContent').addEventListener('click', (event) => {
  const openButton = event.target.closest('[data-open-photo]');
  const photoButton = event.target.closest('[data-delete-photo]');
  const momentButton = event.target.closest('[data-delete-moment]');
  const commentButton = event.target.closest('[data-delete-comment]');
  if (openButton) { openPhotoViewer(openButton.dataset.openPhoto, openButton.dataset.photoIndex); return; }
  if (commentButton) {
    const moment = state.moments.find((item) => item.id === commentButton.dataset.deleteComment);
    const comment = moment && (Array.isArray(moment.comments) ? moment.comments : []).find((item) => item.id === commentButton.dataset.commentId);
    if (!moment || !comment || !canDeleteComment(comment) || !confirm('删除自己的这条评论吗？')) return;
    moment.deletedCommentIds = [...new Set([...(Array.isArray(moment.deletedCommentIds) ? moment.deletedCommentIds : []), comment.id])].slice(-160);
    moment.comments = moment.comments.filter((item) => item.id !== comment.id);
    saveMoments(); renderMemoryFeed(); renderMomentDetail(moment.id); void pushCloud(); return;
  }
  if (photoButton) {
    const moment = state.moments.find((item) => item.id === photoButton.dataset.deletePhoto);
    if (!moment || !canEditMoment(moment) || !confirm('删除这张照片吗？')) return;
    const photos = momentPhotos(moment); photos.splice(Number(photoButton.dataset.photoIndex), 1); moment.photos = photos; moment.storagePhotos = photos; moment.photo = photos[0] || '';
    saveMoments(); renderAll(); renderMemoryFeed(); renderMomentDetail(moment.id); void pushCloud(); return;
  }
  if (momentButton) {
    const moment = state.moments.find((item) => item.id === momentButton.dataset.deleteMoment);
    if (!moment || !canEditMoment(moment) || !confirm('删除这条记录及其中的照片吗？此操作无法撤销。')) return;
    state.settings.cloud.deletedMomentIds = [...new Set([...(state.settings.cloud.deletedMomentIds || []), moment.id])].slice(-1200);
    state.moments = state.moments.filter((item) => item.id !== moment.id);
    saveSettings(); saveMoments(); renderAll(); renderMemoryFeed(); $('#momentDetailDialog').close(); detailMomentId = ''; void pushCloud();
  }
});
$('#momentDetailContent').addEventListener('submit', (event) => {
  const form = event.target.closest('[data-comment-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements.comment;
  const body = String(input.value || '').trim();
  const moment = state.moments.find((item) => item.id === form.dataset.commentForm);
  if (!moment || !body) return;
  const role = currentMemberRole();
  moment.comments = Array.isArray(moment.comments) ? moment.comments : [];
  moment.comments.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, body, author: profile().myName, authorRole: role, createdAt: new Date().toISOString() });
  saveMoments(); renderMemoryFeed(); renderMomentDetail(moment.id); void pushCloud();
});
$('#openStatusEditor').addEventListener('click', openStatusEditor);
$('#statusDialogClose').addEventListener('click', () => $('#statusDialog').close());
$('#statusCategoryTabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-status-group]');
  if (!button) return;
  statusEditorGroup = button.dataset.statusGroup;
  renderStatusEditor();
});
$('#statusPresetGrid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-status-preset]');
  if (!button) return;
  const preset = statusPresetById(button.dataset.statusPreset);
  if (!preset) return;
  selectedStatusPreset = preset.id;
  $('#customStatusEmoji').value = preset.emoji;
  $('#customStatusText').value = preset.text;
  $('#customStatusText').removeAttribute('aria-invalid');
  $('#statusFormError').hidden = true;
  renderStatusEditor();
});
['customStatusEmoji','customStatusText'].forEach((id) => $(`#${id}`).addEventListener('input', () => {
  selectedStatusPreset = '';
  document.querySelectorAll('.status-preset-option').forEach((button) => button.classList.remove('selected'));
  $('#customStatusText').removeAttribute('aria-invalid');
  $('#statusFormError').hidden = true;
  updateStatusPreview();
}));
$('#statusForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('#customStatusText').value.trim();
  if (!text) {
    $('#customStatusText').setAttribute('aria-invalid', 'true');
    $('#statusFormError').textContent = '请先选择一个预设状态，或者写一句自定义状态。';
    $('#statusFormError').hidden = false;
    $('#customStatusText').focus();
    return;
  }
  const duration = $('#statusDuration').value;
  const role = currentMemberRole();
  state.settings.statuses = { ...(state.settings.statuses || {}), [role]: {
    emoji: ($('#customStatusEmoji').value.trim() || '💭').slice(0, 16),
    text: text.slice(0, 20),
    presetId: selectedStatusPreset,
    createdAt: new Date().toISOString(),
    expiresAt: statusExpiration(duration),
    duration
  } };
  saveSettings(); renderStatuses(); $('#statusDialog').close(); void pushCloud();
});
$('#clearStatusButton').addEventListener('click', () => {
  const role = currentMemberRole();
  state.settings.statuses = { ...(state.settings.statuses || {}), [role]: null };
  saveSettings(); renderStatuses(); $('#statusDialog').close(); void pushCloud();
});
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === button));
  if (button.dataset.view === 'settings') openOnboarding(true);
  else if (button.dataset.view === 'memories') { markMomentsRead(); renderCalendar(); renderMemoryFeed(); $('#memoriesDialog').showModal(); }
  else if (button.dataset.view === 'anniversaries') { renderCollection('anniversariesList', sortedMoments((moment) => moment.type === 'anniversary'), '还没有纪念日。把值得庆祝的日子加进来吧。'); $('#anniversariesDialog').showModal(); }
}));
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
renderAll();
if (!profile().complete || !profile().myGender || !profile().partnerGender) openOnboarding();
else window.setTimeout(maybeOfferLocation, 600);
if (cloudSession() && window.HeartbeatCloud) window.HeartbeatCloud.initialise().then(pullCloud).catch(() => setSyncStatus('本机已保存，待同步'));
else setSyncStatus('等待创建情侣空间');
maybeCycleReminder();
setInterval(renderExtras, 60000);
setInterval(pullCloud, 25000);
