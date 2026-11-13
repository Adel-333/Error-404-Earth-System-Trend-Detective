import gsap from "gsap";

/**
 * Resets and immediately hides the transition curtain so that returning to Explorer
 * never freezes, hangs, or shows stale elements.
 */
export function resetTransitionCurtain(): void {
  const curtain = document.querySelector<HTMLElement>("#investigation-transition-curtain");
  if (curtain) {
    curtain.style.display = "none";
    curtain.classList.remove("is-active");
    gsap.set(curtain, { opacity: 0 });
  }
}

/**
 * Plays a fast, high-impact pure visual orbital warp transition
 * when launching Investigation from Explorer.
 * Snappy 380ms duration for instant responsiveness.
 */
export function playCurtainTransition(onComplete: () => void, durationMs = 380): void {
  const curtain = document.querySelector<HTMLElement>("#investigation-transition-curtain");
  if (!curtain) {
    onComplete();
    return;
  }

  curtain.style.display = "flex";
  curtain.classList.add("is-active");

  try {
    const tl = gsap.timeline();
    tl.fromTo(curtain, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power2.out" });
    tl.fromTo(
      ".curtain-portal-core",
      { scale: 0.72, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.5)" },
      "-=0.06"
    );
    tl.fromTo(
      ".curtain-progress-laser",
      { width: "0%" },
      { width: "100%", duration: 0.32, ease: "power3.inOut" },
      "-=0.22"
    );
  } catch {
    // Graceful fallback
  }

  setTimeout(() => {
    onComplete();
  }, durationMs);
}
