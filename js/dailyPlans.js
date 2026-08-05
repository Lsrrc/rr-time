/* dailyPlans.js - 每日计划制定 */

const DailyPlans = {
  currentDate: getTodayStr(),
  filterCat: '',

  init() { this.render(); },

  render() {
    this.renderNav();
    this.renderCategories();
    this.renderList();
  },

  renderNav() {
    const nav = document.getElementById('dailyPlanNav');
    const today = getTodayStr();
    nav.innerHTML = `
      <button class="btn-icon small" id="btnPrevDay"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label" style="cursor:pointer" id="dailyDateLabel">${formatDateFriendly(this.currentDate)}</span>
      <button class="btn-icon small" id="btnNextDay"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevDay').onclick = () => this.shift(-1);
    document.getElementById('btnNextDay').onclick = () => this.shift(1);
    document.getElementById('dailyDateLabel').onclick = () => {
      const d = new Date(this.currentDate);
      App.openDayPicker(d, (nd) => { this.currentDate = `${nd.getFullYear()}-${pad2(nd.getMonth()+1)}-${pad2(nd.getDate())}`; this.render(); });
    };
  },

  shift(d) {
    const dt = new Date(this.currentDate); dt.setDate(dt.getDate()+d);
    this.currentDate = `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
    this.render();
  },

  renderCategories() {
    const bar = document.getElementById('dailyCatBar');
    const cats = Store.getCategories();
    bar.innerHTML = `
      <div class="cat-chips-row">
        ${cats.map(c => `
          <span class="cat-chip ${this.filterCat===c.id?'active':''}" style="background:${c.color}1a;color:${c.color};border-color:${c.color}22;" data-cid="${c.id}">
            <span class="dot" style="background:${c.color}"></span>${c.name}
            <span class="cat-del" data-cdel="${c.id}" title="删除分类">
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
          </span>
        `).join('')}
        <button class="btn-icon small" id="btnAddCatD" title="添加分类"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>`;
    bar.querySelectorAll('.cat-chip').forEach(el => {
      el.onclick = (e) => {
        // 如果点击的是删除按钮则不触发过滤
        if (e.target.closest('.cat-del')) return;
        this.filterCat = this.filterCat === el.dataset.cid ? '' : el.dataset.cid;
        this.render();
      };
    });
    bar.querySelectorAll('.cat-del').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        deleteCategory(el.dataset.cdel);
      };
    });
    document.getElementById('btnAddCatD').onclick = () => App.openCategoryModal();
  },

  renderList() {
    let plans = Store.getPlans().filter(p => p.date === this.currentDate);
    if (this.filterCat) plans = plans.filter(p => p.categoryId === this.filterCat);
    plans.sort((a,b) => timeToMin(a.startTime)-timeToMin(b.startTime));
    const container = document.getElementById('dailyPlanList');
    const priorityLabels = { high:'高',medium:'中',low:'低' };

    if (plans.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>这天暂无计划</p></div>`;
    } else {
      container.innerHTML = plans.map(p => {
        const cat = Store.getCategory(p.categoryId);
        const dur = formatDuration(durationMin(p.startTime,p.endTime));
        return `<div class="daily-card ${p.completed?'completed':''}" data-id="${p.id}" style="border-left-color:${cat.color}">
          <div class="dl-check ${p.completed?'checked':''}" data-toggle="${p.id}"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div class="dl-info">
            <div class="dl-title">${escapeHtml(p.title)}</div>
            <div class="dl-meta">
              <span class="dl-tag" style="background:${cat.color}1a;color:${cat.color}">${cat.name}</span>
              <span class="dl-time"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>${p.startTime}-${p.endTime} · ${dur}</span>
              <span class="dl-priority pri-${p.priority}">${priorityLabels[p.priority]}</span>
            </div>
          </div>
          <div class="dl-actions">
            <button class="btn-icon small" data-edit="${p.id}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
            <button class="btn-icon small" data-del="${p.id}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 3.5h7M4.5 3.5V2h3v1.5M4 3.5v6h4v-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
        </div>`;
      }).join('');
    }

    container.querySelectorAll('[data-toggle]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); Store.togglePlan(el.dataset.toggle); this.render(); };
    });
    container.querySelectorAll('[data-edit]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); App.openPlanModal(el.dataset.edit); };
    });
    container.querySelectorAll('[data-del]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); if(confirm('删除此计划？')){Store.deletePlan(el.dataset.del);this.render();Toast.show('已删除');} };
    });
    container.querySelectorAll('.daily-card').forEach(el => {
      el.onclick = () => App.openPlanModal(el.dataset.id);
    });
  },

  refresh() { this.render(); },
};
