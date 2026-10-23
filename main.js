const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const app = express();
const PORT = 3331;
const IMG_ROOT = path.join(__dirname, 'images');
const DIR_ORIGIN = path.join(IMG_ROOT, 'origin');
const DIR_MID = path.join(IMG_ROOT, 'mid');
const DIR_THUMB = path.join(IMG_ROOT, 'thumb');
[DIR_ORIGIN, DIR_MID, DIR_THUMB].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
app.use(express.json());
app.use('/images', express.static(IMG_ROOT));
const upload = multer({ storage: multer.memoryStorage() });
const PAINTERS_DIR = path.join(__dirname, 'painters');
let countryMap = new Map();

function refreshCountryMap() {
  countryMap.clear();
  console.log('\n[refreshCountryMap] start');
  if (!fs.existsSync(PAINTERS_DIR)) {
    fs.mkdirSync(PAINTERS_DIR, { recursive: true });
    console.log('[refreshCountryMap] painters目录不存在，自动创建');
  }
  const files = fs.readdirSync(PAINTERS_DIR).filter(f => f.endsWith('.json'));
  console.log('[refreshCountryMap] json文件列表：', files);
  for (const fname of files) {
    const base = fname.replace(/\.json$/i, '');
    const parts = base.split('_');
    if (parts.length < 2) continue;
    const country_numeric = parts[0];
    const country_alpha2 = parts.at(-1);
    const nameParts = parts.slice(1, -1);
    const country_name = nameParts.join('_');
    countryMap.set(country_name, {
      file: fname,
      country_numeric,
      country_alpha2
    });
    console.log('[refreshCountryMap] register:', country_name, ' → ', fname);
  }
  console.log('[refreshCountryMap] done，总数：', countryMap.size, '\n');
}
refreshCountryMap();

function loadAllPainters() {
  const out = [];
  const files = fs.readdirSync(PAINTERS_DIR).filter(f => f.endsWith('.json'));
  for (const fname of files) {
    const fp = path.join(PAINTERS_DIR, fname);
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) out.push(...arr);
    } catch (e) {
      console.warn('[WARN] 读取失败：', fname, e.message);
    }
  }
  return out;
}

function findPainterByCode(unique_code) {
  const files = fs.readdirSync(PAINTERS_DIR).filter(f => f.endsWith('.json'));
  for (const fname of files) {
    const fp = path.join(PAINTERS_DIR, fname);
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) continue;
      const idx = list.findIndex(item => item.unique_code === unique_code);
      if (idx !== -1) {
        return { fp, list, idx, item: list[idx] };
      }
    } catch (e) {
      console.warn('[WARN] findPainter 读取失败', fname, e.message);
    }
  }
  return null;
}

app.get('/api/painters', (req, res) => {
  console.log('[GET /api/painters]');
  try {
    const data = loadAllPainters();
    console.log('[GET /api/painters] 返回条数：', data.length);
    res.json(data);
  } catch (err) {
    console.error('[ERR /api/painters]', err);
    res.status(500).json({ ok: false, msg: '读取失败', err: err.message });
  }
});

app.get('/api/countries', (req, res) => {
  console.log('[GET /api/countries]');
  const list = Array.from(countryMap.entries()).map(([name, meta]) => ({
    country_name: name,
    country_numeric: meta.country_numeric,
    country_alpha2: meta.country_alpha2
  }));
  console.log('[GET /api/countries] 返回列表：', list);
  res.json(list);
});

