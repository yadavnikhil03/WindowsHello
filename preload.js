const { contextBridge, ipcRenderer } = require('electron');
const OK = ['state','face:get','face:save','face:clear','pass:set','pass:check','set','log','unlock','lockNow','quit','pass:toggle','pass:delete','notify','sc:set','apps:running'];
contextBridge.exposeInMainWorld('G', { inv: (c, a) => OK.includes(c) ? ipcRenderer.invoke(c, a) : null });