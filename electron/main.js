/**
 * ArtStyle · Electron 主进程入口
 *
 * - 启动内置 Express 服务（复用项目根目录 main.js）
 * - 创建桌面窗口加载本地服务
 * - 打包后自动把可写数据（painters/ images/）重定向到用户数据目录，
 *   并在首次运行时从 asar 复制种子数据，保证数据可读写
 * - 端口 3331 被占用时自动顺延到空闲端口
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { app, BrowserWindow } = require('electron');

const APP_ROOT = path.join(__dirname, '..');
const PORT = 3331;

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}

function isEmptyDir(p) {
  try {
    return fs.readdirSync(p).length === 0;
  } catch {
    return true;
  }
}

/**
 * 打包后：可写数据放到 userData/data，首次运行复制种子数据。
 * 开发模式（electron .）：不设置环境变量，直接读写项目目录，与 node main.js 一致。
 */
function prepareDataDir() {
  if (!app.isPackaged) return;
  const dataRoot = path.join(app.getPath('userData'), 'data');
  ['painters', 'images/origin', 'images/mid', 'images/thumb'].forEach(d =>
    fs.mkdirSync(path.join(dataRoot, d), { recursive: true })
  );
  try {
    const srcPainters = path.join(APP_ROOT, 'painters');
    if (fs.existsSync(srcPainters) && isEmptyDir(path.join(dataRoot, 'painters'))) {
      copyDir(srcPainters, path.join(dataRoot, 'painters'));
      console.log('[ArtStyle] 已复制 painters 种子数据 ->', dataRoot);
    }
    const srcImages = path.join(APP_ROOT, 'images');
    const imgSeed = ['origin', 'mid', 'thumb'].every(s => isEmptyDir(path.join(dataRoot, 'images', s)));
    if (fs.existsSync(srcImages) && imgSeed) {
      copyDir(srcImages, path.join(dataRoot, 'images'));
      console.log('[ArtStyle] 已复制 images 种子数据 ->', dataRoot);
    }
  } catch (e) {
    console.warn('[ArtStyle] 种子数据复制失败:', e.message);
  }
  process.env.ARTSTYLE_DATA_DIR = dataRoot;
}

/** 寻找空闲端口：首选端口被占用时自动分配随机端口 */
function getFreePort(preferred) {
  return new Promise(resolve => {
    const tryPort = p => {
      const srv = net.createServer();
      srv.once('error', () => resolve(0));
      srv.listen(p, '127.0.0.1', () => {
        const used = srv.address().port;
        srv.close(() => resolve(used));
      });
    };
    tryPort(preferred);
  });
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'ArtStyle · Lehuye Artist List',
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  win.loadURL(url);
  return win;
}

app.whenReady().then(async () => {
  prepareDataDir();
  const port = await getFreePort(PORT);
  if (!port) {
    console.error('[ArtStyle] 无法获取空闲端口，服务启动失败');
    app.quit();
    return;
  }
  process.env.ARTSTYLE_PORT = String(port);
  // 启动内置 Express 服务（main.js 在被 require 时即开始监听）
  require(path.join(APP_ROOT, 'main.js'));
  createWindow(`http://127.0.0.1:${port}`);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(`http://127.0.0.1:${port}`);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
