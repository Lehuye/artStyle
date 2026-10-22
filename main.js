const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = 3331;

// 三级目录
const IMG_ROOT = path.join(__dirname, 'images');
const DIR_ORIGIN = path.join(IMG_ROOT, 'origin');
const DIR_MID = path.join(IMG_ROOT, 'mid');
const DIR_THUMB = path.join(IMG_ROOT, 'thumb');
[DIR_ORIGIN, DIR_MID, DIR_THUMB].forEach(d=>{
  if(!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true});
})

// 静态托管
app.use('/images', express.static(IMG_ROOT));
app.use(express.json());

function loadAllPainters() {
  const dir = path.join(__dirname, 'painters');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let painters_data = [];
  for (const fname of files) {
    const fp = path.join(dir, fname);
    const buf = fs.readFileSync(fp, 'utf8');
    const arr = JSON.parse(buf);
    if (Array.isArray(arr)) painters_data = painters_data.concat(arr);
  }
  return painters_data;
}

app.get('/api/painters', (req, res) => {
  res.json(loadAllPainters());
});

const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload', upload.single('imgfile'), async (req, res) => {
  try {
    const { unique_code } = req.body;
    if (!unique_code) return res.status(400).json({ ok:false, msg:'缺少unique_code' });
    if (!req.file) return res.status(400).json({ ok:false, msg:'无图片文件' });

    const baseName = `${unique_code}.webp`;
    const pathOrigin = path.join(DIR_ORIGIN, baseName);
    const pathMid = path.join(DIR_MID, baseName);
    const pathThumb = path.join(DIR_THUMB, baseName);

    // 1、origin：仅转webp，不缩放裁切，保留原图尺寸
    await sharp(req.file.buffer)
      .webp({ quality: 90 })
      .toFile(pathOrigin);

    // 2、mid：1280×1280 居中裁切正方形
    await sharp(req.file.buffer)
      .resize(1280,1280, {fit:'cover', position:'center'})
      .webp({ quality:85 })
      .toFile(pathMid);

    // 3、thumb：240×240 居中裁切正方形
    await sharp(req.file.buffer)
      .resize(240,240, {fit:'cover', position:'center'})
      .webp({ quality:80 })
      .toFile(pathThumb);

    res.json({
      ok:true,
      urls:{
        origin: `/images/origin/${baseName}`,
        mid: `/images/mid/${baseName}`,
        thumb: `/images/thumb/${baseName}`
      }
    })
  } catch(err){
    console.error(err);
    res.status(500).json({ok:false, msg:'图片处理失败'});
  }
})

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));

app.listen(PORT, ()=>{
  console.log(`✅ http://127.0.0.1:${PORT}`)
})
