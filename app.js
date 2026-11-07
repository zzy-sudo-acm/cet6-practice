'use strict';

const $ = id => document.getElementById(id);
const storageKey = 'cet6-training-2026-v1';
const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = () => shanghaiDate.format(new Date());
const asDate = key => new Date(key + 'T00:00:00Z');
const dayLabel = key => `${Number(key.slice(5,7))} 月 ${Number(key.slice(8,10))} 日`;
const localMode = location.protocol === 'file:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let localAssets = {};
let state = { done: {}, checkins: {} };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) state = { done: saved.done || {}, checkins: saved.checkins || {} };
} catch {
  $('storage-note').textContent = '当前浏览器无法读取记录。';
}
let selected = today();
let month = selected.slice(0, 7);
let toastTimeout;
const currentTask = () => TASKS.find(task => !state.done[task.id]);

function notify(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 2800);
}

function save(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    message += ' 浏览器无法保存，关闭后可能丢失。';
    $('storage-note').textContent = '浏览器无法保存本地记录。';
  }
  render();
  notify(message);
}

function link(url, label, className = 'resource') {
  return `<a class="${className}" href="${url}" target="_blank" rel="noopener">${label} <span aria-hidden="true">↗</span></a>`;
}

function materialsFor(id, targetList, title = '') {
  const paper = PAPERS[id];
  const local = localAssets[id];
  const audio = paper.audio ? link(local?.audio || paper.audio, '播放听力') : '';
  if (!targetList) {
    return `<div class="exercise-full">${title ? '<strong>' + title + '</strong>' : '<strong>本阶段做整套卷</strong>'}
      <div class="resources">${link(local?.pdf || paper.source, '打开整套模考卷')}${audio}</div></div>`;
  }
  const canOpenClips = !localMode && typeof hasDrills === 'function' && hasDrills();
  return `${title ? '<p class="alternate-label">' + title + '</p>' : ''}
    <div class="exercise-list">${targetList.map(target => {
      const filename = id + '-' + target + '.pdf';
      const page = TARGET_PAGES[id][target];
      const original = (local?.pdf || paper.source) + '#page=' + page;
      const drillLink = localMode
        ? link('../往年真题/分题练习/' + filename, '只打开这组题')
        : canOpenClips
          ? `<button class="resource" type="button" data-action="drill" data-id="${filename}">只打开这组题 ↗</button>`
          : link(original, '原卷第 ' + page + ' 页');
      return `<div class="exercise"><strong>${SECTIONS[target]}</strong><div class="resources">${drillLink}${target === 'listening' ? audio : ''}</div></div>`;
    }).join('')}</div>`;
}

function renderPlan() {
  const task = currentTask();
  const number = task ? TASKS.indexOf(task) + 1 : TASKS.length;
  $('plan-count').textContent = task ? `第 ${number} / ${TASKS.length} 阶段` : '全部阶段已完成';
  $('material-bar').hidden = localMode;
  if (!task) {
    $('phases').innerHTML = '<div class="current-stage"><h3 id="stage-title" tabindex="-1">20 个阶段全部完成</h3><p class="muted">可在打卡日历查看每天完成的阶段。</p></div>';
    return;
  }
  const targetList = TARGETS[task.id];
  const alternate = task.alternate ? materialsFor(task.alternate, targetList, '考场做过这套？使用备用卷') : '';
  $('phases').innerHTML = `<article class="current-stage">
    <div class="stage-line"><span class="phase-number">${String(number).padStart(2,'0')}</span><div><p class="kicker">${task.phase.name}</p><h3 id="stage-title" tabindex="-1">${task.title}</h3></div></div>
    <div class="task-meta"><span class="tag" data-kind="${task.kind}">${task.kind}</span><span>${PAPERS[task.paper].label}</span><span class="duration">约 ${task.minutes} 分钟</span></div>
    <p class="stage-description">${task.description}</p>
    ${materialsFor(task.paper, targetList)}
    ${alternate}
    <div class="stage-footer">${link(PAPERS[task.paper].source,'做完再看解析')}
      <button class="primary" type="button" data-action="complete" data-id="${task.id}">我已完成本阶段 <span aria-hidden="true">→</span></button>
    </div>
  </article>`;
}

function renderProgress() {
  const count = TASKS.filter(task => state.done[task.id]).length;
  $('progress').max = TASKS.length;
  $('progress').value = count;
  $('percent').textContent = Math.round(count / TASKS.length * 100) + '%';
  $('completed').textContent = `已完成 ${count} / ${TASKS.length} 阶段`;
  $('remaining').textContent = `剩余 ${TASKS.length - count} 阶段`;
  const days = Math.round((asDate(EXAM) - asDate(today())) / 86400000);
  $('countdown').textContent = days > 0 ? days : days === 0 ? '今天' : '已结束';
  $('countdown').classList.toggle('words', days <= 0);
  $('countdown-unit').hidden = days <= 0;
}