app.post('/api/addpainter', (req, res) => {
  console.log('\n===== POST /api/addpainter =====');
  try {
    const body = req.body;
    console.log('[BODY]', JSON.stringify(body));
    const { country_name, cn_name, en_name, birth_8, desc } = body;
    if (!country_name || !cn_name || !en_name || !birth_8 || !desc) {
      console.log('[校验失败：参数不全]');
      return res.status(400).json({ ok: false, msg: '参数不全' });
    }
    if (!/^\d{8}$/.test(birth_8)) {
      console.log('[校验失败：birth_8不是8位数字 ->', birth_8);
      return res.status(400).json({ ok: false, msg: 'birth_8 必须8位数字' });
    }
    const meta = countryMap.get(country_name);
    if (!meta) {
      console.log('[ERROR：找不到国家！country_name=', country_name, ' keys=', Array.from(countryMap.keys()));
      return res.status(404).json({ ok: false, msg: '找不到该国家' });
    }
    const fp = path.join(PAINTERS_DIR, meta.file);
    console.log('[目标文件]', fp);
    let list = [];
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
      console.log('[原有条数]', list.length);
    } catch (e) {
      list = [];
      console.log('[文件不存在/异常，新建数组', e.message);
    }
    const prefix = meta.country_numeric + birth_8;
    console.log('[prefix]', prefix);
    let maxSeq = -1;
    for (const item of list) {
      if (item.unique_code.startsWith(prefix)) {
        const s = item.unique_code.slice(prefix.length);
        const n = parseInt(s, 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    console.log('[maxSeq]', maxSeq);
    const newSeq = maxSeq + 1;
    const seqStr = String(newSeq).padStart(2, '0');
    const unique_code = prefix + seqStr;
    console.log('[生成 unique_code]', unique_code);
    if (list.some(x => x.unique_code === unique_code)) {
      return res.status(400).json({ ok: false, msg: 'unique_code 重复' });
    }
    const newItem = {
      unique_code,
      country_numeric: meta.country_numeric,
      country_alpha2: meta.country_alpha2,
      country_name,
      cn_name,
      en_name,
      birth_8,
      desc
    };
    list.push(newItem);
    fs.writeFileSync(fp, JSON.stringify(list, null, 2), 'utf8');
    console.log('[写入成功]', newItem);
    refreshCountryMap();
    res.json({ ok: true, msg: '新增成功', data: newItem });
  } catch (err) {
    console.error('[EXCEPTION addpainter]', err);
    res.status(500).json({ ok: false, msg: '服务异常', error: err.stack });
  }
});

app.put('/api/putpainter', async (req, res) => {
  console.log('\n===== PUT /api/putpainter =====');
  try {
    const body = req.body;
    console.log('[BODY]', JSON.stringify(body));
    const { unique_code, cn_name, en_name, birth_8, desc } = body;
    if (!unique_code) {
      return res.status(400).json({ ok: false, msg: '缺少 unique_code' });
    }
    const found = findPainterByCode(unique_code);
    if (!found) {
      console.log('[找不到该条目', unique_code);
      return res.status(404).json({ ok: false, msg: '找不到该条目' });
    }
    const { fp, list, idx, item } = found;
    const oldBirth = item.birth_8;
    // 先更新普通字段
    list[idx].cn_name = cn_name ?? list[idx].cn_name;
    list[idx].en_name = en_name ?? list[idx].en_name;
    list[idx].desc = desc ?? list[idx].desc;

    // ✅ 判断生日是否变更：需要重新生成 unique_code + 重命名图片
    if (birth_8 && birth_8 !== oldBirth) {
      if (!/^\d{8}$/.test(birth_8)) {
        return res.status(400).json({ ok: false, msg: 'birth_8 必须8位数字' });
      }
      const countryNumeric = item.country_numeric;
      const prefix = countryNumeric + birth_8;
      console.log('[生日变更，新prefix]', prefix);

      // 在同国家文件内，扫描同前缀最大序号
      let maxSeq = -1;
      for (const it of list) {
        if (it.unique_code.startsWith(prefix)) {
          const s = it.unique_code.slice(prefix.length);
          const n = parseInt(s, 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      }
      const newSeq = maxSeq + 1;
      const seqStr = String(newSeq).padStart(2, '0');
      const newUniqueCode = prefix + seqStr;
      console.log('[生成新unique_code]', newUniqueCode);

      // 图片路径
      const ext = '.webp';
      const oldOrigin = path.join(DIR_ORIGIN, unique_code + ext);
      const oldMid = path.join(DIR_MID, unique_code + ext);
      const oldThumb = path.join(DIR_THUMB, unique_code + ext);
      const newOrigin = path.join(DIR_ORIGIN, newUniqueCode + ext);
      const newMid = path.join(DIR_MID, newUniqueCode + ext);
      const newThumb = path.join(DIR_THUMB, newUniqueCode + ext);

      // 重命名图片，存在才改名（防止没有上传图片时报错）
      if (fs.existsSync(oldOrigin)) fs.renameSync(oldOrigin, newOrigin);
      if (fs.existsSync(oldMid)) fs.renameSync(oldMid, newMid);
      if (fs.existsSync(oldThumb)) fs.renameSync(oldThumb, newThumb);

      // 更新条目
      list[idx].unique_code = newUniqueCode;
      list[idx].birth_8 = birth_8;
      console.log('[✅ 图片重命名完成，编号更新完成');
    } else {
      // 生日没变，只更新 birth_8 字段（兜底）
      if (birth_8) list[idx].birth_8 = birth_8;
    }

    fs.writeFileSync(fp, JSON.stringify(list, null, 2), 'utf8');
    console.log('[更新成功]', list[idx]);
    res.json({ ok: true, msg: '编辑成功', data: list[idx] });
  } catch (err) {
    console.error('[EXCEPTION putpainter]', err);
    res.status(500).json({ ok: false, msg: '编辑失败', error: err.stack });
  }
});


app.delete('/api/delpainter', (req, res) => {
  console.log('\n===== DELETE /api/delpainter =====');
  try {
    const body = req.body;
    console.log('[BODY]', JSON.stringify(body));
    const { unique_code } = body;
    if (!unique_code) {
      return res.status(400).json({ ok: false, msg: '缺少 unique_code' });
    }
    const found = findPainterByCode(unique_code);
    if (!found) {
      console.log('[找不到条目]', unique_code);
      return res.status(404).json({ ok: false, msg: '找不到该条目' });
    }
    const { fp, list, idx, item } = found;
    list.splice(idx, 1);
    fs.writeFileSync(fp, JSON.stringify(list, null, 2), 'utf8');

    // ✅ 删除对应三张图片
    const ext = '.webp';
    const fOrigin = path.join(DIR_ORIGIN, unique_code + ext);
    const fMid = path.join(DIR_MID, unique_code + ext);
    const fThumb = path.join(DIR_THUMB, unique_code + ext);
    if (fs.existsSync(fOrigin)) fs.unlinkSync(fOrigin);
    if (fs.existsSync(fMid)) fs.unlinkSync(fMid);
    if (fs.existsSync(fThumb)) fs.unlinkSync(fThumb);

    console.log('[删除成功]', item);
    res.json({ ok: true, msg: '删除成功', deleted: item });
  } catch (err) {
    console.error('[EXCEPTION delpainter]', err);
    res.status(500).json({ ok: false, msg: '删除失败', error: err.stack });
  }
});


app.post('/api/upload', upload.single('img'), async (req, res) => {
  console.log('\n===== POST /api/upload =====');
  try {
    const { unique_code } = req.body;
    console.log('[unique_code]', unique_code, ' has file:', !!req.file);
    if (!unique_code || !req.file) {
      console.log('缺少图片或者unique_code');
      return res.status(400).json({ ok: false, msg: '缺少图片或unique_code' });
    }
    const buf = req.file.buffer;
    const ext = '.webp';
    const pathOrigin = path.join(DIR_ORIGIN, unique_code + ext);
    const pathMid = path.join(DIR_MID, unique_code + ext);
    const pathThumb = path.join(DIR_THUMB, unique_code + ext);
    await sharp(buf).toFile(pathOrigin);
    await sharp(buf).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).toFile(pathMid);
    await sharp(buf).resize(400, 400, { fit: 'cover' }).toFile(pathThumb);
    console.log('图片处理完成');
    res.json({ ok: true, unique_code });
  } catch (e) {
    console.error('[UPLOAD ERROR]', e);
    res.status(500).json({ ok: false, msg: '图片处理失败', err: e.stack });
  }
});

app.get('/', (req, res) => {
  console.log('[GET / 首页访问]');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ 服务启动：http://127.0.0.1:${PORT}`);
  refreshCountryMap();
});
