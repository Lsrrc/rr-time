/* stats.js - 时间统计（日/月/年视图） */

const Stats = {
  currentView: 'day',
  currentDate: new Date(),
  dayChart: null, monthChart: null, yearBar: null, yearPie: null,
  yearFilterCat: '',

  init() { this.render(); },

  bindToggle() {
    document.getElementById('statsExtraNav').innerHTML = '';
    document.querySelectorAll('.stats-toggle-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.stats-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentView = btn.dataset.view;
        this.currentDate = new Date();
        this.yearFilterCat = '';
        this.render();
      };
    });
  },

  render() {
    this.bindToggle();
    document.querySelectorAll('.stats-view').forEach(v => v.classList.remove('active'));
    const contentMap = { day:'statsDayContent', month:'statsMonthContent', year:'statsYearContent' };
    document.getElementById(contentMap[this.currentView]).classList.add('active');

    if (this.currentView === 'day') this.renderDay();
    else if (this.currentView === 'month') this.renderMonth();
    else this.renderYear();
  },

  /* ===== 日视图 ===== */
  renderDay() {
    const ds = `${this.currentDate.getFullYear()}-${pad2(this.currentDate.getMonth()+1)}-${pad2(this.currentDate.getDate())}`;
    const plans = Store.getPlans().filter(p => p.date === ds);
    const events = (Store.getTimelineEvents() || []).filter(e => e.date === ds);
    const completed = plans.filter(p => p.completed).length;

    document.getElementById('statsExtraNav').innerHTML = `
      <button class="btn-icon small" id="btnPrevSD"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label">${formatDateFriendly(ds)}</span>
      <button class="btn-icon small" id="btnNextSD"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevSD').onclick = () => { this.currentDate.setDate(this.currentDate.getDate()-1); this.renderDay(); };
    document.getElementById('btnNextSD').onclick = () => { this.currentDate.setDate(this.currentDate.getDate()+1); this.renderDay(); };

    this.renderCards([
      { icon:'check',bg:'#059669', value:`${completed}/${plans.length}`, label:'完成任务' },
      { icon:'fire',bg:'#f59e0b', value:this.getTopCategory(plans), label:'主要分类' },
    ]);

    // 日统计饼图 = 计划 + 时间轴事件
    const merged = [...plans, ...events];
    this.renderPie('dayPieChart', 'dayChart', merged, 'dayPieTitle');

    // 数据说明
    document.getElementById('statsNotice').innerHTML = '日统计含计划与时间轴事件；月/年仅统计计划';
  },

  /* ===== 月视图 ===== */
  renderMonth() {
    const y = this.currentDate.getFullYear(), m = this.currentDate.getMonth();
    const ms = `${y}-${pad2(m+1)}`;
    const plans = Store.getPlans().filter(p => p.date.startsWith(ms));

    // 月内周计划完成数
    const monthMonday = getMonday(new Date(y, m, 1));
    const weeklyPlans = Store.getWeeklyPlans();
    let weeklyCompleted = 0, weeklyTotal = 0;
    for (let w = 0; w < 5; w++) {
      const wm = new Date(monthMonday); wm.setDate(wm.getDate() + w*7);
      const ws = `${wm.getFullYear()}-${pad2(wm.getMonth()+1)}-${pad2(wm.getDate())}`;
      const wp = weeklyPlans.filter(wp => wp.weekStart === ws);
      weeklyTotal += wp.length;
      weeklyCompleted += wp.filter(wp => wp.completed).length;
    }

    document.getElementById('statsExtraNav').innerHTML = `
      <button class="btn-icon small" id="btnPrevSM"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label">${y}年${m+1}月</span>
      <button class="btn-icon small" id="btnNextSM"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevSM').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth()-1); this.renderMonth(); };
    document.getElementById('btnNextSM').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth()+1); this.renderMonth(); };

    const totalMin = plans.reduce((s,p) => s+durationMin(p.startTime,p.endTime), 0);

    this.renderCards([
      { icon:'check',bg:'#059669', value:`${weeklyCompleted}/${weeklyTotal}`, label:'完成周计划' },
      { icon:'clock',bg:'#10b981', value:formatDuration(totalMin), label:'月总时长' },
      { icon:'calendar',bg:'#3b82f6', value:new Set(plans.map(p=>p.date)).size, label:'活跃天数' },
      { icon:'fire',bg:'#f59e0b', value:this.getTopCategory(plans), label:'主要分类' },
    ]);

    this.renderPie('monthPieChart', 'monthChart', plans, 'monthPieTitle');
    document.getElementById('statsNotice').innerHTML = '月/年仅统计计划数据，不含时间轴事件';
  },

  /* ===== 年视图 ===== */
  renderYear() {
    const y = this.currentDate.getFullYear();
    const plans = Store.getPlans().filter(p => p.date.startsWith(y+'-'));

    document.getElementById('statsExtraNav').innerHTML = `
      <button class="btn-icon small" id="btnPrevSY"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label">${y}年</span>
      <button class="btn-icon small" id="btnNextSY"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevSY').onclick = () => { this.currentDate.setFullYear(this.currentDate.getFullYear()-1); this.renderYear(); };
    document.getElementById('btnNextSY').onclick = () => { this.currentDate.setFullYear(this.currentDate.getFullYear()+1); this.renderYear(); };

    // 分类筛选
    const catSel = document.getElementById('yearCatFilter');
    const cats = Store.getCategories();
    catSel.innerHTML = '<option value="">全部分类</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    catSel.value = this.yearFilterCat;
    catSel.onchange = () => { this.yearFilterCat = catSel.value; this.renderYear(); };

    // 筛选
    let filtered = plans;
    if (this.yearFilterCat) filtered = plans.filter(p => p.categoryId === this.yearFilterCat);

    const totalMin = plans.reduce((s,p) => s+durationMin(p.startTime,p.endTime), 0);
    const completed = plans.filter(p=>p.completed).length;

    // 按月统计（筛选的）
    const monthlyMin = new Array(12).fill(0);
    filtered.forEach(p => {
      const m = parseInt(p.date.split('-')[1])-1;
      monthlyMin[m] += durationMin(p.startTime, p.endTime);
    });

    this.renderCards([
      { icon:'clock',bg:'#10b981', value:formatDuration(totalMin), label:'年度总时长' },
      { icon:'check',bg:'#059669', value:`${completed}/${plans.length}`, label:'完成任务' },
      { icon:'chart',bg:'#3b82f6', value:this.getMostActiveMonth(monthlyMin), label:'最忙月份' },
      { icon:'fire',bg:'#f59e0b', value:this.getTopCategory(plans), label:'主要分类' },
    ]);

    // 柱状图
    if (this.yearBar) this.yearBar.destroy();
    const canvas = document.getElementById('yearBarChart');
    const label = this.yearFilterCat ? Store.getCategory(this.yearFilterCat).name : '全部';
    this.yearBar = new Chart(canvas, {
      type:'bar',
      data:{
        labels:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
        datasets:[{
          label:`${label}投入时长(h)`,
          data:monthlyMin.map(m=>+(m/60).toFixed(1)),
          backgroundColor:this.yearFilterCat ? Store.getCategory(this.yearFilterCat).color : '#10b981',
          borderRadius:6,borderSkipped:false,
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{backgroundColor:'#064e3b',cornerRadius:8,bodyFont:{size:12},callbacks:{label:ctx=>ctx.parsed.y+' 小时'}} },
        scales:{ x:{grid:{display:false},ticks:{color:'#6b7280',font:{size:10}}}, y:{beginAtZero:true,grid:{color:'#e5e7eb'},ticks:{color:'#6b7280',font:{size:10},callback:v=>v+'h'}} }
      }
    });

    // 饼图（全年占比）
    if (this.yearPie) this.yearPie.destroy();
    const catMin = {};
    plans.forEach(p => {
      const c = Store.getCategory(p.categoryId);
      catMin[c.name] = (catMin[c.name]||0) + durationMin(p.startTime,p.endTime);
    });
    const labels = Object.keys(catMin), data = Object.values(catMin).map(m=>+(m/60).toFixed(1));
    const colors = labels.map(n => { const c = cats.find(c=>c.name===n); return c?c.color:'#6b7280'; });

    this.yearPie = new Chart(document.getElementById('yearPieChart'), {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderColor:'#fff', borderWidth:2 }] },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#064e3b',font:{size:11,weight:'600'},padding:8,usePointStyle:true,pointStyle:'circle' } },
          tooltip:{ backgroundColor:'#064e3b',cornerRadius:8,bodyFont:{size:12},
            callbacks:{ label:ctx=>{ const t=data.reduce((a,b)=>a+b,0); return `${ctx.label}: ${ctx.parsed}h (${t>0?((ctx.parsed/t)*100).toFixed(1):0}%)`; } }
          }
        }
      }
    });
    document.getElementById('statsNotice').innerHTML = '月/年仅统计计划数据，不含时间轴事件';
  },

  /* ===== 工具 ===== */
  renderPie(canvasId, chartKey, plans, titleId) {
    if (this[chartKey]) this[chartKey].destroy();
    const catMin = {};
    plans.forEach(p => {
      const c = Store.getCategory(p.categoryId);
      catMin[c.name] = (catMin[c.name]||0) + durationMin(p.startTime,p.endTime);
    });
    const cats = Store.getCategories();
    const labels = Object.keys(catMin), data = Object.values(catMin).map(m=>+(m/60).toFixed(1));
    const colors = labels.map(n => { const c = cats.find(c=>c.name===n); return c?c.color:'#6b7280'; });

    const titleEl = document.getElementById(titleId);
    if (data.length === 0) {
      if (titleEl) titleEl.textContent = '分类时间占比（暂无数据）';
      return;
    }
    if (titleEl) titleEl.textContent = '分类时间占比';

    this[chartKey] = new Chart(document.getElementById(canvasId), {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderColor:'#fff', borderWidth:2 }] },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#064e3b',font:{size:11,weight:'600'},padding:8,usePointStyle:true,pointStyle:'circle' } },
          tooltip:{ backgroundColor:'#064e3b',cornerRadius:8,bodyFont:{size:12},
            callbacks:{ label:ctx=>{ const t=data.reduce((a,b)=>a+b,0); return `${ctx.label}: ${ctx.parsed}h (${t>0?((ctx.parsed/t)*100).toFixed(1):0}%)`; } }
          }
        }
      }
    });
  },

  renderCards(cards) {
    const icons = {
      clock:'<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="2"/><path d="M9 5v4l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      check:'<svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 9l3 3 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      calendar:'<svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="4" width="12" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 7h12" stroke="currentColor" stroke-width="2"/></svg>',
      fire:'<svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 2s3 2.5 3 6a3 3 0 11-6 0c0-1.5 1-3 1-3s0 2 1.5 2c0-1.5-.5-2.5.5-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      chart:'<svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 14V8M9 14V4M14 14v-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    };
    document.getElementById('statsCards').innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="sc-icon-wrap" style="background:${c.bg}">${icons[c.icon]||icons.chart}</div>
        <div class="sc-value">${c.value}</div>
        <div class="sc-label">${c.label}</div>
      </div>`).join('');
  },

  getTopCategory(plans) {
    if (plans.length===0) return '-';
    const cm={}; plans.forEach(p=>{const c=Store.getCategory(p.categoryId);cm[c.name]=(cm[c.name]||0)+durationMin(p.startTime,p.endTime);});
    return Object.entries(cm).sort((a,b)=>b[1]-a[1])[0][0];
  },
  getMostActiveMonth(mm) { const mx=Math.max(...mm); return mx===0?'-':`${mm.indexOf(mx)+1}月`; },
  refresh() { this.render(); },
};
