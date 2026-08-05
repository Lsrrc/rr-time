/* data.js - 数据管理层 + 工具函数 */

const Store = {
  KEY: 'rr_time_master',
  COLORS: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#6b7280'],

  DEFAULT_CATEGORIES: [
    { id: 'cat_work',     name: '工作', color: '#10b981' },
    { id: 'cat_study',    name: '学习', color: '#3b82f6' },
    { id: 'cat_life',     name: '生活', color: '#f59e0b' },
    { id: 'cat_exercise', name: '运动', color: '#8b5cf6' },
  ],

  DEFAULT_PLANS: (() => {
    const t = getTodayStr();
    const y = getOffsetDateStr(-1);
    const tm = getOffsetDateStr(1);
    return [
      { id:'p1', title:'团队晨会', categoryId:'cat_work', date:t, startTime:'09:00', endTime:'09:30', priority:'medium', completed:true, note:'' },
      { id:'p2', title:'编写需求文档', categoryId:'cat_work', date:t, startTime:'09:30', endTime:'11:30', priority:'high', completed:false, note:'' },
      { id:'p3', title:'午休', categoryId:'cat_life', date:t, startTime:'12:00', endTime:'13:00', priority:'low', completed:true, note:'' },
      { id:'p4', title:'阅读《深度工作》', categoryId:'cat_study', date:t, startTime:'14:00', endTime:'15:00', priority:'medium', completed:false, note:'' },
      { id:'p5', title:'跑步30分钟', categoryId:'cat_exercise', date:t, startTime:'18:00', endTime:'18:30', priority:'medium', completed:false, note:'' },
      { id:'p6', title:'项目评审', categoryId:'cat_work', date:y, startTime:'10:00', endTime:'11:30', priority:'high', completed:true, note:'' },
      { id:'p7', title:'学习React', categoryId:'cat_study', date:y, startTime:'15:00', endTime:'16:30', priority:'medium', completed:true, note:'' },
      { id:'p8', title:'客户演示', categoryId:'cat_work', date:tm, startTime:'09:00', endTime:'12:00', priority:'high', completed:false, note:'' },
      { id:'p9', title:'瑜伽课', categoryId:'cat_exercise', date:tm, startTime:'19:00', endTime:'20:00', priority:'low', completed:false, note:'' },
    ];
  })(),

  DEFAULT_WEEKLY: (() => {
    const m = getMondayStr(new Date());
    return [
      { id:'w1', title:'完成V1.0功能开发', categoryId:'cat_work', weekStart:m, completed:false, note:'包含需求文档+开发', target:1, progress:0 },
      { id:'w2', title:'每周阅读一本书', categoryId:'cat_study', weekStart:m, completed:false, note:'', target:1, progress:0 },
      { id:'w3', title:'健身3次', categoryId:'cat_exercise', weekStart:m, completed:false, note:'', target:3, progress:0 },
    ];
  })(),

  // 时间轴专属事件（与每日计划独立，不互相同步）
  DEFAULT_TIMELINE_EVENTS: [],

  load() {
    const raw = localStorage.getItem(this.KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        // 确保所有必需字段存在
        if (!d.categories) d.categories = [...this.DEFAULT_CATEGORIES];
        if (!d.plans) d.plans = [];
        if (!d.weeklyPlans) d.weeklyPlans = [];
        if (!d.timelineEvents) d.timelineEvents = [];
        return d;
      } catch(e) {}
    }
    return { categories:[...this.DEFAULT_CATEGORIES], plans:[...this.DEFAULT_PLANS], weeklyPlans:[...this.DEFAULT_WEEKLY], timelineEvents:[...this.DEFAULT_TIMELINE_EVENTS] };
  },

  save(d) { localStorage.setItem(this.KEY, JSON.stringify(d)); },

  getCategories() {
    const cats = this.load().categories;
    // 确保至少有一个默认分类
    if (!cats || cats.length === 0) {
      const d = this.load();
      d.categories = [...this.DEFAULT_CATEGORIES];
      this.save(d);
      return d.categories;
    }
    return cats;
  },
  getPlans() { return this.load().plans; },
  getWeeklyPlans() { return this.load().weeklyPlans || []; },

  getCategory(id) { return this.getCategories().find(c=>c.id===id)||{name:'未分类',color:'#6b7280'}; },

  addCategory(name, color) {
    const d=this.load(); const c={id:'cat_'+Date.now(),name,color}; d.categories.push(c); this.save(d); return c;
  },
  updateCategory(id, name, color) {
    const d=this.load(); const c=d.categories.find(c=>c.id===id); if(c){c.name=name;c.color=color;this.save(d);}
  },
  deleteCategory(id) {
    const d=this.load(); d.categories=d.categories.filter(c=>c.id!==id);
    d.plans.forEach(p=>{if(p.categoryId===id)p.categoryId=null;});
    d.weeklyPlans.forEach(w=>{if(w.categoryId===id)w.categoryId=null;});
    (d.timelineEvents||[]).forEach(e=>{if(e.categoryId===id)e.categoryId=null;});
    this.save(d);
  },

  addPlan(plan) { const d=this.load(); plan.id='plan_'+Date.now(); d.plans.push(plan); this.save(d); return plan; },
  updatePlan(id, up) { const d=this.load(); const p=d.plans.find(p=>p.id===id); if(p){Object.assign(p,up);this.save(d);} return p; },
  deletePlan(id) { const d=this.load(); d.plans=d.plans.filter(p=>p.id!==id); this.save(d); },
  togglePlan(id) { const d=this.load(); const p=d.plans.find(p=>p.id===id); if(p){p.completed=!p.completed;this.save(d);return p.completed;} return false; },

  addWeekly(w) { const d=this.load(); w.id='wplan_'+Date.now(); if(!d.weeklyPlans)d.weeklyPlans=[]; d.weeklyPlans.push(w); this.save(d); return w; },
  updateWeekly(id, up) { const d=this.load(); if(!d.weeklyPlans)d.weeklyPlans=[]; const w=d.weeklyPlans.find(w=>w.id===id); if(w){Object.assign(w,up);this.save(d);} return w; },
  deleteWeekly(id) { const d=this.load(); d.weeklyPlans=(d.weeklyPlans||[]).filter(w=>w.id!==id); this.save(d); },
  toggleWeekly(id) { const d=this.load(); if(!d.weeklyPlans)d.weeklyPlans=[]; const w=d.weeklyPlans.find(w=>w.id===id); if(w){w.completed=!w.completed;this.save(d);return w.completed;} return false; },
  incrementWeekly(id) { const d=this.load(); if(!d.weeklyPlans)d.weeklyPlans=[]; const w=d.weeklyPlans.find(w=>w.id===id); if(!w) return null; const t=w.target||1; if(w.progress===undefined)w.progress=0; if(w.progress<t){w.progress++;w.completed=false;} if(w.progress>=t){w.progress=t;w.completed=true;} this.save(d); return {progress:w.progress, completed:w.completed, target:t}; },

  /* ===== 时间轴事件（与计划独立） ===== */
  getTimelineEvents() { return this.load().timelineEvents || []; },
  addTimelineEvent(ev) { const d=this.load(); if(!d.timelineEvents)d.timelineEvents=[]; ev.id='tev_'+Date.now(); d.timelineEvents.push(ev); this.save(d); return ev; },
  updateTimelineEvent(id, up) { const d=this.load(); if(!d.timelineEvents)d.timelineEvents=[]; const e=d.timelineEvents.find(e=>e.id===id); if(e){Object.assign(e,up);this.save(d);} return e; },
  deleteTimelineEvent(id) { const d=this.load(); d.timelineEvents=(d.timelineEvents||[]).filter(e=>e.id!==id); this.save(d); },
};

