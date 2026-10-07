const baseUrl = "./";
const ALLOW_UUID = "5eef5ca7-8cd2-4886-a092-c4de98ba4839";
const mediaList = [];
// 存放所有唯一分类label，用于下拉选项
const categoryList = [];
let galleryGrid, assetCountEl, remindToast, colSelect;
let searchInput, categorySelect;
let timer = null;
const STORAGE_KEY = "gallery_column_mode";

// 新增：设置grid列数
function setGridColumns(mode) {
  if (!galleryGrid) return;
  if (mode === "auto") {
    galleryGrid.style.gridTemplateColumns =
      "repeat(auto-fill, minmax(380px, 1fr))";
  } else {
    const num = parseInt(mode);
    galleryGrid.style.gridTemplateColumns = `repeat(${num}, minmax(0,1fr))`;
  }
}

// 提示弹窗
function showRemind(msg) {
  if (timer) clearTimeout(timer);
  remindToast.innerText = msg;
  remindToast.classList.add("show");
  timer = setTimeout(() => {
    remindToast.classList.remove("show");
  }, 3000);
}

// 图片转base64
function getBase64FromImageDom(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

// 复制函数 handleCopy
const handleCopy = async (item, type) => {
  try {
    const url = getMediaUrl(item);
    console.log("复制的目标地址：", url);
    if (!url) {
      showRemind("获取地址失败");
      return;
    }
    if (type === "url") {
      await navigator.clipboard.writeText(url);
      showRemind("链接已复制");
      return;
    }
    if (type === "img") {
      // 方案：canvas方式，支持http局域网
      const img = new Image();
      // 允许跨域读取canvas像素
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        try {
          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          showRemind("图片已复制到剪贴板");
        } catch (e) {
          console.error(e);
          showRemind("复制失败");
        }
      }, "image/png");
    }
  } catch (err) {
    console.error("copy error:", err);
    // 区分提示
    if (err.message.includes("CORS")) {
      showRemind("复制失败：图片跨域，缺少CORS配置");
    } else if (err.message.includes("ClipboardItem")) {
      showRemind("复制失败：浏览器不支持图片复制");
    } else if (err.name === "NotAllowedError") {
      showRemind("复制失败：安全限制，请使用https/localhost，并且点击触发");
    } else {
      showRemind("复制失败：" + err.message);
    }
  }
};

// 拼接媒体地址
const getMediaUrl = (item) => {
  const path = item.src;
  if (!path) return "";
  return `${baseUrl}${item.folderRelPath}/${path}`;
};

// ========== 过滤函数：搜索 + 分类，双重条件叠加 ==========
function filterMediaList() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedCat = categorySelect.value;

  const filtered = mediaList.filter((m) => {
    // 条件1：分类筛选，选中空=全部
    const catMatch = !selectedCat || m.categoryName === selectedCat;

    // 条件2：搜索关键词，同时匹配 code / name / tags，任意命中即true
    let keywordMatch = true;
    if (keyword) {
      let tagStr = "";
      if (Array.isArray(m.tags)) {
        tagStr = m.tags.join(",").toLowerCase();
      } else if (typeof m.tags === "string") {
        tagStr = m.tags.toLowerCase();
      }
      const codeMatch = m.fullAssetCode.toLowerCase().includes(keyword);
      const nameMatch = m.name.toLowerCase().includes(keyword);
      const tagMatch = tagStr.includes(keyword);
      keywordMatch = codeMatch || nameMatch || tagMatch;
    }
    return catMatch && keywordMatch;
  });
  renderList(filtered);
}

