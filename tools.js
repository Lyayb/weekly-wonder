document.addEventListener("DOMContentLoaded", () => {
  initToolTabs();
  initTinyPlayerDrag();
  initCrossStitch();
  initIDTool();
  initASCIITool();
});

/* -------------------------
   Tool tab switching
------------------------- */
function initToolTabs() {
  const views = Array.from(document.querySelectorAll(".tool-view"));
  if (!views.length) return;

  function activate(id) {
    views.forEach(v => v.classList.toggle("is-active", v.id === id));

    // important for canvases - trigger resize after tab switch
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      // Double-trigger to ensure canvases are properly sized
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    });
  }

  // Handle URL hash to switch tools on page load
  function handleHash() {
    const hash = window.location.hash.slice(1); // Remove #
    if (hash === "crossStitch") {
      activate("crossStitchTool");
    } else if (hash === "ascii") {
      activate("asciiTool");
    } else if (hash === "idMe") {
      activate("idTool");
    } else {
      activate("crossStitchTool"); // Default
    }
  }

  // Listen for hash changes
  window.addEventListener("hashchange", handleHash);

  // Check hash on page load
  handleHash();
}

/* -------------------------
   Tiny player drag (TOOLS page)
------------------------- */
function initTinyPlayerDrag() {
  const player = document.getElementById("tinyPlayer");
  const header = document.getElementById("tinyHeader");
  if (!player || !header) return;

  player.style.position = "fixed";
  player.style.zIndex = "2147483647";
  player.style.pointerEvents = "auto";

  header.style.cursor = "grab";

  let dragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  const start = (x, y) => {
    dragging = true;
    const rect = player.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    startX = x;
    startY = y;
    document.body.style.userSelect = "none";
  };

  const move = (x, y) => {
    if (!dragging) return;
    player.style.left = `${startLeft + (x - startX)}px`;
    player.style.top  = `${startTop + (y - startY)}px`;
  };

  const end = () => {
    dragging = false;
    document.body.style.userSelect = "";
  };

  header.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
  document.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  document.addEventListener("mouseup", end);

  header.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (t) start(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (t) move(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener("touchend", end);
}

/* =========================================================
   Cross Stitch
========================================================= */
function initCrossStitch() {
  const input = document.getElementById("imgInput");
  const density = document.getElementById("density");
  const threshold = document.getElementById("threshold");
  const gridLines = document.getElementById("gridLines");
  const exportBtn = document.getElementById("exportBtn");
  const exportSize = document.getElementById("exportSize");

  const previewCanvas = document.getElementById("previewCanvas");
  const stitchCanvas = document.getElementById("stitchCanvas");
  const cherub = document.querySelector("#crossStitchTool .cherub");

  if (!input || !previewCanvas || !stitchCanvas) return;

  const pctx = previewCanvas.getContext("2d");
  const sctx = stitchCanvas.getContext("2d");
  let img = null;

  function fitCanvas(canvas) {
    const frame = canvas.parentElement;
    const w = Math.max(1, frame.clientWidth);
    const h = Math.max(1, frame.clientHeight);
    canvas.width = w;
    canvas.height = h;
  }

  function resizeAll() {
    fitCanvas(previewCanvas);
    fitCanvas(stitchCanvas);
    if (img) { drawPreview(); drawStitch(); }
  }

  window.addEventListener("resize", resizeAll);
  resizeAll();

  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const im = new Image();
    im.onload = () => {
      img = im;
      if (cherub) cherub.style.display = "none";
      resizeAll();
    };
    im.src = URL.createObjectURL(file);
  });

  function drawPreview() {
    pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    drawContain(pctx, img, previewCanvas.width, previewCanvas.height);
  }

  function drawStitch() {
    if (!img) return;

    sctx.clearRect(0, 0, stitchCanvas.width, stitchCanvas.height);

    const cell =
      density?.value === "fine" ? 6 :
      density?.value === "chunky" ? 16 : 10;

    const cols = Math.max(1, Math.floor(stitchCanvas.width / cell));
    const rows = Math.max(1, Math.floor(stitchCanvas.height / cell));

    const tmp = document.createElement("canvas");
    tmp.width = cols;
    tmp.height = rows;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(img, 0, 0, cols, rows);

    const data = tctx.getImageData(0, 0, cols, rows).data;
    const th = Number(threshold?.value ?? 140);
    const showGrid = (gridLines?.value ?? "on") === "on";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sctx.fillStyle = b < th ? "#222" : "#fff";
        sctx.fillRect(x * cell, y * cell, cell, cell);
        if (showGrid) {
          sctx.strokeStyle = "#ddd";
          sctx.strokeRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }

  density?.addEventListener("change", () => img && drawStitch());
  threshold?.addEventListener("input", () => img && drawStitch());
  gridLines?.addEventListener("change", () => img && drawStitch());

  exportBtn?.addEventListener("click", () => {
    if (!img) return;

    const size = Number(exportSize?.value || 1600);

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");

    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, size, size);
    octx.drawImage(stitchCanvas, 0, 0, size, size);

    octx.font = "14px ui-monospace, Menlo, Monaco, Consolas, monospace";
    octx.fillStyle = "rgba(0,0,0,.55)";
    octx.fillText("weeklywonder.org", 16, size - 18);

    downloadCanvas(out, "weeklywonder-crossstitch.png");
  });
}

