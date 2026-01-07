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

  // Mobile fallback: subtle drift (optional, doesn't require touch)
  // Comment this out if you want it totally static on phones.
  let t = 0;
  function drift() {
    t += 0.01;
    const x = Math.sin(t) * 2;
    const y = Math.cos(t) * 2;
    moireLayer.style.transform = `translate(${x}px, ${y}px) scale(1.01)`;
    requestAnimationFrame(drift);
  }

  if (window.matchMedia("(pointer: coarse)").matches) drift();
})();
