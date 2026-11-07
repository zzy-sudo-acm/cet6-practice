'use strict';

const $ = id => document.getElementById(id);
const storageKey = 'cet6-training-2026-v1';
const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = () => shanghaiDate.format(new Date());
const asDate = key => new Date(key + 'T00:00:00Z');
const dateKey = date => date.toISOString().slice(0, 10);
const dayLabel = key => `${Number(key.slice(5,7))} 月 ${Number(key.slice(8,10))} 日`;
const taskMap = Object.fromEntries(TASKS.map(task => [task.id, task]));

let state = { done: {}, planned: {}, checkins: {} };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) state = { ...state, ...saved };
} catch {
  $('storage-note').textContent = '当前浏览器无法读取记录。';
}
let selected = today();
let month = selected.slice(0, 7);
let editing = null;
let localAssets = {};
let toastTimeout;
const openPhases = new Set(['baseline']);

function save(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    message += ' 浏览器无法保存，关闭后可能丢失。';
    $('storage-note').textContent = '浏览器无法保存本地记录。';
  }
  render();
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 2800);
}

function link(url, label, extra = '') {
  return `<a class="resource ${extra}" href="${url}" target="_blank" rel="noopener">${label}<span aria-hidden="true">↗</span></a>`;
}

function resources(id, page, includeAudio, fallback = false) {
  const paper = PAPERS[id];
  const local = localAssets[id];
  const pdf = local ? local.pdf + '#page=' + page : paper.source;
  let result = link(pdf, fallback ? '备用卷' : local ? '打开 PDF' : '打开原卷');
  if (includeAudio && paper.audio) {
    result += link(local?.audio || paper.audio, fallback ? '备用听力' : '听力', 'audio-link');
  }
  if (local && !fallback) result += link(paper.source, '原站解析');
  return result;
}

function taskCard(task) {
  const done = state.done[task.id];
  const planned = state.planned[task.id];
  const includesAudio = ['整卷','听力'].includes(task.kind);
  return `<article class="task${done ? ' finished' : ''}" id="task-${task.id}">
    <button type="button" class="task-check" data-action="complete" data-id="${task.id}" aria-pressed="${!!done}" aria-label="${done ? '取消完成' : '标为完成'}：${task.title}">${done ? '✓' : ''}</button>
    <div class="task-content">
      <div class="task-meta"><span class="tag" data-kind="${task.kind}">${task.kind}</span><span>${PAPERS[task.paper].label}</span><span class="duration">${task.minutes} 分钟</span></div>
      <h4>${task.title}</h4><p>${task.description}</p>
      <div class="resources">${resources(task.paper, task.page, includesAudio)}${task.alternate ? resources(task.alternate, task.page, includesAudio, true) : ''}</div>
    </div>
    <button class="schedule-button" type="button" data-action="schedule" data-id="${task.id}" aria-label="${planned ? '改期' : '选日期'}：${task.title}">${planned ? dayLabel(planned) : '选日期'} <span aria-hidden="true">${planned ? '· 改期' : '+'}</span></button>
  </article>`;
}

function renderPlan() {
  $('plan-count').textContent = `${PHASES.length} 个阶段 · ${TASKS.length} 次练习`;
  $('phases').innerHTML = PHASES.map(phase => {
    const tasks = TASKS.filter(task => task.phase === phase.id);
    const count = tasks.filter(task => state.done[task.id]).length;
    return `<section class="phase" data-phase="${phase.id}">
      <h3><button type="button" class="phase-toggle" data-action="phase" data-id="${phase.id}" aria-expanded="${openPhases.has(phase.id)}" aria-controls="phase-${phase.id}">
        <span class="phase-number">${phase.number}</span><span class="phase-label"><strong>${phase.name}</strong><small>${phase.hint}</small></span>
        <span class="phase-count">${count}/${tasks.length}</span><span class="chevron" aria-hidden="true">⌄</span>
      </button></h3>
      <div id="phase-${phase.id}" class="tasks" ${openPhases.has(phase.id) ? '' : 'hidden'}>${tasks.map(taskCard).join('')}</div>
    </section>`;
  }).join('');
}