/* ===== 工具函数 ===== */

function getTodayStr() { const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function getOffsetDateStr(o) { const d=new Date();d.setDate(d.getDate()+o);return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function pad2(n) { return String(n).padStart(2,'0'); }
function timeToMin(t) { if(!t)return 0; const [h,m]=t.split(':').map(Number);return h*60+m; }
function minToTime(min) { return pad2(Math.floor(min/60))+':'+pad2(min%60); }
function durationMin(s,e) { return Math.max(0,timeToMin(e)-timeToMin(s)); }
function formatDuration(min) { const h=Math.floor(min/60),m=min%60;if(h===0)return m+'分钟';if(m===0)return h+'小时';return h+'小时'+m+'分钟'; }

function getMonday(date) { const d=new Date(date);const day=d.getDay();d.setDate(d.getDate()-day+(day===0?-6:1));d.setHours(0,0,0,0);return d; }
function getMondayStr(date) { const d=getMonday(date);return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

function formatDateFriendly(ds) {
  const d=new Date(ds);const td=new Date();td.setHours(0,0,0,0);
  const diff=Math.round((d-td)/86400000);
  if(diff===0)return '今天';if(diff===-1)return '昨天';if(diff===1)return '明天';
  const wd=['周日','周一','周二','周三','周四','周五','周六'];
  return `${d.getMonth()+1}月${d.getDate()}日 ${wd[d.getDay()]}`;
}

function escapeHtml(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
