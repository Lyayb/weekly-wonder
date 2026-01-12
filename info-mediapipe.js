// ========================================
// INFO PAGE: MediaPipe Hand Detection
// ========================================

(function() {
  const aboutContainer = document.querySelector(".about-container");
  const brainInteractive = document.querySelector(".brain-interactive");
  const folderBox = document.getElementById("folderBox"); // New: for carousel
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

  // Detect thumbs up gesture
  function isThumbsUp(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Thumb should be extended upward (tip higher than IP joint)
    const thumbExtended = thumbTip.y < thumbIP.y - 0.05;

    // Other fingers should be curled down (tips below MCP)
    const fingersDown = indexTip.y > indexMCP.y + 0.05 &&
                        middleTip.y > indexMCP.y + 0.05 &&
                        ringTip.y > indexMCP.y + 0.05 &&
                        pinkyTip.y > indexMCP.y + 0.05;

    return thumbExtended && fingersDown;
  }

  // Handle detection results
  function onHandsDetected(results) {
    if (!results.multiHandedness || results.multiHandedness.length === 0) {
      // No hands detected
      updateState("neutral");
      // Dispatch hand lost event for carousel
      window.dispatchEvent(new CustomEvent('handLost'));
      return;
    }

    // Get first hand for carousel interaction
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const handLandmarks = results.multiHandLandmarks[0];

      // Check if thumbs up gesture
      const isThumbsUpGesture = isThumbsUp(handLandmarks);

      if (isThumbsUpGesture) {
        // Get thumb tip position (landmark 4)
        const thumbTip = handLandmarks[4];

        // Dispatch thumbs up position event
        window.dispatchEvent(new CustomEvent('thumbsUpPosition', {
          detail: {
            x: thumbTip.x,
            y: thumbTip.y,
            z: thumbTip.z
          }
        }));
      } else {
        // No thumbs up gesture
        window.dispatchEvent(new CustomEvent('thumbsUpLost'));
      }
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

    // Keep existing attribute for backwards compatibility (only if element exists)
    if (aboutContainer) {
      aboutContainer.setAttribute("data-emphasis", newState);
    }

    // Clear any existing timer
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    // Add visual class management for brain panels (only if element exists)
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
    console.log("[MediaPipe] Attempting to start camera...");

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[MediaPipe] getUserMedia not supported");
      alert("Camera not supported in this browser. Try Chrome, Firefox, or Safari.");
      updateState("off");
      return;
    }

    try {
      console.log("[MediaPipe] Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480
        }
      });

      console.log("[MediaPipe] Camera permission granted, stream:", stream);

      if (!video) {
        console.error("[MediaPipe] Video element not found");
        alert("Video element not found. Please refresh the page.");
        return;
      }

      video.srcObject = stream;
      await video.play();

      console.log("[MediaPipe] Video playing, initializing MediaPipe camera...");

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

      console.log("[MediaPipe] Camera started successfully");
    } catch (err) {
      console.error("[MediaPipe] Camera error details:", err);
      console.error("[MediaPipe] Error name:", err.name);
      console.error("[MediaPipe] Error message:", err.message);

      let errorMessage = "Could not access camera. ";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage += "Permission denied. Please allow camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage += "No camera found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage += "Camera is already in use by another application. Close other apps using the camera.";
      } else if (err.name === "SecurityError") {
        errorMessage += "Please use HTTPS or localhost. Open: http://localhost:8000/info.html";
      } else {
        errorMessage += err.message || "Unknown error occurred.";
      }

      alert(errorMessage);
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

// ========================================
// VIDEO SWITCHER: Toggle between videos
// ========================================
(function() {
  const videoBox = document.getElementById("videoBox");
  const video1 = document.getElementById("heroVideo1");
  const video2 = document.getElementById("heroVideo2");

  if (!videoBox || !video1 || !video2) {
    console.warn("[Video Switcher] Elements not found");
    return;
  }

  let currentVideo = 1; // 1 or 2
  let lastThumbsUpSwitch = 0; // Throttle thumbs up switches
  const THUMBS_UP_COOLDOWN = 2000; // 2 seconds between switches

  function switchVideo() {
    if (currentVideo === 1) {
      // Switch to video 2
      video1.classList.remove("active");
      video2.classList.add("active");
      video2.play(); // Ensure it plays
      currentVideo = 2;
      console.log("[Video Switcher] Switched to video 2 (3dd me.mp4)");
    } else {
      // Switch to video 1
      video2.classList.remove("active");
      video1.classList.add("active");
      video1.play(); // Ensure it plays
      currentVideo = 1;
      console.log("[Video Switcher] Switched to video 1 (3d me.mp4)");
    }
  }

  // Click to switch
  videoBox.addEventListener("click", () => {
    switchVideo();
  });

  // Thumbs up gesture to switch
  window.addEventListener("thumbsUpPosition", (e) => {
    const now = Date.now();
    // Throttle: only switch every 2 seconds
    if (now - lastThumbsUpSwitch > THUMBS_UP_COOLDOWN) {
      switchVideo();
      lastThumbsUpSwitch = now;
    }
  });

  console.log("[Video Switcher] Initialized");
})();
