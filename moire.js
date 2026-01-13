(() => {
  const widget = document.getElementById("moire-widget");
  if (!widget) return; // safety: does nothing on other pages

  const moireLayer = widget.querySelector(".moire");
  if (!moireLayer) return;

  // Gentle movement range (keep small for classy moiré)
  const RANGE = 6;

  function onMove(e) {
    const x = (e.clientX / window.innerWidth - 0.5) * RANGE;
    const y = (e.clientY / window.innerHeight - 0.5) * RANGE;

    moireLayer.style.transform = `translate(${x}px, ${y}px) scale(1.01)`;
  }

  // Desktop: mouse move
  window.addEventListener("mousemove", onMove, { passive: true });

  // Mobile: drift animation + scroll interaction
  let t = 0;
  let scrollOffset = 0;
  let targetScrollOffset = 0;

  function drift() {
    t += 0.01;
    const driftX = Math.sin(t) * 3;
    const driftY = Math.cos(t) * 3;

    // Smooth scroll offset interpolation - faster response
    scrollOffset += (targetScrollOffset - scrollOffset) * 0.15;

    const x = driftX;
    const y = driftY + scrollOffset;

    moireLayer.style.transform = `translate(${x}px, ${y}px) scale(1.01)`;
    requestAnimationFrame(drift);
  }

  // Track scroll on mobile
  let lastScrollY = window.scrollY;
  function onScroll() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;

    // Add scroll delta to target offset - increased range and sensitivity
    targetScrollOffset = Math.max(-20, Math.min(20, scrollDelta * 0.8));

    lastScrollY = currentScrollY;

    // Decay the offset back to 0 after scroll stops
    setTimeout(() => {
      targetScrollOffset *= 0.85;
    }, 50);
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    drift();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