/* =========================================================
   ID Tool
========================================================= */
function initIDTool() {
  const input = document.getElementById("idImgInput");
  const dobInput = document.getElementById("dobInput");
  const generateBtn = document.getElementById("generateID");
  const exportBtn = document.getElementById("exportID");
  const exportSize = document.getElementById("idExportSize");

  const previewCanvas = document.getElementById("idPreviewCanvas");
  const cardCanvas = document.getElementById("idCardCanvas");

  if (!input || !previewCanvas || !cardCanvas || !generateBtn) return;

  const pctx = previewCanvas.getContext("2d", { willReadFrequently: true });
  const cctx = cardCanvas.getContext("2d", { willReadFrequently: true });
  let img = null;

  function fitCanvas(canvas) {
    const frame = canvas.parentElement;
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);

    // Use higher resolution for better quality
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Scale context for high DPI
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    return { width, height };
  }

  // Track if card has been rendered
  let cardRendered = false;

  function resizeAll() {
    fitCanvas(previewCanvas);
    fitCanvas(cardCanvas);
    if (img) {
      drawPreview();
      // Re-render card if it was already rendered
      if (cardRendered) {
        renderCard();
      }
    }
  }

  window.addEventListener("resize", resizeAll);
  resizeAll();

  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const im = new Image();
    im.onload = () => {
      img = im;
      drawPreview();
    };
    im.src = URL.createObjectURL(file);
  });

  function drawPreview() {
    const w = parseInt(previewCanvas.style.width) || previewCanvas.width;
    const h = parseInt(previewCanvas.style.height) || previewCanvas.height;
    pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    drawContain(pctx, img, w, h);
  }

  generateBtn.addEventListener("click", () => {
    if (!img) return;
    renderCard();
  });

  exportBtn?.addEventListener("click", () => {
    if (!img) return;

    const preset = exportSize?.value || "1600";
    const sizes = {
      "1200": 1200,
      "1600": 1600,
      "2000": 2000
    };
    const exportWidth = sizes[preset] || 1600;

    // Portrait orientation - height is 1.33x width (3:4 ratio)
    const exportHeight = Math.floor(exportWidth * 1.33);

    // Create high-resolution export canvas - PORTRAIT
    const out = document.createElement("canvas");
    out.width = exportWidth;
    out.height = exportHeight;
    const octx = out.getContext("2d");

    // Enable high-quality rendering
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';

    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, exportWidth, exportHeight);

    // Re-render ID card at export resolution for maximum quality
    const pad = Math.floor(exportWidth * 0.05);
    const innerW = exportWidth - pad * 2;
    const innerH = exportHeight - pad * 2;

    // Use original image
    const sourceImg = img;

    // Calculate image dimensions - photo takes 60% of height
    const imgAreaH = innerH * 0.6;
    const imgRatio = sourceImg.width / sourceImg.height;
    let imgW = innerW;
    let imgH = imgW / imgRatio;
    if (imgH > imgAreaH) {
      imgH = imgAreaH;
      imgW = imgH * imgRatio;
    }
    const imgX = pad + (innerW - imgW) / 2;
    const imgY = pad;

    // Draw image with high quality
    octx.drawImage(sourceImg, imgX, imgY, imgW, imgH);

    // NO SEPARATOR LINE - removed for passport photo look

    // Title positioned directly below photo
    const titleY = imgY + imgH + pad * 1.2;
    octx.fillStyle = "#000";
    octx.font = `bold ${Math.floor(exportWidth * 0.04)}px ui-monospace, Menlo, Monaco`;
    octx.fillText("WEEKLY WONDER ID", pad, titleY);

    // Info section
    const dob = dobInput?.value || new Date().toISOString().split('T')[0];
    const now = new Date();
    const infoStartY = titleY + pad * 1.5;
    const lineHeight = exportWidth * 0.035;

    octx.font = `${Math.floor(exportWidth * 0.022)}px ui-monospace, Menlo, Monaco`;

    // Left column
    octx.textAlign = "left";
    octx.fillText(`DOB: ${dob}`, pad, infoStartY);
    octx.fillText(`SIGN: ${zodiacSign(new Date(dob))}`, pad, infoStartY + lineHeight);
    octx.fillText(`DATE: ${now.toISOString().split('T')[0]}`, pad, infoStartY + lineHeight * 2);
    octx.fillText(`TIME: ${now.toTimeString().slice(0,8)}`, pad, infoStartY + lineHeight * 3);
    octx.fillText(`REF: ${randBlock(2, 14)}-${randBlock(1, 12)}`, pad, infoStartY + lineHeight * 4);
    octx.fillText(`AID: ${randDigits(12)}`, pad, infoStartY + lineHeight * 5);
    octx.fillText(`CTRL: ${randBlock(1, 6)}-${randBlock(1, 6)}-${randBlock(1, 6)}`, pad, infoStartY + lineHeight * 6);
    octx.fillText(`WEEKLYWONDER.ORG`, pad, infoStartY + lineHeight * 7);

    // Right column
    octx.textAlign = "right";
    const xRight = exportWidth - pad;
    octx.fillText(`K/${randDigits(4)}${randBlock(1, 3).toUpperCase()}${randDigits(6)}`, xRight, infoStartY);
    octx.fillText(`${randDigits(14)}`, xRight, infoStartY + lineHeight);
    octx.fillText(`A${randDigits(13)}`, xRight, infoStartY + lineHeight * 2);
    octx.fillText(`${randDigits(10)}`, xRight, infoStartY + lineHeight * 3);
    octx.fillText(`${randDigits(4)}`, xRight, infoStartY + lineHeight * 4);

    downloadCanvas(out, "weeklywonder-id.png");
  });

  function renderCard() {
    // Use proper dimensions from styled canvas
    const w = parseInt(cardCanvas.style.width) || cardCanvas.width;
    const h = parseInt(cardCanvas.style.height) || cardCanvas.height;

    cctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
    cctx.fillStyle = "#fff";
    cctx.fillRect(0, 0, w, h);

    // Enable high-quality image smoothing
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';

    // Adjust padding based on canvas size (smaller on mobile)
    const pad = Math.max(16, Math.floor(w * 0.04));
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    // Use original image
    const sourceImg = img;

    // Photo takes up 60% of height - LARGER for passport photo look
    const photoH = Math.floor(innerH * 0.6);

    // Draw photo with high quality
    const photoCanvas = document.createElement("canvas");
    photoCanvas.width = innerW;
    photoCanvas.height = photoH;
    const ph = photoCanvas.getContext("2d");
    ph.imageSmoothingEnabled = true;
    ph.imageSmoothingQuality = 'high';
    ph.fillStyle = "#fff";
    ph.fillRect(0, 0, innerW, photoH);
    drawContain(ph, sourceImg, innerW, photoH);
    cctx.drawImage(photoCanvas, pad, pad);

    // NO DIVIDER LINE - removed for passport photo look

    const dobStr = dobInput?.value || "—";
    const sign = dobInput?.value ? zodiacSign(new Date(dobInput.value + "T00:00:00")) : "—";
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const leftLines = [
      `DOB: ${dobStr}`,
      `SIGN: ${sign}`,
      `DATE: ${dateStr}`,
      `TIME: ${timeStr}`,
      `REF: ${randBlock(2, 14)}-${randBlock(1, 12)}`,
      `AID: ${randDigits(12)}`,
      `CTRL: ${randBlock(1, 6)}-${randBlock(1, 6)}-${randBlock(1, 6)}`,
      `WEEKLYWONDER.ORG`,
    ];

    const rightLines = [
      `K/${randDigits(4)}${randBlock(1, 3).toUpperCase()}${randDigits(6)}`,
      `${randDigits(14)}`,
      `A${randDigits(13)}`,
      `${randDigits(10)}`,
      `${randDigits(4)}`,
    ];

    cctx.fillStyle = "#000";
    // Scale font size based on canvas width
    const fontSize = Math.max(10, Math.floor(w * 0.026));
    cctx.font = `${fontSize}px ui-monospace, Menlo, Monaco, Consolas, monospace`;

    // Text starts directly below photo
    const textStartY = pad + photoH + pad * 0.8;
    const textAreaHeight = h - textStartY - pad;
    const lineSpacing = Math.min(18, Math.floor(textAreaHeight / (leftLines.length + 1)));

    // Draw left column
    cctx.textAlign = "left";
    let y = textStartY;
    const xLeft = pad + Math.floor(w * 0.028);
    for (const line of leftLines) {
      cctx.fillText(line, xLeft, y);
      y += lineSpacing;
    }

    // Draw right column (aligned under right side of photo)
    cctx.textAlign = "right";
    let yRight = textStartY;
    const xRight = w - pad - Math.floor(w * 0.028);
    for (const line of rightLines) {
      cctx.fillText(line, xRight, yRight);
      yRight += lineSpacing;
    }

    cardRendered = true;
  }

  // Fix for canvas disappearing on scroll - re-render when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && cardRendered && img) {
        // Re-render card when it comes into view
        setTimeout(() => renderCard(), 50);
      }
    });
  }, { threshold: 0.1 });

  if (cardCanvas) {
    observer.observe(cardCanvas);
  }

  // Also re-render on scroll to prevent disappearing
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (cardRendered && img) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        renderCard();
      }, 100);
    }
  }, { passive: true });
}

