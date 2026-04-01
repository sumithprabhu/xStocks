import confetti from "canvas-confetti";

export function celebrateWin(): void {
  const mint = ["#34d399", "#6ee7b7", "#a7f3d0", "#fef08a", "#fde047"];
  const pink = ["#ff3b8d", "#fda4d4"];

  void confetti({
    particleCount: 100,
    spread: 64,
    origin: { y: 0.58, x: 0.5 },
    colors: mint,
    ticks: 240,
    gravity: 0.95,
    scalar: 1,
    startVelocity: 38,
  });

  window.setTimeout(() => {
    void confetti({
      particleCount: 45,
      angle: 55,
      spread: 50,
      origin: { x: 0.12, y: 0.62 },
      colors: mint,
    });
    void confetti({
      particleCount: 45,
      angle: 125,
      spread: 50,
      origin: { x: 0.88, y: 0.62 },
      colors: pink,
    });
  }, 120);

  window.setTimeout(() => {
    void confetti({
      particleCount: 70,
      spread: 100,
      origin: { y: 0.35 },
      colors: mint,
      scalar: 0.85,
      drift: 0.05,
    });
  }, 280);
}
