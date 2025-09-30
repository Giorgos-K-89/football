export function createNets(
  scene,
  {
    goalLeft,
    goalRight,
    goalLineY,
    direction = "down", // 'up' (top goal) or 'down' (bottom goal)
    netDepth = 140,
    colSpacing = 8,
    rowSpacing = 8,
    color = 0xffffff,
    alpha = 0.6,
    lineWidth = 1,
    depth = 220,
  } = {}
) {
  // Validate inputs
  if (!scene || typeof scene.add === "undefined") {
    throw new Error("createNets: first argument must be a Phaser.Scene");
  }
  // Compute start/end Y in world coords depending on direction
  let startY, endY;
  if (direction === "down") {
    startY = goalLineY + 4; // just below the goal line
    endY = startY + netDepth; // extends downward
  } else {
    startY = goalLineY - 4; // just above bottom goal line
    endY = startY - netDepth; // extends upward
  }

  const g = scene.add.graphics();
  g.lineStyle(lineWidth, color, alpha);

  // vertical strands
  for (
    let x = Math.round(goalLeft);
    x <= Math.round(goalRight);
    x += colSpacing
  ) {
    g.beginPath();
    // +0.5 improves 1px line crispness on canvas
    g.moveTo(x + 0.5, startY);
    g.lineTo(x + 0.5, endY);
    g.strokePath();
  }

  // horizontal strands
  if (direction === "down") {
    for (let y = startY; y <= endY; y += rowSpacing) {
      g.beginPath();
      g.moveTo(goalLeft, y + 0.5);
      g.lineTo(goalRight, y + 0.5);
      g.strokePath();
    }
  } else {
    // direction === 'up'
    for (let y = endY; y <= startY; y += rowSpacing) {
      g.beginPath();
      g.moveTo(goalLeft, y + 0.5);
      g.lineTo(goalRight, y + 0.5);
      g.strokePath();
    }
  }

  g.setDepth(depth);
  // store meta so you can inspect if needed
  g.netMeta = {
    goalLeft,
    goalRight,
    goalLineY,
    direction,
    netDepth,
    colSpacing,
    rowSpacing,
  };

  return g;
}