function renderProgress() {
  const count = TASKS.filter(task => state.done[task.id]).length;
  $('progress').max = TASKS.length;
  $('progress').value = count;
  $('percent').textContent = Math.round(count / TASKS.length * 100) + '%';
  $('completed').textContent = `已完成 ${count} / ${TASKS.length} 项`;
  $('remaining').textContent = `剩余 ${TASKS.length - count} 项`;
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
  $('month-label').textContent = `${year} 年 ${monthIndex + 1} 月`;
  const planned = new Set(Object.values(state.planned));
  let cells = '<span class="empty"></span>'.repeat(offset);
  for (let day = 1; day <= days; day++) {
    const key = month + '-' + String(day).padStart(2,'0');
    const flags = [key === today() ? 'is-today' : '', key === EXAM ? 'is-exam' : '', state.checkins[key] ? 'is-checked' : ''].filter(Boolean).join(' ');
    const details = [key === today() ? '今天' : '', key === EXAM ? '六级笔试' : '', planned.has(key) ? '已安排' : '', state.checkins[key] ? '已打卡' : ''].filter(Boolean);
    cells += `<button type="button" class="day ${flags}" data-action="day" data-id="${key}" aria-pressed="${selected === key}" aria-label="${dayLabel(key)}${details.length ? '，' + details.join('，') : ''}">${day}<span class="day-dots" aria-hidden="true">${planned.has(key) ? '<i class="planned-dot"></i>' : ''}${state.checkins[key] ? '<i class="checked-dot"></i>' : ''}${key === EXAM ? '<i class="exam-dot"></i>' : ''}</span></button>`;
  }
  $('calendar-grid').innerHTML = cells;
  const items = TASKS.filter(task => state.planned[task.id] === selected || state.done[task.id] === selected);
  const checked = !!state.checkins[selected];
  $('day-detail').innerHTML = `<div class="day-heading"><strong>${dayLabel(selected)}${selected === today() ? ' · 今天' : ''}</strong>${checked ? '<span class="check-label">✓ 已打卡</span>' : ''}</div>
    ${selected === EXAM ? '<p class="exam-event">六级笔试 · 15:00–17:25</p>' : ''}
    ${items.length ? `<ul class="day-tasks">${items.map(task => `<li><button class="quiet" type="button" data-action="jump" data-id="${task.id}">${state.done[task.id] ? '✓ ' : ''}${task.title}</button></li>`).join('')}</ul>` : '<p class="day-empty">当天暂无练习安排。</p>'}
    <button class="${checked ? 'secondary' : 'primary'} checkin-button" type="button" data-action="checkin" ${selected > today() ? 'disabled' : ''}>${checked ? '撤销打卡' : selected === today() ? '今天已练习，打卡' : selected > today() ? '当天可打卡' : '补记这天的打卡'}</button>`;
}

function renderLibrary() {
  $('library-list').innerHTML = Object.values(PAPERS).map(paper =>
    `<div class="library-row"><div><strong>${paper.label}</strong><small>${paper.set === 3 ? '阅读 · 写作 · 翻译' : '含配套听力'}</small></div><div class="resources">${resources(`${paper.session}-${paper.set}`,1,true)}</div></div>`
  ).join('');
}

function render() {
  renderPlan();
  renderProgress();
  renderCalendar();
}

function moveMonth(delta) {
  const date = asDate(month + '-01');
  date.setUTCMonth(date.getUTCMonth() + delta);
  month = dateKey(date).slice(0, 7);
  selected = month === today().slice(0, 7) ? today() : month + '-01';
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  switch (action) {
    case 'phase':
      if (openPhases.has(id)) openPhases.delete(id);
      else openPhases.add(id);
      renderPlan();
      document.querySelector(`[data-action="phase"][data-id="${id}"]`).focus();
      break;
    case 'complete': {
      const alreadyDone = !!state.done[id];
      if (alreadyDone) delete state.done[id];
      else state.done[id] = today();
      save(alreadyDone ? '已撤销完成' : '完成一项练习');
      document.querySelector(`[data-action="complete"][data-id="${id}"]`).focus();
      break;
    }
    case 'schedule':
      editing = id;
      $('schedule-task').textContent = taskMap[id].title;
      $('task-date').value = state.planned[id] || selected;
      $('unschedule').hidden = !state.planned[id];
      $('schedule').showModal();
      break;
    case 'checkin':
      if (selected > today()) return;
      if (state.checkins[selected]) {
        delete state.checkins[selected];
        save('已撤销打卡');
      } else {
        state.checkins[selected] = true;
        save(`${dayLabel(selected)}打卡成功`);
      }
      document.querySelector('.checkin-button').focus();
      break;
    case 'day':
      selected = id;
      renderCalendar();
      document.querySelector(`[data-action="day"][data-id="${id}"]`).focus();
      break;
    case 'prev': moveMonth(-1); renderCalendar(); break;
    case 'next': moveMonth(1); renderCalendar(); break;
    case 'today': selected = today(); month = selected.slice(0, 7); renderCalendar(); break;
    case 'jump':
      openPhases.add(taskMap[id].phase);
      renderPlan();
      $(`task-${id}`).querySelector('.task-check').focus({ preventScroll: true });
      $(`task-${id}`).scrollIntoView({ block: 'center' });
      break;
  }
});

$('schedule-form').addEventListener('submit', event => {
  event.preventDefault();
  const date = $('task-date').value;
  state.planned[editing] = date;
  selected = date;
  month = date.slice(0, 7);
  $('schedule').close();
  save(`已安排在 ${dayLabel(date)}`);
  document.querySelector(`[data-action="schedule"][data-id="${editing}"]`).focus();
});
$('unschedule').addEventListener('click', () => {
  delete state.planned[editing];
  $('schedule').close();
  save('已取消安排');
  document.querySelector(`[data-action="schedule"][data-id="${editing}"]`).focus();
});
document.querySelectorAll('.dialog-close').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});
$('library-open').addEventListener('click', () => {
  renderLibrary();
  $('library').showModal();
});

render();
if (['localhost','127.0.0.1','[::1]'].includes(location.hostname) || location.protocol === 'file:') {
  const script = document.createElement('script');
  script.src = 'local-assets.js';
  script.onload = () => {
    localAssets = window.CET_LOCAL_ASSETS;
    $('library-description').textContent = '15 套本地 PDF。订正时打开同套原站页面核对答案。';
    renderPlan();
    if ($('library').open) renderLibrary();
  };
  document.head.append(script);
}
