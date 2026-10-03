const { app, BrowserWindow, Tray, Menu, ipcMain, safeStorage, powerMonitor, session, Notification, globalShortcut } = require('electron');
const fs = require('fs'), path = require('path'), cr = require('crypto');
app.setAppUserModelId('com.Nikhil.windowshello');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => showPanel());
const F = () => path.join(app.getPath('userData'), 'windowshello.json');
let db = { face: null, pass: null, hist: [], set: { thr: 0.5, anim: 'random', tr: 0.55, sc: 'Control+Alt+Shift+L', wake: true, auto: true, pwOn: true, c1: '#ffffff', c2: '#7dd3fc', ang: 135 } };
let lockW, panW, ok = false, tray;
try { const r = JSON.parse(fs.readFileSync(F())); db = { ...db, ...r, set: { ...db.set, ...r.set } }; } catch {}
const save = () => fs.writeFileSync(F(), JSON.stringify(db));
const hash = (p, s) => cr.scryptSync(p, s, 32).toString('hex');

const ver = p => !!db.pass && cr.timingSafeEqual(Buffer.from(hash(String(p), db.pass.s)), Buffer.from(db.pass.h));
function win(mode) {
  const l = mode === 'lock';
  const w = new BrowserWindow({ show: false, fullscreen: l, kiosk: l, frame: !l, alwaysOnTop: l, skipTaskbar: l,
    width: 1280, height: 800, autoHideMenuBar: true, backgroundColor: '#ffffff',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), webSecurity: false } });
  
  w.loadFile('app.html', { query: { mode } });
  
  w.once('ready-to-show', () => {
    if (l) w.setAlwaysOnTop(true, 'screen-saver');
    if (!l) w.maximize();
    w.show();
  });
  return w;
}
function showLock() {
  if (lockW || !(db.pass || db.face)) return;
  ok = false; lockW = win('lock');
  lockW.on('close', e => { if (!ok) e.preventDefault(); });
  const tm = setInterval(() => { if (lockW) { lockW.setAlwaysOnTop(true, 'screen-saver'); lockW.moveTop(); } }, 1000);
  try { globalShortcut.register(db.set.sc, () => H.unlock()); } catch {}
  lockW.on('closed', () => { lockW = null; clearInterval(tm); globalShortcut.unregisterAll(); });
}
function showPanel() { if (panW) { panW.show(); return; } panW = win('panel'); panW.on('closed', () => panW = null); }

const H = {
  state: () => ({ enrolled: !!db.face, hasPass: !!db.pass, pwOn: !!db.pass && db.set.pwOn !== false, set: db.set }),
  'face:get': () => db.face ? JSON.parse(safeStorage.decryptString(Buffer.from(db.face, 'base64'))) : [],
  'face:save': a => { db.face = safeStorage.encryptString(JSON.stringify(a)).toString('base64'); save(); },
  'face:clear': () => { db.face = null; if (db.pass) db.set.pwOn = true; save(); },
  'pass:set': ({ cur, p }) => { if (db.pass && !ver(cur)) return { err: 'pw' };
    const s = cr.randomBytes(16).toString('hex'); db.pass = { s, h: hash(String(p), s) }; db.set.pwOn = true; save(); return {}; },
  'pass:toggle': ({ cur, on }) => { if (!ver(cur)) return { err: 'pw' }; if (!on && !db.face) return { err: 'face' }; db.set.pwOn = !!on; save(); return {}; },
  'pass:delete': ({ cur }) => { if (!ver(cur)) return { err: 'pw' }; if (!db.face) return { err: 'face' }; db.pass = null; save(); return {}; },
  'sc:set': ({ cur, sc }) => { if (db.pass && !ver(cur)) return { err: 'pw' };
    if (['Control+C', 'Control+V', 'Control+X', 'Control+Z', 'Control+A', 'Alt+F4'].includes(sc)) return { err: 'bad' };
    try { if (!globalShortcut.register(sc, () => {})) return { err: 'bad' }; globalShortcut.unregister(sc); } catch { return { err: 'bad' }; }
    db.set.sc = sc; save(); return {}; },
  notify: o => { if (Notification.isSupported()) new Notification(o).show(); },
  'pass:check': p => db.set.pwOn !== false && ver(p),
  set: o => { db.set = { ...db.set, ...o }; app.setLoginItemSettings({ openAtLogin: db.set.auto, args: ['--hidden'] }); save(); },
  unlock: () => { ok = true; lockW && lockW.close(); },
  lockNow: showLock,
  quit: () => { ok = true; app.exit(); }
};
Object.keys(H).forEach(k => ipcMain.handle(k, (_, a) => H[k](a)));

app.whenReady().then(() => {
  if (process.argv.includes('--migrate')) {
    if (db.dly === 1 || db.dly === 2) {
      try { require('child_process').execFileSync('reg', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize', '/v', 'StartupDelayInMSec', '/f']); } catch (e) {}
      db.dly = 3; save();
    }
    app.quit();
    return;
  }
  
  session.defaultSession.setPermissionRequestHandler((_, p, cb) => cb(p === 'media'));
  if (process.argv.includes('--hidden')) {
    if (db.pass || db.face) showLock();
  } else {
    showPanel();
  }
  app.setLoginItemSettings({ openAtLogin: db.set.auto, args: ['--hidden'] });
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(fs.existsSync(iconPath) ? iconPath : require('electron').nativeImage.createEmpty());
  tray.setToolTip('WindowsHello · by Nikhil');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'WindowsHello · by Nikhil', enabled: false }, { type: 'separator' }, { label: 'Control Panel', click: showPanel }, { label: 'Lock now', click: showLock }, { label: 'Quit', click: H.quit }]));
  tray.on('click', showPanel);
  powerMonitor.on('unlock-screen', showLock);
  powerMonitor.on('resume', () => { if (db.set.wake !== false) setTimeout(showLock, 800); });
});
app.on('window-all-closed', e => e.preventDefault())

