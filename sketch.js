/* =========================================================
   GLOBAL NAV SWITCHING + TOOLS TABS + TINY PLAYER
   ========================================================= */

let __toolsInitialized = false;
let __crossStitchInitialized = false;
let __idInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  // Top nav
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const views = Array.from(document.querySelectorAll(".view"));
  const leftCol = document.getElementById("leftCol");

  function setActiveView(viewId) {
    navLinks.forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === viewId));
    views.forEach(v => v.classList.toggle("is-active", v.id === viewId));

    if (leftCol) leftCol.style.display = (viewId === "weeklyView") ? "" : "none";

    // When tools become visible, init once + force resize for canvases
    if (viewId === "toolsView") {
      if (!__crossStitchInitialized) {
        initCrossStitch();
        __crossStitchInitialized = true;
      }
      if (!__idInitialized) {
        initIDMe();
        __idInitialized = true;
      }
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  }

  navLinks.forEach(btn => btn.addEventListener("click", () => setActiveView(btn.dataset.view)));

  // Default
  setActiveView("weeklyView");

  // Tiny player always
  initTinyPlayer();
});


/* =========================================================
   GLOBAL TINY PLAYER — DRAG WORKS ON ALL PAGES
   (Weekly / Tools / Info)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const player = document.getElementById("tinyPlayer");
  const header = player?.querySelector(".tiny-header");

  if (!player || !header) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  // Force player above EVERYTHING
  player.style.position = "fixed";
  player.style.zIndex = "99999";
  player.style.pointerEvents = "auto";

  // Start drag
  header.addEventListener("mousedown", (e) => {
    isDragging = true;

    const rect = player.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    document.body.style.userSelect = "none";
  });

  // Drag move (IMPORTANT: document-level)
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    player.style.left = `${startLeft + dx}px`;
    player.style.top = `${startTop + dy}px`;
  });

  // End drag
  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });
});



/* =========================================================
   CROSS STITCH
   ========================================================= */
function initCrossStitch() {
  const input = document.getElementById("imgInput");
  const density = document.getElementById("density");
  const threshold = document.getElementById("threshold");
  const gridLines = document.getElementById("gridLines");
  const exportSize = document.getElementById("exportSize");
  const exportBtn = document.getElementById("exportBtn");

  const previewCanvas = document.getElementById("previewCanvas");
  const stitchCanvas = document.getElementById("stitchCanvas");
  const cherub = document.querySelector("#crossStitchTool .cherub");

  if (!input || !density || !threshold || !gridLines || !previewCanvas || !stitchCanvas) return;

  const pctx = previewCanvas.getContext("2d");
  const sctx = stitchCanvas.getContext("2d");

  let img = null;

  function resize() {
    const pFrame = previewCanvas.parentElement;
    const sFrame = stitchCanvas.parentElement;

    previewCanvas.width = Math.max(1, pFrame.clientWidth);
    previewCanvas.height = Math.max(1, pFrame.clientHeight);

    stitchCanvas.width = Math.max(1, sFrame.clientWidth);
    stitchCanvas.height = Math.max(1, sFrame.clientHeight);

    if (img) {
      drawPreview();
      drawStitch();
    }
  }

  window.addEventListener("resize", resize);
  resize();

  input.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const image = new Image();
    image.onload = () => {
      img = image;
      if (cherub) cherub.style.display = "none";
      resize();
    };
    image.src = URL.createObjectURL(file);
  });

  function drawPreview() {
    pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const scale = Math.min(previewCanvas.width / img.width, previewCanvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (previewCanvas.width - w) / 2;
    const y = (previewCanvas.height - h) / 2;

    pctx.drawImage(img, x, y, w, h);
  }

  function drawStitch() {
    if (!img) return;

    sctx.clearRect(0, 0, stitchCanvas.width, stitchCanvas.height);

    const cell =
      density.value === "fine" ? 6 :
      density.value === "chunky" ? 16 : 10;

    const cols = Math.max(1, Math.floor(stitchCanvas.width / cell));
    const rows = Math.max(1, Math.floor(stitchCanvas.height / cell));

    const temp = document.createElement("canvas");
    temp.width = cols;
    temp.height = rows;
    const tctx = temp.getContext("2d");

    // fill grid
    tctx.drawImage(img, 0, 0, cols, rows);
    const data = tctx.getImageData(0, 0, cols, rows).data;

    const thr = Number(threshold.value);
    const showGrid = gridLines.value === "on";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const b = (data[i] + data[i + 1] + data[i + 2]) / 3;

        sctx.fillStyle = (b < thr) ? "#222" : "#fff";
        sctx.fillRect(x * cell, y * cell, cell, cell);

        if (showGrid) {
          sctx.strokeStyle = "#ddd";
          sctx.strokeRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }

  density.addEventListener("change", drawStitch);
  threshold.addEventListener("input", drawStitch);
  gridLines.addEventListener("change", drawStitch);

  // Export (simple: export stitch canvas with watermark text)
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!img) return;

      const size = Number(exportSize?.value || 1600);
      const out = document.createElement("canvas");
      out.width = size;
      out.height = size;
      const octx = out.getContext("2d");

      // scale current stitch output into export
      octx.fillStyle = "#fff";
      octx.fillRect(0, 0, size, size);
      octx.drawImage(stitchCanvas, 0, 0, size, size);

      // watermark
      octx.font = "14px ui-monospace, Menlo, Monaco, monospace";
      octx.fillStyle = "rgba(0,0,0,.55)";
      octx.fillText("weeklywonder.org", 16, size - 18);

      const a = document.createElement("a");
      a.download = "weeklywonder-crossstitch.png";
      a.href = out.toDataURL("image/png");
      a.click();
    });
  }
}
