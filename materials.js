'use strict';

let drillFolder;
let drillFiles = new Map();
let drillPermission = false;
const hasDrills = () => drillPermission || drillFiles.size > 0;

function updateMaterials(message) {
  $('material-status').textContent = message;
  $('connect-materials').textContent = hasDrills() ? '更换文件夹' : '选择分题文件夹';
  renderPlan();
}

function folderStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cet6-local-materials', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('folders');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('folders', mode);
      const result = action(tx.objectStore('folders'));
      tx.oncomplete = () => { db.close(); resolve(result.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = tx.onerror;
    };
  });
}

async function openDrill(filename) {
  // Open from the click itself so the browser allows the new tab.
  const viewer = window.open('', '_blank');
  if (!viewer) {
    notify('请允许此站打开新标签页，再点一次。');
    return;
  }
  viewer.opener = null;
  try {
    const file = drillFiles.get(filename) || await (await drillFolder.getFileHandle(filename)).getFile();
    const url = URL.createObjectURL(file);
    viewer.location.replace(url);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    viewer.close();
    notify('找不到这组题。请重新选择「分题练习」文件夹。');
  }
}

if (!localMode) {
  const connect = $('connect-materials');
  const picker = $('material-files');
  connect.addEventListener('click', async () => {
    if (!window.showDirectoryPicker) { picker.click(); return; }
    try {
      const folder = drillFolder && !drillPermission
        ? drillFolder : await window.showDirectoryPicker({ mode: 'read' });
      if (await folder.requestPermission({ mode: 'read' }) !== 'granted') return;
      await folder.getFileHandle('2024-12-1-passage1.pdf');
      drillFolder = folder;
      drillPermission = true;
      drillFiles = new Map();
      updateMaterials('本地分题已连接。练习页直接在你的浏览器打开。');
      folderStore('readwrite', store => store.put(folder, 'drills')).catch(() => {});
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (!drillPermission) drillFolder = undefined;
        updateMaterials('请选择「往年真题」里面的「分题练习」子文件夹。');
      }
    }
  });
  picker.addEventListener('change', () => {
    const files = new Map(Array.from(picker.files, file => [file.name, file]));
    if (!files.has('2024-12-1-passage1.pdf')) {
      updateMaterials('请选择「往年真题」里面的「分题练习」子文件夹。');
      return;
    }
    drillFiles = files;
    updateMaterials('本地分题已连接。关闭网页后如有需要可重新选择。');
  });
  if (window.showDirectoryPicker) {
    folderStore('readonly', store => store.get('drills')).then(async folder => {
      if (!folder) return;
      drillFolder = folder;
      drillPermission = await folder.queryPermission({ mode: 'read' }) === 'granted';
      updateMaterials(drillPermission ? '本地分题已连接。' : '点击恢复访问，继续打开本地分题。');
      if (!drillPermission) connect.textContent = '恢复访问';
    }).catch(() => {});
  }
}
