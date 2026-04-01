import confetti from "canvas-confetti";

export function celebrateWin(): void {
  const pink = ["#ff3b8d", "#fda4d4", "#ffffff"];
  void confetti({
    particleCount: 130,
    spread: 72,
    origin: { y: 0.62 },
    colors: pink,
    ticks: 220,
    gravity: 1.05,
    scalar: 0.95,
  });
  window.setTimeout(() => {
    void confetti({
      particleCount: 55,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: pink,
    });
    void confetti({
      particleCount: 55,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: pink,
    });
  }, 140);
}
