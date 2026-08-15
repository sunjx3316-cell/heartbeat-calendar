/* CloudBase client for the shared couple space. The environment id is public;
   access is protected by anonymous CloudBase auth plus a per-member secret. */
(function () {
  // This file intentionally contains no owner's CloudBase environment. Each
  // deployment supplies its own public environment ID in config.js. API keys
  // must never be placed in a web page.
  const config = window.HEARTBEAT_CONFIG || {};
  const ENV_ID = String(config.cloudbaseEnvId || '').trim();
  const FUNCTION_NAME = String(config.cloudFunctionName || 'couple-calendar').trim();
  let app;
  let ready;

  function randomId() {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function describeError(error) {
    if (!error) return '未知错误';
    if (typeof error === 'string') return error;
    const nested = error.error && typeof error.error === 'object' ? error.error : null;
    const description = error.error_description || error.message || nested?.error_description || nested?.message;
    const code = typeof error.error === 'string' ? error.error : error.code || nested?.code;
    if (code && description) return `${code}: ${description}`;
    if (description) return String(description);
    if (code) return String(code);
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch (_) {
      // Fall through to the final readable fallback.
    }
    return String(error) === '[object Object]' ? '腾讯云返回了未识别的错误' : String(error);
  }

  function throwIfResponseError(response, context) {
    if (response && response.error) {
      const detail = describeError(response.error);
      throw new Error(`${context}失败：${detail}`);
    }
    return response;
  }

  async function runCloud(context, operation) {
    try {
      return throwIfResponseError(await operation(), context);
    } catch (error) {
      const detail = describeError(error);
      if (detail.startsWith(`${context}失败`)) throw error;
      throw new Error(`${context}失败：${detail}`);
    }
  }

  async function initialise() {
    if (ready) return ready;
    ready = (async () => {
      if (!ENV_ID || ENV_ID === 'your-cloudbase-environment-id') {
        throw new Error('尚未配置云端：请编辑 app/config.js，填写自己的 CloudBase 环境 ID。');
      }
      if (!window.cloudbase || typeof window.cloudbase.init !== 'function') {
        throw new Error('腾讯云 SDK 未加载。请确认 vendor/cloudbase.full.js 已随网页一起部署');
      }

      app = window.cloudbase.init({
        env: ENV_ID,
        region: 'ap-shanghai',
        endPointMode: 'GATEWAY'
      });
      const auth = app.auth({ persistence: 'local' });
      let loginState = await auth.getLoginState();
      let signInResult;

      if (!loginState || !loginState.user) {
        if (typeof auth.anonymousAuthProvider === 'function') {
          signInResult = await auth.anonymousAuthProvider().signIn();
        } else if (typeof auth.signInAnonymously === 'function') {
          signInResult = throwIfResponseError(await auth.signInAnonymously({}), '匿名登录');
        } else {
          throw new Error('当前腾讯云 SDK 未提供匿名登录接口');
        }
      }

      loginState = await auth.getLoginState();
      const uid = loginState?.user?.uid || auth.currentUser?.uid || signInResult?.data?.user?.uid || '';
      if (!uid) throw new Error('匿名登录完成后仍未取得用户身份，请检查腾讯云“身份认证 → 登录方式 → 匿名登录”是否启用');
      return { uid };
    })().catch((error) => {
      ready = null;
      throw new Error(describeError(error));
    });
    return ready;
  }

  async function call(action, data) {
    await initialise();
    const response = await runCloud('云函数调用', () => app.callFunction({
      name: FUNCTION_NAME,
      data: { action, ...data },
      parse: true
    }));
    let result = response && response.result;
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch (_) { /* Keep the original value for the error below. */ }
    }
    if (!result || result.ok === false) throw new Error((result && result.message) || '云函数没有返回有效结果');
    return result;
  }

  async function uploadPhoto(session, dataUrl) {
    if (!session || !session.spaceId) throw new Error('缺少情侣空间信息');
    const result = await call('uploadPhoto', { session, dataUrl });
    if (!result.fileID) throw new Error('云端没有返回照片标识');
    return result.fileID;
  }

  async function resolvePhotos(session, moments) {
    const ids = [...new Set((moments || []).flatMap((moment) => Array.isArray(moment.photos) ? moment.photos : []).filter((photo) => /^cloud:\/\//.test(photo)))];
    if (!ids.length) return moments || [];
    if (!session) return moments || [];
    const result = await call('getPhotoUrls', { session, fileIDs: ids });
    const urls = Object.fromEntries((result.fileList || []).filter((item) => item.tempFileURL).map((item) => [item.fileID, item.tempFileURL]));
    return (moments || []).map((moment) => {
      const sources = moment.storagePhotos || moment.photos || [];
      const displayPhotos = sources.map((photo) => urls[photo] || photo);
      return { ...moment, storagePhotos: sources, photos: displayPhotos, photo: displayPhotos[0] || '' };
    });
  }

  window.HeartbeatCloud = {
    version: 'cloudbase-v39-memory-identity-comments',
    environmentId: ENV_ID,
    describeError,
    initialise,
    create(profile, seed) { return call('create', { profile, seed }); },
    join(inviteCode) { return call('join', { inviteCode }); },
    newInvite(session) { return call('newInvite', { session }); },
    pull(session) { return call('pull', { session }); },
    push(session, snapshot) { return call('push', { session, snapshot }); },
    deletePhotos(session, fileIDs) { return call('deletePhotos', { session, fileIDs }); },
    uploadPhoto,
    resolvePhotos
  };
})();
