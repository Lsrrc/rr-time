/* app.js - 主应用入口：底部导航 + 弹窗 + 初始化 */

const App = {
  currentTab: 'weekly-plans',
  selectedColor: '#10b981',

  init() {
    this.setHeaderDate();
    this.bindBottomNav();
    this.bindModals();
    this.initColorPicker();
    this.bindFab();

    WeeklyPlans.init();
    DailyPlans.init();
    Timeline.init();
    WeekView.init();
    Stats.init();

    // 默认显示周计划
    this.switchTab('weekly-plans');
  },

  setHeaderDate() {
    const now = new Date();
    const wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    document.getElementById('headerDate').textContent =
      `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${wd[now.getDay()]}`;
  },

  bindBottomNav() {
    document.querySelectorAll('.bn-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  },

  switchTab(name) {
    this.currentTab = name;
    document.querySelectorAll('.bn-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-section').forEach(s => {
      s.classList.toggle('active', s.id === 'tab-' + name);
    });
    // 移除旧 FAB
    document.querySelectorAll('.add-fab').forEach(f => f.remove());
    // 添加模块对应的 FAB
    if (name === 'weekly-plans') this.addFab('新建周计划', () => this.openWeeklyPlanModal());
    if (name === 'daily-plans') this.addFab('新建日计划', () => this.openPlanModal());
    if (name === 'timeline') this.addFab('新建时间记录', () => this.openTimelineEventModal(null, Timeline.currentDate));
    // 刷新模块
    if (name === 'weekly-plans') WeeklyPlans.refresh();
    if (name === 'daily-plans') DailyPlans.refresh();
    if (name === 'timeline') Timeline.refresh();
    if (name === 'week-view') WeekView.refresh();
    if (name === 'stats') Stats.refresh();
  },

  addFab(label, fn) {
    if (label) {
      const fab = document.createElement('button');
      fab.className = 'add-fab'; fab.textContent = '+';
      fab.title = label;
      fab.onclick = fn;
      document.querySelector('.app-container').appendChild(fab);
    }
  },

  bindModals() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', (e) => { if (e.target === ov) this.closeModal(ov.id); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
    });
  },

  /* ===== 周计划弹窗 ===== */
  openWeeklyPlanModal(wId) {
    const m = document.getElementById('weeklyPlanModal');
    const f = document.getElementById('weeklyPlanForm');
    f.reset();
    const sel = document.getElementById('weeklyPlanCategory');
    sel.innerHTML = Store.getCategories().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (wId) {
      const w = Store.getWeeklyPlans().find(x => x.id === wId);
      if (w) {
        document.getElementById('weeklyModalTitle').textContent = '编辑周计划';
        document.getElementById('weeklyPlanId').value = w.id;
        document.getElementById('weeklyPlanTitle').value = w.title;
        document.getElementById('weeklyPlanCategory').value = w.categoryId;
        document.getElementById('weeklyPlanTarget').value = w.target || 1;
        document.getElementById('weeklyPlanNote').value = w.note || '';
      }
    } else {
      document.getElementById('weeklyModalTitle').textContent = '新建周计划';
      document.getElementById('weeklyPlanId').value = '';
      document.getElementById('weeklyPlanTarget').value = '1';
    }
    m.classList.add('active');
    setTimeout(() => document.getElementById('weeklyPlanTitle').focus(), 100);
  },

  /* ===== 日计划弹窗 ===== */
  openPlanModal(planId) {
    this._openPlanModalBase(planId, null, null);
  },

  openPlanModalFromTimeline(date, startTime, endTime) {
    this._openPlanModalBase(null, startTime, endTime);
    document.getElementById('planDate').value = date || getTodayStr();
  },

  /* ===== 时间轴事件弹窗（与计划独立） ===== */
  openTimelineEventModal(eventId, date, startTime, endTime) {
    const m = document.getElementById('planModal');
    const f = document.getElementById('planForm');
    f.reset();
    document.getElementById('planMode').value = 'event';
    const sel = document.getElementById('planCategory');
    sel.innerHTML = Store.getCategories().map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    // 隐藏优先级（事件无优先级）
    const priWrap = document.getElementById('planPriority').closest('.form-group');
    if (priWrap) priWrap.style.display = 'none';
    // 改标题文字
    document.getElementById('planModalTitle').textContent = eventId ? '编辑时间记录' : '新建时间记录';
    // 编辑已有事件时显示删除按钮，新建时隐藏
    const delBtn = document.getElementById('btnDeleteEvent');
    if (delBtn) delBtn.style.display = eventId ? 'block' : 'none';

    if (eventId) {
      const ev = Store.getTimelineEvents().find(x => x.id === eventId);
      if (ev) {
        document.getElementById('planId').value = ev.id;
        document.getElementById('planTitle').value = ev.title;
        document.getElementById('planCategory').value = ev.categoryId;
        document.getElementById('planDate').value = ev.date;
        document.getElementById('planStart').value = ev.startTime;
        document.getElementById('planEnd').value = ev.endTime;
        document.getElementById('planNote').value = ev.note || '';
      }
    } else {
      document.getElementById('planId').value = '';
      document.getElementById('planDate').value = date || Timeline.currentDate || getTodayStr();
      document.getElementById('planStart').value = startTime || '09:00';
      document.getElementById('planEnd').value = endTime || '10:00';
    }
    m.classList.add('active');
    setTimeout(() => document.getElementById('planTitle').focus(), 100);
  },

  _openPlanModalBase(planId, defStart, defEnd) {
    const m = document.getElementById('planModal');
    const f = document.getElementById('planForm');
    f.reset();
    document.getElementById('planMode').value = 'plan';
    // 计划模式隐藏删除按钮
    const delBtnPlan = document.getElementById('btnDeleteEvent');
    if (delBtnPlan) delBtnPlan.style.display = 'none';
    // 显示优先级（计划有优先级）
    const priWrap = document.getElementById('planPriority').closest('.form-group');
    if (priWrap) priWrap.style.display = '';
    const sel = document.getElementById('planCategory');
    sel.innerHTML = Store.getCategories().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // 推断当前上下文日期
    const ctxDate = this.currentTab === 'daily-plans' ? DailyPlans.currentDate
      : this.currentTab === 'timeline' ? Timeline.currentDate
      : (DefDailyDate || getTodayStr());

    if (planId) {
      const p = Store.getPlans().find(x => x.id === planId);
      if (p) {
        document.getElementById('planModalTitle').textContent = '编辑计划';
        document.getElementById('planId').value = p.id;
        document.getElementById('planTitle').value = p.title;
        document.getElementById('planCategory').value = p.categoryId;
        document.getElementById('planDate').value = p.date;
        document.getElementById('planStart').value = p.startTime;
        document.getElementById('planEnd').value = p.endTime;
        document.getElementById('planPriority').value = p.priority;
        document.getElementById('planNote').value = p.note || '';
      }
    } else {
      document.getElementById('planModalTitle').textContent = '新建计划';
      document.getElementById('planId').value = '';
      document.getElementById('planDate').value = ctxDate;
      document.getElementById('planStart').value = defStart || '09:00';
      document.getElementById('planEnd').value = defEnd || '10:00';
    }
    m.classList.add('active');
    setTimeout(() => document.getElementById('planTitle').focus(), 100);
  },

  /* ===== 分类弹窗 ===== */
  openCategoryModal(catId) {
    const m = document.getElementById('categoryModal');
    document.getElementById('categoryForm').reset();
    if (catId) {
      const c = Store.getCategories().find(x => x.id === catId);
      if (c) {
        document.getElementById('categoryModalTitle').textContent = '编辑分类';
        document.getElementById('categoryId').value = c.id;
        document.getElementById('categoryName').value = c.name;
        this.selectColor(c.color);
      }
    } else {
      document.getElementById('categoryModalTitle').textContent = '新增分类';
      document.getElementById('categoryId').value = '';
      this.selectColor(Store.COLORS[0]);
    }
    m.classList.add('active');
    setTimeout(() => document.getElementById('categoryName').focus(), 100);
  },

  /* ===== 日期选择弹窗 ===== */
  openDayPicker(defaultDate, onSelect) {
    const d = defaultDate || new Date();
    const m = document.createElement('div');
    m.className = 'modal-overlay active'; m.id = 'dayPickerModal';
    m.innerHTML = `<div class="modal modal-sm">
      <div class="modal-header"><h3>选择日期</h3><button class="btn-icon modal-close" data-close="dayPickerModal"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>
      <div class="modal-body">
        <input type="date" id="dayPickerInput" value="${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}" style="width:100%;padding:12px;border:1.5px solid var(--border2);border-radius:var(--r);font-size:1rem;font-family:inherit;">
      </div>
      <div class="modal-footer" style="padding:0 20px 20px"><button class="btn-primary" id="dayPickerConfirm">确认</button></div>
    </div>`;
    document.body.appendChild(m);

    m.querySelector('[data-close]').onclick = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
    document.getElementById('dayPickerConfirm').onclick = () => {
      const v = document.getElementById('dayPickerInput').value;
      if (v && onSelect) onSelect(new Date(v));
      m.remove();
    };
  },

  /* ===== 弹窗关闭 ===== */
  closeModal(id) { document.getElementById(id)?.classList.remove('active'); },

  /* ===== 颜色选择器 ===== */
  initColorPicker() {
    const p = document.getElementById('colorPicker');
    p.innerHTML = Store.COLORS.map((c, i) => `<div class="color-option ${i===0?'selected':''}" data-color="${c}" style="background:${c};color:${c}"></div>`).join('');
    p.querySelectorAll('.color-option').forEach(o => o.onclick = () => this.selectColor(o.dataset.color));
  },
  selectColor(c) {
    this.selectedColor = c;
    document.querySelectorAll('.color-option').forEach(o => o.classList.toggle('selected', o.dataset.color === c));
  },
};

/* ===== Toast ===== */
const Toast = {
  show(msg) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 300); }, 1800);
  },
};

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', () => {
  try { App.init(); } catch(e) {
    console.error('App init error:', e);
    // 即使初始化失败，也保证导航和弹窗关闭能用
    try { App.bindBottomNav(); } catch(e2) {}
    try { App.bindModals(); } catch(e2) {}
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    var firstTab = document.querySelector('.tab-section');
    if (firstTab) firstTab.classList.add('active');
  }
});

// 全局当前日计划日期
var DefDailyDate = getTodayStr();