/* =========================================================
   ASCII Tool
========================================================= */
function initASCIITool() {
  const imgInput = document.getElementById("asciiImgInput");
  const video = document.getElementById("asciiVideo");
  const inputCanvas = document.getElementById("asciiInputCanvas");
  const outCanvas = document.getElementById("asciiOutCanvas");

  const startWebcamBtn = document.getElementById("startWebcam");
  const stopWebcamBtn = document.getElementById("stopWebcam");
  const captureBtn = document.getElementById("capturePhoto");
  const exportBtn = document.getElementById("exportASCII");

  const scaleSlider = document.getElementById("asciiScale");
  const zoomSlider = document.getElementById("asciiZoom");
  const exportSize = document.getElementById("asciiExportSize");

  if (!inputCanvas || !outCanvas) return;

  const ictx = inputCanvas.getContext("2d", { willReadFrequently: true });
  const octx = outCanvas.getContext("2d");

  const CHARS = "@#W$9876543210?!abc;:+=-,._ ";

  let stream = null;
  let mode = "none"; // "image" | "webcam"
  let rafId = null;
  let lastFrameTime = 0;
  let srcImg = null;

  // Button state management
  function updateButtonStates() {
    if (mode === "webcam") {
      if (startWebcamBtn) startWebcamBtn.disabled = true;
      if (stopWebcamBtn) stopWebcamBtn.disabled = false;
      if (captureBtn) captureBtn.disabled = false;
    } else {
      if (startWebcamBtn) startWebcamBtn.disabled = false;
      if (stopWebcamBtn) stopWebcamBtn.disabled = true;
      if (captureBtn) captureBtn.disabled = true;
    }
  }

  // Initialize button states
  updateButtonStates();

  function fitCanvasToFrame(canvas) {
    const frame = canvas.parentElement;
    const w = Math.max(1, frame.clientWidth);
    const h = Math.max(1, frame.clientHeight);

    // Use device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    // Scale context to account for DPR
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
  }

  function resizeAll() {
    fitCanvasToFrame(inputCanvas);
    fitCanvasToFrame(outCanvas);
    if (mode === "image" && srcImg) {
      drawSourceImage();
      renderASCIIToCanvas();
    }
  }

  window.addEventListener("resize", resizeAll);
  resizeAll();

  function drawContainTo(ctx, img, w, h) {
    // Apply zoom from slider (50-200 = 0.5x to 2x)
    const zoomFactor = Number(zoomSlider?.value || 100) / 100;
    const s = Math.min(w / img.width, h / img.height) * zoomFactor;
    const dw = img.width * s;
    const dh = img.height * s;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawSourceImage() {
    if (!srcImg) return;
    const w = inputCanvas.clientWidth;
    const h = inputCanvas.clientHeight;
    drawContainTo(ictx, srcImg, w, h);
  }

  function drawVideoToInput() {
    if (!video || !video.videoWidth) return false;
    const w = inputCanvas.clientWidth;
    const h = inputCanvas.clientHeight;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Apply zoom from slider (50-200 = 0.5x to 2x)
    const zoomFactor = Number(zoomSlider?.value || 100) / 100;
    const s = Math.min(w / vw, h / vh) * zoomFactor;
    const dw = vw * s;
    const dh = vh * s;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    ictx.clearRect(0, 0, w, h);
    ictx.fillStyle = "#fff";
    ictx.fillRect(0, 0, w, h);
    ictx.drawImage(video, dx, dy, dw, dh);
    return true;
  }

  function renderASCIIToCanvas() {
    const srcW = inputCanvas.clientWidth;
    const srcH = inputCanvas.clientHeight;
    if (srcW <= 0 || srcH <= 0) return;

    const outW = outCanvas.clientWidth;
    const outH = outCanvas.clientHeight;

    // Fixed number of columns for consistent density
    const cols = 80;

    // Calculate rows to fill the output frame height
    const charAspect = 0.5; // monospace character width/height ratio
    const rows = Math.floor((outH / outW) * cols * charAspect);

    const tmp = document.createElement("canvas");
    tmp.width = cols;
    tmp.height = rows;
    const tctx = tmp.getContext("2d", { willReadFrequently: true });

    tctx.drawImage(inputCanvas, 0, 0, srcW, srcH, 0, 0, cols, rows);
    const data = tctx.getImageData(0, 0, cols, rows).data;

    octx.clearRect(0, 0, outW, outH);
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, outW, outH);

    // Use slider to control character spacing (40-160 range maps to spacing multiplier)
    const spacingFactor = Number(scaleSlider?.value || 80) / 80; // 0.5x to 2x spacing
    const fontSize = Math.max(10, Math.floor(outW / cols));
    const charW = fontSize * 0.6 * spacingFactor; // Adjust horizontal spacing
    const charH = fontSize * spacingFactor; // Adjust vertical spacing

    octx.font = `${fontSize}px ui-monospace, Menlo, Monaco, Consolas, monospace`;
    octx.fillStyle = "#000";
    octx.textBaseline = "top";

    // Center the ASCII art with adjusted spacing
    const totalW = cols * charW;
    const totalH = rows * charH;
    const startX = (outW - totalW) / 2;
    const startY = (outH - totalH) / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = (r + g + b) / 3;
        const idx = Math.floor((lum / 255) * (CHARS.length - 1));
        octx.fillText(CHARS[idx], startX + x * charW, startY + y * charH);
      }
    }

    octx.font = "10px ui-monospace, Menlo, Monaco, Consolas, monospace";
    octx.fillStyle = "rgba(0,0,0,0.35)";
    octx.fillText("weeklywonder.org", 10, outH - 16);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function loop(ts) {
    const fps = 15; // Fixed FPS since slider was removed
    const interval = 1000 / fps;

    if (ts - lastFrameTime >= interval) {
      lastFrameTime = ts;
      if (mode === "webcam") {
        if (drawVideoToInput()) renderASCIIToCanvas();
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    stopLoop();
    lastFrameTime = 0;
    rafId = requestAnimationFrame(loop);
  }

  imgInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      srcImg = img;
      mode = "image";
      stopLoop();
      drawSourceImage();
      renderASCIIToCanvas();
    };
    img.src = URL.createObjectURL(file);
  });

  startWebcamBtn?.addEventListener("click", async () => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
      await video.play();

      mode = "webcam";
      updateButtonStates();
      startLoop();
    } catch (err) {
      console.error(err);
      alert("Couldn't access webcam. Check browser permissions.");
    }
  });

  stopWebcamBtn?.addEventListener("click", () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (video) {
      video.srcObject = null;
    }
    mode = "none";
    updateButtonStates();
    stopLoop();

    // Clear canvases
    const w = inputCanvas.clientWidth;
    const h = inputCanvas.clientHeight;
    ictx.clearRect(0, 0, w, h);
    octx.clearRect(0, 0, outCanvas.clientWidth, outCanvas.clientHeight);
  });

  captureBtn?.addEventListener("click", () => {
    if (mode !== "webcam") return;
    if (drawVideoToInput()) {
      mode = "image";
      stopLoop();
      const snap = new Image();
      snap.onload = () => {
        srcImg = snap;
        drawSourceImage();
        renderASCIIToCanvas();
      };
      snap.src = inputCanvas.toDataURL("image/png");
    }
  });

  scaleSlider?.addEventListener("input", () => {
    if (mode === "image" && srcImg) {
      drawSourceImage();
      renderASCIIToCanvas();
    }
    // Note: webcam mode updates automatically in the loop
  });

  zoomSlider?.addEventListener("input", () => {
    if (mode === "image" && srcImg) {
      drawSourceImage();
      renderASCIIToCanvas();
    }
    // Note: webcam mode updates automatically in the loop
  });

  exportBtn?.addEventListener("click", () => {
    const preset = exportSize?.value || "ig45";
    const sizes = {
      igPost: [1080, 1080],
      ig45:   [1080, 1350],
      story:  [1080, 1920],
    };
    const [w, h] = sizes[preset] || sizes.ig45;

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    const srcW = outCanvas.clientWidth;
    const srcH = outCanvas.clientHeight;
    const s = Math.min(w / srcW, h / srcH);
    const dw = srcW * s;
    const dh = srcH * s;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    ctx.drawImage(outCanvas, dx, dy, dw, dh);

    downloadCanvas(out, "weeklywonder-ascii.png");
  });
}

/* =========================
   Shared helpers
========================= */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768;
}

function downloadCanvas(canvas, filename) {
  const dataUrl = canvas.toDataURL("image/png", 1.0);

  if (isMobile()) {
    // On mobile: open in new tab for long-press save
    const img = new Image();
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    const win = window.open('');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${filename}</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            img { max-width: 100%; height: auto; border-radius: 8px; }
            p { color: #fff; text-align: center; font-family: sans-serif; font-size: 14px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div>
            <img src="${dataUrl}" alt="${filename}">
            <p>Long press image to save to your library</p>
          </div>
        </body>
        </html>
      `);
      win.document.close();
    }
  } else {
    // On desktop: traditional download
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }
}

function drawContain(ctx, img, w, h) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function randDigits(n) {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function randBlock(groups, len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const parts = [];
  for (let g = 0; g < groups; g++) {
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    parts.push(s);
  }
  return parts.join("-");
}

function zodiacSign(dateObj) {
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Aries";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Taurus";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Gemini";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Cancer";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leo";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Virgo";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Libra";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Scorpio";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Sagittarius";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricorn";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Aquarius";
  return "Pisces";
}
