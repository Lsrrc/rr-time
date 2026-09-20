/* cloudSync.js - CloudBase 云端同步（单用户，全量覆盖 + 时间戳冲突策略）
 *
 * 策略：
 *  - 本地每次保存（Store.save）自动防抖推送到云端
 *  - 启动时 / 页面回到前台时 / 每 60 秒拉取云端，云端较新则覆盖本地
 *  - 冲突以 updatedAt 时间戳为准（last-write-wins）
 */

const CloudSync = {
  ENV: 'rr-time-d0ge89n9w0fc8951b',
  REGION: 'ap-shanghai',          // 若环境创建在广州，请改为 ap-guangzhou
  ACCESS_KEY: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE1NWIyODYyLTYzMTQtNDBjNy1hMDY1LTA0OGM1NzMxZGE2ZiJ9.eyJpc3MiOiJodHRwczovL3JyLXRpbWUtZDBnZTg5bjl3MGZjODk1MWIuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InJyLXRpbWUtZDBnZTg5bjl3MGZjODk1MWIiLCJleHAiOjQwOTM1ODg0ODksImlhdCI6MTc4OTkwNTI4OSwibm9uY2UiOiJQVFpydTYwNVFYV2dqUlJJQnRWZl9BIiwiYXRfaGFzaCI6IlBUWnJ1NjA1UVhXZ2pSUklCdFZmX0EiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoicnItdGltZS1kMGdlODluOXcwZmM4OTUxYiIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.HSqHLQRv0Da9tXAH-17KvCKmfay91K9cU8Shxu3DSwlG_kfA1GKG4ZBi9AkB41mpIcdLdUORYiYSXLmfT0cruxOJwPHUAetqXkMm2_TxpBPCZ4anZFtAArBOiBu5RYSp1Ot_hJKnkkh2by40yYcI-Fguf5KmyFZDbwXim-yiWM6Q5HfZ2j-rJuMCph1Nz2ruhVQTSXmtGtN60cog9BuQlrSJoa6x458f_i7F9vOSWKsbBTqFKZbsWix-gzOgk9X-V88XrnbkDk07qcX5kfszjKQ_1FTsx4z01vWxupjVu9yDE66bXZY_sr_TiGfzXGZXzGoRLB1RIOM6_YgN5z6_OA',  // Publishable Key
  COLL: 'app_data',               // 集合名
  DOC: 'rr_time_master',          // 文档 ID
  PUSH_DEBOUNCE: 2500,            // 推送防抖毫秒
  PULL_GAP: 30000,                // 两次拉取最小间隔

  _db: null,
  _ready: false,
  _pulling: false,
  _pushing: false,
  _pushTimer: null,
  _lastPull: 0,
  _saveStyle: 0,                  // 0=未知 1=set直传 2=set({data}) 3=add指定_id
  status: 'off',                  // off | init | online | sync | error

  init() {
    if (typeof cloudbase === 'undefined') { this._setStatus('off'); return; }
    if (!this.ACCESS_KEY) { this._setStatus('off'); return; }
    this._setStatus('init');
    this._boot();
  },

  async _boot() {
    try {
      const app = cloudbase.init({
        env: this.ENV,
        region: this.REGION,
        accessKey: this.ACCESS_KEY,
      });
      const auth = app.auth;
      try { await auth.signInAnonymously(); } catch (e) { /* 可能已有会话，忽略 */ }
      this._db = app.database();
      this._ready = true;
      this._setStatus('online');
      await this.pull(true);

      // 回到前台时拉取远端更新
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.pull(false);
      });
      // 每 60 秒拉取（仅页面可见时）
      setInterval(() => { if (!document.hidden) this.pull(false); }, 60000);
    } catch (e) {
      console.warn('[CloudSync] init failed', e);
      this._setStatus('error');
    }
  },

  /* ===== 拉取云端 → 本地 ===== */
  async pull(force) {
    if (!this._ready || this._pulling) return;
    if (!force && Date.now() - this._lastPull < this.PULL_GAP) return;
    this._pulling = true;
    this._setStatus('sync');
    try {
      const res = await this._db.collection(this.COLL).doc(this.DOC).get();
      this._lastPull = Date.now();
      let doc = null;
      if (res && res.data) doc = Array.isArray(res.data) ? res.data[0] : res.data;

      const local = Store.load();
      const localTs = local._updatedAt || 0;

      if (doc && doc.updatedAt && doc.payload) {
        if (doc.updatedAt > localTs) {
          // 云端较新 → 覆盖本地后刷新
          const cloudData = doc.payload;
          delete cloudData._id;
          cloudData._updatedAt = doc.updatedAt;
          localStorage.setItem(Store.KEY, JSON.stringify(cloudData));
          if (typeof Toast !== 'undefined') Toast.show('已同步云端最新数据');
          setTimeout(() => location.reload(), 600);
          return;
        } else if (doc.updatedAt < localTs) {
          // 本地较新 → 推送上去
          this.schedulePush(0);
        }
      } else {
        // 云端还没有数据 → 首次上传本地
        this.schedulePush(0);
      }
      this._setStatus('online');
    } catch (e) {
      console.warn('[CloudSync] pull failed', e);
      this._setStatus('error');
    } finally {
      this._pulling = false;
    }
  },

  /* ===== 本地变更 → 防抖推送 ===== */
  schedulePush(delay) {
    if (!this._ready) return;
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(), delay === undefined ? this.PUSH_DEBOUNCE : delay);
  },

  async push() {
    if (!this._ready || this._pushing) return;
    this._pushing = true;
    this._setStatus('sync');
    try {
      const d = Store.load();
      const ts = Date.now();
      d._updatedAt = ts;
      localStorage.setItem(Store.KEY, JSON.stringify(d));
      const payload = { updatedAt: ts, device: this._deviceName(), payload: d };
      const ok = await this._saveDoc(payload);
      if (ok) { this._lastPull = Date.now(); this._setStatus('online'); }
      else this._setStatus('error');
    } catch (e) {
      console.warn('[CloudSync] push failed', e);
      this._setStatus('error');
    } finally {
      this._pushing = false;
    }
  },

  /* 写入文档：兼容不同 SDK 版本的 set 签名，首次成功后记住风格 */
  async _saveDoc(payload) {
    const ref = this._db.collection(this.COLL).doc(this.DOC);
    const attempts = this._saveStyle === 1 ? [1] : this._saveStyle === 2 ? [2] : this._saveStyle === 3 ? [3] : [1, 2, 3];
    for (const style of attempts) {
      try {
        let res;
        if (style === 1) res = await ref.set(payload);
        else if (style === 2) res = await ref.set({ data: payload });
        else res = await this._db.collection(this.COLL).add(Object.assign({ _id: this.DOC }, payload));
        if (res && res.code) continue;
        if (this._saveStyle === 0) {
          // 首次写入：读回校验确认风格有效
          const check = await ref.get();
          let got = check && check.data ? (Array.isArray(check.data) ? check.data[0] : check.data) : null;
          if (got && got.updatedAt === payload.updatedAt) { this._saveStyle = style; return true; }
          continue;
        }
        return true;
      } catch (e) { /* 尝试下一种风格 */ }
    }
    return false;
  },

  _deviceName() {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      const ua = navigator.userAgent;
      const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Macintosh/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : 'Web';
      return os + (standalone ? '·PWA' : '');
    } catch (e) { return ''; }
  },

  _setStatus(s) { this.status = s; this.updateUI(); },

  updateUI() {
    const el = document.getElementById('cloudSyncStatus');
    if (!el) return;
    const map = {
      off:   ['云端同步未开启（等待配置）', '#9ca3af'],
      init:  ['云端连接中…', '#f59e0b'],
      online:['云端同步已开启，自动进行', '#10b981'],
      sync:  ['正在同步…', '#3b82f6'],
      error: ['同步异常，本地数据不受影响', '#ef4444'],
    };
    const m = map[this.status] || map.off;
    el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + m[1] + ';margin-right:6px"></span><span style="color:' + m[1] + '">' + m[0] + '</span>';
  },
};

document.addEventListener('DOMContentLoaded', () => { try { CloudSync.init(); } catch (e) {} });