function renderCalendar() {
  const first = asDate(month + '-01');
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const currentDay = today();
  const completedDates = new Set(TASKS.map(task => state.done[task.id]).filter(Boolean));
  const canCheck = completedDates.has(currentDay);
  const isChecked = key => !!state.checkins[key] && (key !== currentDay || canCheck);
  $('month-label').textContent = `${year} 年 ${monthIndex + 1} 月`;
  let cells = '<span class="empty"></span>'.repeat(offset);
  for (let day = 1; day <= days; day++) {
    const key = month + '-' + String(day).padStart(2,'0');
    const flags = [key === currentDay ? 'is-today' : '', key === EXAM ? 'is-exam' : '', isChecked(key) ? 'is-checked' : ''].filter(Boolean).join(' ');
    const details = [key === currentDay ? '今天' : '', key === EXAM ? '六级笔试' : '', completedDates.has(key) ? '完成阶段' : '', isChecked(key) ? '已打卡' : ''].filter(Boolean);
    cells += `<button type="button" class="day ${flags}" data-action="day" data-id="${key}" aria-pressed="${selected === key}" aria-label="${dayLabel(key)}${details.length ? '，' + details.join('，') : ''}">${day}<span class="day-dots" aria-hidden="true">${completedDates.has(key) ? '<i class="planned-dot"></i>' : ''}${isChecked(key) ? '<i class="checked-dot"></i>' : ''}${key === EXAM ? '<i class="exam-dot"></i>' : ''}</span></button>`;
  }
  $('calendar-grid').innerHTML = cells;
  const items = TASKS.filter(task => state.done[task.id] === selected);
  $('day-detail').innerHTML = `<div class="day-heading"><strong>${dayLabel(selected)}${selected === currentDay ? ' · 今天' : ''}</strong>${isChecked(selected) ? '<span class="check-label">✓ 已打卡</span>' : ''}</div>
    ${selected === EXAM ? '<p class="exam-event">六级笔试 · 15:00–17:25</p>' : ''}
    ${items.length ? `<ul class="day-tasks">${items.map(task => `<li>${task.title}</li>`).join('')}</ul>` : '<p class="day-empty">这一天还没有完成记录。</p>'}`;
  const checked = isChecked(currentDay);
  $('daily-checkin').innerHTML = `<button class="${checked ? 'secondary' : 'primary'} checkin-button" type="button" data-action="checkin" ${!canCheck || checked ? 'disabled' : ''}>${checked ? '✓ 今日已打卡' : canCheck ? '今日打卡' : '完成一个阶段后可打卡'}</button>`;
}

function render() {
  renderPlan();
  renderProgress();
  renderCalendar();
}

function moveMonth(delta) {
  const date = asDate(month + '-01');
  date.setUTCMonth(date.getUTCMonth() + delta);
  month = date.toISOString().slice(0, 7);
  selected = month === today().slice(0, 7) ? today() : month + '-01';
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  switch (action) {
    case 'complete':
      if (currentTask()?.id !== id) return;
      state.done[id] = today();
      selected = today();
      month = selected.slice(0, 7);
      save(currentTask() ? '本阶段已完成，下一阶段已解锁' : '全部阶段已完成');
      $('stage-title').focus({ preventScroll: true });
      break;
    case 'checkin': {
      const day = today();
      if (state.checkins[day] || !TASKS.some(task => state.done[task.id] === day)) return;
      state.checkins[day] = true;
      selected = day;
      month = day.slice(0,7);
      save('今日打卡成功');
      break;
    }
    case 'drill': openDrill(id); break;
    case 'day':
      selected = id;
      renderCalendar();
      document.querySelector(`[data-action="day"][data-id="${id}"]`).focus();
      break;
    case 'prev': moveMonth(-1); renderCalendar(); break;
    case 'next': moveMonth(1); renderCalendar(); break;
    case 'today': selected = today(); month = selected.slice(0, 7); renderCalendar(); break;
  }
});

render();
if (localMode) {
  const script = document.createElement('script');
  script.src = 'local-assets.js';
  script.onload = () => { localAssets = window.CET_LOCAL_ASSETS; renderPlan(); };
  document.head.append(script);
}
let renderedDay = today();
setInterval(() => {
  if (today() === renderedDay) return;
  if (selected === renderedDay) {
    selected = today();
    month = selected.slice(0,7);
  }
  renderedDay = today();
  renderProgress();
  renderCalendar();
}, 30000);
