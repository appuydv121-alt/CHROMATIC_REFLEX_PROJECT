// Draws the hand skeleton on a canvas. Landmarks are normalised (0..1).

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],          // thumb
  [0,5],[5,6],[6,7],[7,8],          // index
  [5,9],[9,10],[10,11],[11,12],     // middle
  [9,13],[13,14],[14,15],[15,16],   // ring
  [13,17],[17,18],[18,19],[19,20],  // pinky
  [0,17],
];

export function drawHand(ctx, landmarks, color = "#00e676") {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  if (!landmarks) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
