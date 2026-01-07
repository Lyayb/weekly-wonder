// ========================================
// INFO PAGE: MediaPipe Hand Detection
// ========================================

(function() {
  const aboutContainer = document.querySelector(".about-container");
  const brainInteractive = document.querySelector(".brain-interactive");
  const video = document.getElementById("cameraVideo");

  let cameraActive = false;
  let camera = null;
  let hands = null;
  let currentState = "off"; // off | neutral | left | right
  let hideTimer = null; // Timer for auto-hiding panels after 60 seconds

  // Initialize MediaPipe Hands
  function initHands() {
    if (typeof Hands === "undefined" || typeof Camera === "undefined") {
      console.warn("[MediaPipe] Libraries not loaded");
      return;
    }

    hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onHandsDetected);
  }

  // Handle detection results
  function onHandsDetected(results) {
    if (!results.multiHandedness || results.multiHandedness.length === 0) {
      // No hands detected
      updateState("neutral");
      return;
    }

    // Check handedness - FLIPPED for mirror effect
    // MediaPipe's "Left" label = show left panel (left hand waving out)
    // MediaPipe's "Right" label = show right panel (right hand waving out)
    const detectedHands = results.multiHandedness.map(hand => hand.label);

    if (detectedHands.includes("Left")) {
      // Left label = show left panel
      updateState("left");
    } else if (detectedHands.includes("Right")) {
      // Right label = show right panel
      updateState("right");
    } else {
      updateState("neutral");
    }
  }

  // Update UI state
  function updateState(newState) {
    if (currentState === newState) return;
    currentState = newState;

    // Keep existing attribute for backwards compatibility
    aboutContainer.setAttribute("data-emphasis", newState);

    // Clear any existing timer
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    // Add visual class management for brain panels
    if (brainInteractive) {
      brainInteractive.classList.remove("show-left", "show-right");

      if (newState === "left") {
        brainInteractive.classList.add("show-left");
        // Set 60-second timer to hide
        hideTimer = setTimeout(() => {
          brainInteractive.classList.remove("show-left");
          currentState = "neutral";
        }, 60000);
      } else if (newState === "right") {
        brainInteractive.classList.add("show-right");
        // Set 60-second timer to hide
        hideTimer = setTimeout(() => {
          brainInteractive.classList.remove("show-right");
          currentState = "neutral";
        }, 60000);
      }
      // neutral or off: both classes removed (both panels hidden)
    }

    console.log(`[MediaPipe] State: ${newState}`);
  }

  // Start camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480
        }
      });

      video.srcObject = stream;
      await video.play();

      camera = new Camera(video, {
        onFrame: async () => {
          if (hands) {
            await hands.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });

      camera.start();
      cameraActive = true;
      updateState("neutral");

      console.log("[MediaPipe] Camera started");
    } catch (err) {
      console.error("[MediaPipe] Camera error:", err);
      alert("Could not access camera. Check browser permissions.");
      updateState("off");
    }
  }

  // Stop camera
  function stopCamera() {
    if (camera) {
      camera.stop();
      camera = null;
    }

    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

    cameraActive = false;
    updateState("off");

    console.log("[MediaPipe] Camera stopped");
  }

  // Mouse hover fallback for camera-off mode
  function setupHoverFallback() {
    const leftZone = document.querySelector(".brain-hover-zone.left-zone");
    const rightZone = document.querySelector(".brain-hover-zone.right-zone");
    const brainCenter = document.querySelector(".brain-center");

    if (!leftZone || !rightZone || !brainCenter) return;

    // Only activate hover when camera is off
    const handleHover = (zone) => {
      if (cameraActive) return; // Don't interfere with MediaPipe

      // Clear any existing timer
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      if (zone === "left") {
        brainInteractive.classList.remove("show-right");
        brainInteractive.classList.add("show-left");
        // Set 60-second timer to hide
        hideTimer = setTimeout(() => {
          brainInteractive.classList.remove("show-left");
        }, 60000);
      } else if (zone === "right") {
        brainInteractive.classList.remove("show-left");
        brainInteractive.classList.add("show-right");
        // Set 60-second timer to hide
        hideTimer = setTimeout(() => {
          brainInteractive.classList.remove("show-right");
        }, 60000);
      }
    };

    const handleLeave = () => {
      if (cameraActive) return;
      // Don't hide immediately on mouse leave - let timer handle it
    };

    leftZone.addEventListener("mouseenter", () => handleHover("left"));
    rightZone.addEventListener("mouseenter", () => handleHover("right"));
    brainCenter.addEventListener("mouseleave", handleLeave);
  }

  // Setup hover fallback
  setupHoverFallback();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (cameraActive) {
      stopCamera();
    }
  });

  // Listen for camera enable/disable events from popup
  window.addEventListener('enableCamera', () => {
    if (!cameraActive) {
      if (!hands) {
        initHands();
      }
      startCamera();
    }
  });

  window.addEventListener('disableCamera', () => {
    if (cameraActive) {
      stopCamera();
    }
  });

  // Auto-enable camera if user previously chose to enable
  const cameraChoice = localStorage.getItem('cameraChoice');
  if (cameraChoice === 'enabled') {
    setTimeout(() => {
      if (!hands) {
        initHands();
      }
      startCamera();
    }, 500);
  }

  console.log("[MediaPipe] Info page hand detection ready");
})();
