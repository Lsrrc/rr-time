/* weeklyPlans.js - 每周计划制定 */

const WeeklyPlans = {
  currentMonday: getMonday(new Date()),

  init() { this.render(); },

  render() {
    this.renderNav();
    this.renderList();
  },

  renderNav() {
    const nav = document.getElementById('weeklyPlanNav');
    const m = this.currentMonday;
    const sun = new Date(m); sun.setDate(sun.getDate() + 6);
    nav.innerHTML = `
      <button class="btn-icon small" id="btnPrevWeekP"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label">${m.getMonth()+1}.${pad2(m.getDate())} - ${sun.getMonth()+1}.${pad2(sun.getDate())}</span>
      <button class="btn-icon small" id="btnNextWeekP"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevWeekP').onclick = () => { this.shift(-7); };
    document.getElementById('btnNextWeekP').onclick = () => { this.shift(7); };
  },

  shift(d) { const n = new Date(this.currentMonday); n.setDate(n.getDate()+d); this.currentMonday = n; this.render(); },

  renderList() {
    const ws = getMondayStr(this.currentMonday);
    // 当前周自动延续上周未完成的计划
    const todayWeekStart = getMondayStr(new Date());
    if (ws === todayWeekStart) {
      Store.carryOverWeeklyPlans(ws);
    }
    const list = Store.getWeeklyPlans().filter(w => w.weekStart === ws);
    const container = document.getElementById('weeklyPlanList');

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>本周暂无计划</p></div>`;
    } else {
      container.innerHTML = list.map(w => {
        const cat = Store.getCategory(w.categoryId);
        const target = w.target || 1;
        const progress = typeof w.progress === 'number' ? w.progress : 0;
        const pct = Math.round(progress / target * 100);
        const isMulti = target > 1;
        return `
          <div class="weekly-card ${w.completed?'completed':''}" data-id="${w.id}" style="border-left:4px solid ${cat.color};">
            <div class="wl-check ${w.completed?'checked':''}" data-toggle="${w.id}">
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            ${isMulti ? `<button class="wl-plus-btn" data-plus="${w.id}" title="+1"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>` : ''}
            <div class="wl-info">
              <div class="wl-title">${escapeHtml(w.title)}</div>
              <div class="wl-meta">
                <span class="wl-tag" style="background:${cat.color}1a;color:${cat.color}">${cat.name}</span>
                ${w.carriedOver ? `<span class="wl-tag" style="background:#fef3c7;color:#b45309">上周延续</span>` : ''}
                ${isMulti ? `<span class="wl-progress-text">${progress}/${target}</span>` : ''}
                ${w.note ? `<span style="font-size:.68rem;color:var(--muted)">${escapeHtml(w.note.slice(0,20))}${w.note.length>20?'...':''}</span>` : ''}
              </div>
              ${isMulti ? `<div class="wl-progress-bar"><div class="wl-progress-fill" style="width:${pct}%;background:${cat.color}"></div></div>` : ''}
            </div>
            <div class="wl-actions">
              <button class="btn-icon small" data-edit="${w.id}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
              <button class="btn-icon small" data-del="${w.id}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 3.5h7M4.5 3.5V2h3v1.5M4 3.5v6h4v-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>
          </div>`;
      }).join('');
    }

    // 绑定事件
    container.querySelectorAll('[data-toggle]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); Store.toggleWeekly(el.dataset.toggle); this.render(); };
    });
    container.querySelectorAll('[data-plus]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); Store.incrementWeekly(el.dataset.plus); this.render(); };
    });
    container.querySelectorAll('[data-edit]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); App.openWeeklyPlanModal(el.dataset.edit); };
    });
    container.querySelectorAll('[data-del]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation();
        if (confirm('删除此周计划？')) { Store.deleteWeekly(el.dataset.del); this.render(); Toast.show('已删除'); }
      };
    });
    container.querySelectorAll('.weekly-card').forEach(el => {
      el.onclick = () => App.openWeeklyPlanModal(el.dataset.id);
    });
  },

  refresh() { this.render(); },
};