// 渲染卡片
function renderList(list) {
  galleryGrid.innerHTML = "";
  const reversed = [...list].reverse();
  assetCountEl.textContent = `${reversed.length} ASSETS LOADED`;
  reversed.forEach((m) => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.innerHTML = `
      <div class="image-wrapper">
        <div class="card-top-badge">
          <span class="code-label">${m.fullAssetCode}</span>
        </div>
        <div class="card-bottom-badge">
          <span class="cat-label">${m.categoryName}</span>
        </div>
        <img src="${getMediaUrl(m)}" alt="${m.name}" class="media-element">
        <div class="scan-line-card"></div>
        <div class="card-overlay">
          <span class="view-details">
         <h3>${m.name}</h3>
         <p>${m.desc ?? ""}</p>
          </span>
        </div>
        <div class="image-button">
          <span onclick='handleCopy(${JSON.stringify(m).replaceAll("'", "\\'")},"img")'>Image</span> /
          <span onclick='handleCopy(${JSON.stringify(m).replaceAll("'", "\\'")},"url")'>Url</span>
        </div>
      </div>
      <div class="card-meta">
        <span class="asset-name">${m.name}</span>
        <div class="meta-bottom">
          <span class="asset-uuid">${m.uuid ?? ""}</span>
          <span class="action-hint"></span>
        </div>
      </div>
    `;
    galleryGrid.appendChild(card);
  });
}

// ========= 递归读取meta.json，读取本级code =========
async function loadCategoryTree(folderRelPath) {
  const metaUrl = `${folderRelPath}/meta.json`;
  const resMeta = await fetch(metaUrl);
  const meta = await resMeta.json();
  const node = {
    name: meta.name,
    code: meta.code,
    label: meta.label,
    desc: meta.desc ?? "",
    folders: Array.isArray(meta.folders) ? meta.folders : [],
    files: Array.isArray(meta.files) ? meta.files : [],
    folderRelPath: folderRelPath,
    children: [],
  };
  for (const subFolderName of node.folders) {
    const subFolderPath = `${folderRelPath}/${subFolderName}`;
    const childNode = await loadCategoryTree(subFolderPath);
    node.children.push(childNode);
  }
  return node;
}

// 遍历树，JS内存拼接编码链，组装fullAssetCode，收集所有分类label
function walkTree(node, parentCodeChain, outputList) {
  const currentCodeChain = parentCodeChain ? `${parentCodeChain}${node.code}` : node.code;
  if (Array.isArray(node.files) && node.files.length > 0) {
    for (const fileObj of node.files) {
      const fullAssetCode = `${currentCodeChain}${fileObj.code}`;
      outputList.push({
        ...fileObj,
        folderRelPath: node.folderRelPath,
        categoryName: node.label,
        fullAssetCode: fullAssetCode,
      });
      // 收集唯一分类，用于下拉选项
      if (!categoryList.includes(node.label)) {
        categoryList.push(node.label);
      }
    }
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      walkTree(child, currentCodeChain, outputList);
    }
  }
}

// 填充分类下拉选项
function fillCategorySelect() {
  categoryList.forEach(label => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    categorySelect.appendChild(opt);
  })
}

// 入口函数
async function getMedias() {
  try {
    const rootTree = await loadCategoryTree("images");
    const tempList = [];
    walkTree(rootTree, "", tempList);
    mediaList.length = 0;
    mediaList.push(...tempList);
    fillCategorySelect();
    renderList(mediaList);
  } catch (err) {
    console.error("加载图库失败：", err);
    showRemind("图库加载失败，请检查meta.json文件");
  }
}

// DOM加载完成初始化
window.addEventListener("DOMContentLoaded", () => {
  galleryGrid = document.getElementById("galleryGrid");
  assetCountEl = document.getElementById("assetCount");
  remindToast = document.getElementById("remindToast");
  colSelect = document.getElementById("colSelect");
  searchInput = document.getElementById("searchInput");
  categorySelect = document.getElementById("categorySelect");

  // 读取本地存储列数
  const savedCol = localStorage.getItem(STORAGE_KEY) ?? "auto";
  colSelect.value = savedCol;
  setGridColumns(savedCol);

  // 列数下拉监听
  colSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    localStorage.setItem(STORAGE_KEY, val);
    setGridColumns(val);
  });

  // 搜索输入实时过滤
  searchInput.addEventListener("input", filterMediaList);
  // 分类切换过滤
  categorySelect.addEventListener("change", filterMediaList);

  // 窗口resize防抖
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (colSelect.value === "auto") {
        setGridColumns("auto");
      }
    }, 150);
  });
  getMedias();
});
