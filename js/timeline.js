/* timeline.js - 每日时间轴（长按添加事件） */

const Timeline = {
  currentDate: getTodayStr(),
  HOUR_PX: 72,
  HOURS: 24,

  init() { this.render(); },

  render() {
    this.renderNav();
    this.renderTimeline();
  },

  renderNav() {
    const nav = document.getElementById('timelineNav');
    nav.innerHTML = `
      <button class="btn-icon small" id="btnPrevDayT"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="nav-label" style="cursor:pointer" id="tlDateLabel">${formatDateFriendly(this.currentDate)}</span>
      <button class="btn-icon small" id="btnNextDayT"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    `;
    document.getElementById('btnPrevDayT').onclick = () => this.shift(-1);
    document.getElementById('btnNextDayT').onclick = () => this.shift(1);
    document.getElementById('tlDateLabel').onclick = () => {
      const d = new Date(this.currentDate);
      App.openDayPicker(d, (nd) => { this.currentDate = `${nd.getFullYear()}-${pad2(nd.getMonth()+1)}-${pad2(nd.getDate())}`; this.render(); });
    };
  },

  shift(d) {
    const dt = new Date(this.currentDate); dt.setDate(dt.getDate()+d);
    this.currentDate = `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
    this.render();
  },

  renderTimeline() {
    const container = document.getElementById('timelineContent');
    const totalH = this.HOURS * this.HOUR_PX;
    const plans = Store.getPlans().filter(p => p.date === this.currentDate);
    const events = Store.getTimelineEvents().filter(e => e.date === this.currentDate);
    const isToday = this.currentDate === getTodayStr();

    let html = '';
    // 小时行
    for (let h = 0; h < this.HOURS; h++) {
      html += `<div class="timeline-row" style="height:${this.HOUR_PX}px;" data-hour="${h}">
        <span class="tl-hour">${pad2(h)}:00</span>`;
      // 半小时线
      html += `<div style="position:absolute;left:0;right:0;top:50%;height:1px;background:var(--border);opacity:.4"></div>`;
      html += `</div>`;
    }

    // 当前时间线
    if (isToday) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const nowTop = nowMin * this.HOUR_PX / 60;
      html += `<div class="now-line" style="top:${nowTop}px;left:44px;right:0"></div>`;
    }

    // 收集所有块（计划+事件），统一处理重叠
    const allBlocks = [];
    plans.forEach(p => {
      allBlocks.push({
        id: p.id, type: 'plan', data: p,
        startMin: timeToMin(p.startTime), endMin: timeToMin(p.endTime),
        cat: Store.getCategory(p.categoryId),
      });
    });
    events.forEach(e => {
      allBlocks.push({
        id: e.id, type: 'event', data: e,
        startMin: timeToMin(e.startTime), endMin: timeToMin(e.endTime),
        cat: Store.getCategory(e.categoryId),
      });
    });

    // 按开始时间排序（同时长的在前，便于列分配）
    allBlocks.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

    // 分组：时间重叠的块归为同一组
    const groups = [];
    let curGroup = [];
    let groupEnd = 0;
    allBlocks.forEach(block => {
      if (curGroup.length === 0) {
        curGroup = [block];
        groupEnd = block.endMin;
      } else if (block.startMin < groupEnd) {
        curGroup.push(block);
        groupEnd = Math.max(groupEnd, block.endMin);
      } else {
        groups.push(curGroup);
        curGroup = [block];
        groupEnd = block.endMin;
      }
    });
    if (curGroup.length > 0) groups.push(curGroup);

    // 为每组分配列号（贪心：找到第一个不冲突的列）
    groups.forEach(group => {
      const colEnds = [];
      group.forEach(block => {
        let col = -1;
        for (let i = 0; i < colEnds.length; i++) {
          if (colEnds[i] <= block.startMin) { col = i; colEnds[i] = block.endMin; break; }
        }
        if (col === -1) { colEnds.push(block.endMin); col = colEnds.length - 1; }
        block._col = col;
      });
      group._cols = Math.max(colEnds.length, 1);
    });

    // 渲染所有块
    groups.forEach(group => {
      const cols = group._cols;
      const isMulti = cols > 1;

      group.forEach(block => {
        const p = block.data;
        const cat = block.cat;
        const top = block.startMin * this.HOUR_PX / 60;
        const ht = Math.max((block.endMin - block.startMin) * this.HOUR_PX / 60, 30);
        const title = escapeHtml(p.title || (block.type === 'plan' ? '未命名计划' : '未命名事件'));
        const timeRange = `${p.startTime}-${p.endTime}`;
        const blockClass = block.type === 'plan' ? 'plan-block' : 'event-block';
        const bgStyle = block.type === 'plan'
          ? `background:${cat.color}1a;border:1.5px dashed ${cat.color};color:${cat.color};`
          : `background:${cat.color};`;

        let posStyle, innerHtml;

        if (isMulti) {
          // 多事件并排：垂直布局（标题上，时间下）
          const gap = 3;
          const leftCalc = `calc(46px + ${block._col} * (100% - 50px) / ${cols} + 1px)`;
          const widthCalc = `calc((100% - 50px) / ${cols} - ${gap}px)`;
          posStyle = `top:${top}px;height:${ht}px;left:${leftCalc};width:${widthCalc};${bgStyle}`;

          if (block.type === 'plan') {
            innerHtml = `<div class="tb-col"><span class="tb-tag" style="background:${cat.color};color:#fff;">计划</span><span class="tb-title">${title}</span><span class="tb-time">${timeRange}</span></div>`;
          } else {
            innerHtml = `<div class="tb-col"><span class="tb-title">${title}</span><span class="tb-time">${timeRange}</span></div>`;
          }
        } else {
          // 单事件：水平布局（标题左，时间右）
          posStyle = `top:${top}px;height:${ht}px;left:46px;right:4px;${bgStyle}`;

          if (block.type === 'plan') {
            innerHtml = `<div class="tb-row"><span class="tb-tag" style="background:${cat.color};color:#fff;">计划</span><span class="tb-title">${title}</span><span class="tb-time">${timeRange}</span></div>`;
          } else {
            innerHtml = `<div class="tb-row"><span class="tb-title">${title}</span><span class="tb-time">${timeRange}</span></div>`;
          }
        }

        html += `<div class="timeline-block ${blockClass} ${p.completed?'completed':''} ${isMulti?'multi-block':''}" style="${posStyle}" data-${block.type==='plan'?'pid':'eid'}="${block.id}">${innerHtml}</div>`;
      });
    });

    container.innerHTML = html;
    container.style.height = totalH + 'px';
    container.style.position = 'relative';

    // 滚动到当前时间附近
    if (isToday) {
      const now = new Date();
      const scrollTo = Math.max(0, (now.getHours() - 2) * this.HOUR_PX);
      setTimeout(() => {
        document.getElementById('timelineScroll').scrollTop = scrollTo;
      }, 100);
    }

    // 长按事件
    this.bindLongPress();

    // 点击计划块 → 提示去每日计划编辑
    container.querySelectorAll('.plan-block').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        Toast.show('这是计划项，请在「每日计划」中编辑');
      });
    });

    // 点击事件块 → 打开编辑
    container.querySelectorAll('.event-block').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        App.openTimelineEventModal(el.dataset.eid);
      });
    });
  },

  bindLongPress() {
    const scrollEl = document.getElementById('timelineScroll');
    const contentEl = document.getElementById('timelineContent');
    let timer = null, startX = 0, startY = 0;

    // 移除旧事件（重新绑定时）
    const fnTouchStart = (e) => {
      // 忽略在时间块上的长按
      if (e.target.closest('.timeline-block')) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      timer = setTimeout(() => {
        this.handleLongPress(t.clientX, t.clientY);
      }, 500);
    };
    const fnTouchMove = (e) => {
      if (!timer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
        clearTimeout(timer); timer = null;
      }
    };
    const fnTouchEnd = () => { clearTimeout(timer); timer = null; };

    const fnMouseDown = (e) => {
      if (e.target.closest('.timeline-block')) return;
      startX = e.clientX; startY = e.clientY;
      timer = setTimeout(() => {
        this.handleLongPress(e.clientX, e.clientY);
      }, 500);
    };
    const fnMouseMove = (e) => {
      if (!timer) return;
      if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) {
        clearTimeout(timer); timer = null;
      }
    };
    const fnMouseUp = () => { clearTimeout(timer); timer = null; };

    // 使用新的事件处理方式
    scrollEl.ontouchstart = fnTouchStart;
    scrollEl.ontouchmove = fnTouchMove;
    scrollEl.ontouchend = fnTouchEnd;
    scrollEl.onmousedown = fnMouseDown;
    scrollEl.onmousemove = fnMouseMove;
    scrollEl.onmouseup = fnMouseUp;
    scrollEl.onmouseleave = fnMouseUp;
  },

  handleLongPress(clientX, clientY) {
    const scrollEl = document.getElementById('timelineScroll');
    const rect = scrollEl.getBoundingClientRect();
    const y = clientY - rect.top + scrollEl.scrollTop;
    let minutes = Math.round((y / this.HOUR_PX) * 60 / 15) * 15;
    if (minutes < 0) minutes = 0;
    if (minutes >= 1440) minutes = 1425;

    // 涟漪动画
    const ripple = document.createElement('div');
    ripple.className = 'longpress-ripple';
    ripple.style.left = (clientX - rect.left) + 'px';
    ripple.style.top = (clientY - rect.top) + 'px';
    scrollEl.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // 打开新建弹窗（时间轴事件）
    const startTime = minToTime(minutes);
    const endTime = minToTime(Math.min(minutes + 60, 1425));
    App.openTimelineEventModal(null, this.currentDate, startTime, endTime);
  },

  refresh() { this.render(); },
};
