/* weekView.js - 周视图（紧凑，适配手机屏幕，无左右滚动） */

const WeekView = {
  currentMonday: getMonday(new Date()),
  HOUR_START: 6,
  HOUR_END: 23,
  HOUR_PX: 32,  // 固定32px/小时

  init() { this.render(); },

  render() {
    this.renderNav();
    this.renderCompact();
  },

  renderNav() {
    const nav = document.getElementById('weekViewNav');
    const m = this.currentMonday;
    const sun = new Date(m); sun.setDate(sun.getDate() + 6);
    document.getElementById('weekViewTitle').textContent = `${m.getMonth()+1}.${m.getDate()} - ${sun.getMonth()+1}.${sun.getDate()}`;
    nav.innerHTML = `
      <button class="btn-icon small" id="btnPrevWeekV"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="btn-outline" id="btnTodayV" style="font-size:.72rem;padding:4px 10px;">今天</button>
      <button class="btn-icon small" id="btnNextWeekV"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevWeekV').onclick = () => { this.currentMonday.setDate(this.currentMonday.getDate()-7); this.render(); };
    document.getElementById('btnNextWeekV').onclick = () => { this.currentMonday.setDate(this.currentMonday.getDate()+7); this.render(); };
    document.getElementById('btnTodayV').onclick = () => { this.currentMonday = getMonday(new Date()); this.render(); };
  },

  renderCompact() {
    const container = document.getElementById('weekCompactScroll');
    const weekdays = ['周一','周二','周三','周四','周五','周六','周日'];
    const todayStr = getTodayStr();
    const totalH = (this.HOUR_END - this.HOUR_START) * this.HOUR_PX;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentMonday); d.setDate(d.getDate()+i);
      days.push(d);
    }

    const weekStart = `${days[0].getFullYear()}-${pad2(days[0].getMonth()+1)}-${pad2(days[0].getDate())}`;
    const weekEnd = `${days[6].getFullYear()}-${pad2(days[6].getMonth()+1)}-${pad2(days[6].getDate())}`;
    const weekPlans = Store.getPlans().filter(p => p.date >= weekStart && p.date <= weekEnd);

    let html = '<div class="wc-grid">';

    // 表头
    html += '<div class="wc-header"><div class="wc-corner"></div>';
    days.forEach(d => {
      const ds = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      const isT = ds === todayStr;
      html += `<div class="${isT?'wc-today':''}"><div class="wc-day">${weekdays[d.getDay()===0?6:d.getDay()-1]}</div><div class="wc-date">${d.getDate()}</div></div>`;
    });
    html += '</div>';

    // 主体
    html += '<div class="wc-body">';

    // 时间列
    html += `<div class="wc-time-col" style="height:${totalH}px;">`;
    for (let h = this.HOUR_START; h <= this.HOUR_END; h++) {
      const top = (h - this.HOUR_START) * this.HOUR_PX;
      html += `<span class="wc-tlabel ${h%2===0?'hour':''}" style="top:${top}px;">${h>9?'':'0'}${h}</span>`;
    }
    html += '</div>';

    // 每天列
    days.forEach(d => {
      const ds = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      const isT = ds === todayStr;
      const dayPlans = weekPlans.filter(p => p.date === ds);

      html += `<div class="wc-day-col" data-date="${ds}" style="height:${totalH}px;">`;

      // 网格线
      for (let h = this.HOUR_START; h <= this.HOUR_END; h++) {
        const top = (h - this.HOUR_START) * this.HOUR_PX;
        if (h > this.HOUR_START) {
          html += `<div class="wc-hline" style="top:${top}px;"></div>`;
        }
      }

      // 当前时间线
      if (isT) {
        const now = new Date();
        const nm = now.getHours()*60 + now.getMinutes();
        if (nm >= this.HOUR_START*60 && nm <= this.HOUR_END*60) {
          const nt = (nm - this.HOUR_START*60) * this.HOUR_PX / 60;
          html += `<div class="wc-now" style="top:${nt}px;"></div>`;
        }
      }

      // 时间块
      dayPlans.forEach(p => {
        const cat = Store.getCategory(p.categoryId);
        const sm = timeToMin(p.startTime);
        const em = timeToMin(p.endTime);
        if (em <= this.HOUR_START*60 || sm >= this.HOUR_END*60) return;
        const top = Math.max(0, (sm - this.HOUR_START*60)) * this.HOUR_PX / 60;
        const ht = Math.max(2, (Math.min(em, this.HOUR_END*60) - Math.max(sm, this.HOUR_START*60)) * this.HOUR_PX / 60);
        html += `<div class="wc-block ${p.completed?'completed':''}" style="top:${top}px;height:${ht}px;background:${cat.color};" data-pid="${p.id}" data-date="${ds}">
          <span class="wc-cat">${cat.name}</span>
        </div>`;
      });

      html += '</div>';
    });

    html += '</div></div>';
    container.innerHTML = html;

    // 点击事件 - 只读查看，跳转到该日计划
    container.querySelectorAll('.wc-block').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const p = Store.getPlans().find(pl => pl.id === el.dataset.pid);
        if (p) {
          const cat = Store.getCategory(p.categoryId);
          alert(`${cat.name}｜${p.title}\n${p.startTime} - ${p.endTime}${p.completed ? '\n✅ 已完成' : ''}`);
        }
      };
    });
  },

  refresh() { this.render(); },
};
