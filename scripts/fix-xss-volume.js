// Fix XSS injection + volume save bug - run from project root
const fs = require('fs');
const path = require('path');

const filePath = path.resolve('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
console.log('Reading:', filePath);
let content = fs.readFileSync(filePath, 'utf8');
const orig = content;

// === FIX 1: Volume save bug ===

// 1a: persist param
const f1a = content.replace('function updateSliders(val) {', 'function updateSliders(val, persist = true) {');
if (f1a !== content) { content = f1a; console.log('[OK] 1a: persist param'); } else { console.warn('[MISS] 1a'); }

// 1bc: skip save when !persist, read fresh settings
const old_save = '      if (saveTimeout) clearTimeout(saveTimeout);\n      saveTimeout = setTimeout(() => {\n        savedSettings.volume = val;\n        StorageManager.saveSettings(savedSettings);\n      }, 300);';
const new_save = '      if (saveTimeout) clearTimeout(saveTimeout);\n      if (!persist) return;\n      saveTimeout = setTimeout(() => {\n        StorageManager.saveSettings({...StorageManager.getSettings(), volume: val});\n      }, 300);';
if (content.includes(old_save)) { content = content.replace(old_save, new_save); console.log('[OK] 1bc: fresh settings'); } else { console.warn('[MISS] 1bc'); }

// 1d: initial call no-persist
const old_1d = '    updateSliders(initVol);\n\n    if (deskSlider) {';
const new_1d = '    updateSliders(initVol, false);\n\n    if (deskSlider) {';
if (content.includes(old_1d)) { content = content.replace(old_1d, new_1d); console.log('[OK] 1d: initial no-persist'); } else { console.warn('[MISS] 1d'); }

// 1e: isTrusted on real user input
content = content.replaceAll(
  "deskSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value)));",
  "deskSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value), e.isTrusted));"
);
content = content.replaceAll(
  "mobSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value)));",
  "mobSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value), e.isTrusted));"
);
console.log('[OK] 1e: isTrusted checks applied');

// === FIX 2: XSS — replace customActions innerHTML blocks with safe DOM API ===

// 2a: Chao custom actions
const chao_old = '      // Th\u00eam c\u00e1c custom action thu\u1ed9c nh\u00f3m Ch\u00e0o c\u1edd\n      customActions.filter(a => a.group === \'chao\' && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        btn.innerHTML = `\n          <span class="btn-icon">${item.icon || \'\u2b50\'}</span>\n          <span class="btn-text">${formatActionText(item.name)}</span>\n          <span class="btn-gear" title="C\u00e0i \u0111\u1eb7t \u00e2m thanh" onclick="event.stopPropagation(); openActionSoundModal(\'${item.name}\')">⚙</span>\n        `;\n        btn.onclick = () => handleActionClick(item.name, btn);\n        chaoContainer.appendChild(btn);\n      });';
const chao_new = '      // Th\u00eam c\u00e1c custom action thu\u1ed9c nh\u00f3m Ch\u00e0o c\u1edd (AN TO\u00c0N: d\u00f9ng DOM API)\n      customActions.filter(a => a.group === \'chao\' && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        const iconSpan = document.createElement(\'span\'); iconSpan.className = \'btn-icon\'; iconSpan.textContent = item.icon || \'\u2b50\';\n        const textSpan = document.createElement(\'span\'); textSpan.className = \'btn-text\'; textSpan.textContent = item.name;\n        const gearSpan = document.createElement(\'span\'); gearSpan.className = \'btn-gear\'; gearSpan.title = \'C\u00e0i \u0111\u1eb7t \u00e2m thanh\'; gearSpan.textContent = \'\u2699\';\n        gearSpan.addEventListener(\'click\', (e) => { e.stopPropagation(); openActionSoundModal(item.name); });\n        btn.appendChild(iconSpan); btn.appendChild(textSpan); btn.appendChild(gearSpan);\n        btn.addEventListener(\'click\', () => handleActionClick(item.name, btn));\n        chaoContainer.appendChild(btn);\n      });';
if (content.includes(chao_old)) { content = content.replace(chao_old, chao_new); console.log('[OK] 2a: chao DOM safe'); } else { console.warn('[MISS] 2a chao - trying fallback search...'); const idx = content.indexOf('customActions.filter(a => a.group === \'chao\''); console.log('  chao filter at:', idx); }

// 2b: Alarm custom actions
const alarm_old = '      // Th\u00eam custom actions thu\u1ed9c nh\u00f3m B\u00e1o \u0111\u1ed9ng\n      customActions.filter(a => a.group === \'alarm\' && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        btn.innerHTML = `\n          <span class="btn-icon">${item.icon || \'\ud83d\udea8\'}</span>\n          <span class="btn-text">${formatActionText(item.name)}</span>\n          <span class="btn-gear" title="C\u00e0i \u0111\u1eb7t \u00e2m thanh" onclick="event.stopPropagation(); openActionSoundModal(\'${item.name}\')">⚙</span>\n        `;\n        btn.onclick = () => handleActionClick(item.name, btn);\n        alarmContainer.appendChild(btn);\n      });';
const alarm_new = '      // Th\u00eam custom actions thu\u1ed9c nh\u00f3m B\u00e1o \u0111\u1ed9ng (AN TO\u00c0N: d\u00f9ng DOM API)\n      customActions.filter(a => a.group === \'alarm\' && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        const iconSpan = document.createElement(\'span\'); iconSpan.className = \'btn-icon\'; iconSpan.textContent = item.icon || \'\ud83d\udea8\';\n        const textSpan = document.createElement(\'span\'); textSpan.className = \'btn-text\'; textSpan.textContent = item.name;\n        const gearSpan = document.createElement(\'span\'); gearSpan.className = \'btn-gear\'; gearSpan.title = \'C\u00e0i \u0111\u1eb7t \u00e2m thanh\'; gearSpan.textContent = \'\u2699\';\n        gearSpan.addEventListener(\'click\', (e) => { e.stopPropagation(); openActionSoundModal(item.name); });\n        btn.appendChild(iconSpan); btn.appendChild(textSpan); btn.appendChild(gearSpan);\n        btn.addEventListener(\'click\', () => handleActionClick(item.name, btn));\n        alarmContainer.appendChild(btn);\n      });';
if (content.includes(alarm_old)) { content = content.replace(alarm_old, alarm_new); console.log('[OK] 2b: alarm DOM safe'); } else { console.warn('[MISS] 2b alarm'); const idx = content.indexOf('customActions.filter(a => a.group === \'alarm\''); console.log('  alarm filter at:', idx); }

// 2c: Daily custom actions
const daily_old = '      // Th\u00eam custom actions thu\u1ed9c nh\u00f3m Sinh ho\u1ea1t\n      customActions.filter(a => (a.group === \'daily\' || !a.group) && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        btn.innerHTML = `\n          <span class="btn-icon">${item.icon || \'\ud83d\udccc\'}</span>\n          <span class="btn-text">${formatActionText(item.name)}</span>\n          <span class="btn-gear" title="C\u00e0i \u0111\u1eb7t \u00e2m thanh" onclick="event.stopPropagation(); openActionSoundModal(\'${item.name}\')">⚙</span>\n        `;\n        btn.onclick = () => handleActionClick(item.name, btn);\n        dailyContainer.appendChild(btn);\n      });';
const daily_new = '      // Th\u00eam custom actions thu\u1ed9c nh\u00f3m Sinh ho\u1ea1t (AN TO\u00c0N: d\u00f9ng DOM API)\n      customActions.filter(a => (a.group === \'daily\' || !a.group) && !disabledActions.includes(a.name)).forEach(item => {\n        const btn = document.createElement(\'button\');\n        btn.className = \'military-btn\';\n        const iconSpan = document.createElement(\'span\'); iconSpan.className = \'btn-icon\'; iconSpan.textContent = item.icon || \'\ud83d\udccc\';\n        const textSpan = document.createElement(\'span\'); textSpan.className = \'btn-text\'; textSpan.textContent = item.name;\n        const gearSpan = document.createElement(\'span\'); gearSpan.className = \'btn-gear\'; gearSpan.title = \'C\u00e0i \u0111\u1eb7t \u00e2m thanh\'; gearSpan.textContent = \'\u2699\';\n        gearSpan.addEventListener(\'click\', (e) => { e.stopPropagation(); openActionSoundModal(item.name); });\n        btn.appendChild(iconSpan); btn.appendChild(textSpan); btn.appendChild(gearSpan);\n        btn.addEventListener(\'click\', () => handleActionClick(item.name, btn));\n        dailyContainer.appendChild(btn);\n      });';
if (content.includes(daily_old)) { content = content.replace(daily_old, daily_new); console.log('[OK] 2c: daily DOM safe'); } else { console.warn('[MISS] 2c daily'); const idx = content.indexOf('customActions.filter(a => (a.group === \'daily\''); console.log('  daily filter at:', idx); }

// Summary
if (content === orig) { console.error('[FAIL] No changes!'); process.exit(1); }
console.log('\nSummary:');
console.log('  persist param:', content.includes('persist = true') ? 'OK' : 'MISSING');
console.log('  !persist guard:', content.includes('if (!persist) return;') ? 'OK' : 'MISSING');
console.log('  initVol false:', content.includes('initVol, false') ? 'OK' : 'MISSING');
console.log('  isTrusted:', content.includes('e.isTrusted') ? 'OK' : 'MISSING');
console.log('  chao DOM safe:', content.includes('AN TOAN') || content.includes('AN TO\u00c0N') ? 'OK' : 'MISSING');
console.log('  Length diff:', content.length - orig.length, 'chars');

fs.writeFileSync(filePath, content, 'utf8');
console.log('[OK] File saved.');
