// utils/perspectivePitch.js
export function perspectivePitch(scene, opts = {}) {
  const W = scene.scale.width;
  const H = scene.scale.height;

  const cfg = Object.assign(
    {
      centerX: Math.round(W / 2),
      topY: Math.round(H * 0.35), // moved down to make room for sky/bleachers/boards
      topWidth: 0.55, // narrower top for better perspective
      bottomExtra: 0.35, // more dramatic perspective
      bottomY: H + 24, // extend below screen

      boxes: [],

      lineColor: 0xffffff,
      lineWidth: 4,
      netFillAlpha: 0.15,
      goalPostColor: 0xffffff,
      goalPostThickness: 6,
      goalPostHeight: Math.round(H * 0.12),
      depthBase: 10,
    },
    opts
  );

  const topWidthPx =
    cfg.topWidth > 0 && cfg.topWidth <= 1
      ? Math.round(W * cfg.topWidth)
      : cfg.topWidth;

  function trapezoidPoints(centerX, topWidth, bottomWidth, topY, bottomY) {
    const topLeft = Math.round(centerX - topWidth / 2);
    const topRight = Math.round(centerX + topWidth / 2);
    const botLeft = Math.round(centerX - bottomWidth / 2);
    const botRight = Math.round(centerX + bottomWidth / 2);
    return [
      { x: topLeft, y: topY },
      { x: topRight, y: topY },
      { x: botRight, y: bottomY },
      { x: botLeft, y: bottomY },
    ];
  }

  // ========== SKY ==========
  const skyColor = 0x87ceeb;
  scene.add
    .rectangle(0, 0, W, H, skyColor)
    .setOrigin(0)
    .setDepth(cfg.depthBase - 20);

  // ========== BLEACHERS STRUCTURE ==========
  const bleacherTopY = Math.round(H * 0.08);
  const bleacherHeight = Math.round(H * 0.15);
  const bleacherSectionWidth = Math.round(W * 0.3);
  const stairWidth = Math.round(W * 0.05);

  // Draw 3 bleacher sections with stairs between them
  const bleacherG = scene.add.graphics().setDepth(cfg.depthBase - 15);

  // Bleacher background color (concrete gray)
  const bleacherColor = 0x7880ad;
  const stairColor = [0x8891bc, 0x596cb1];
  const railColor = 0x4e587a;
  const stairSteps = 10;

  const stepHeight = bleacherHeight / stairSteps;
  const leftBleacherX = 0;
  const leftBleacherW = bleacherSectionWidth;
  const leftStairX = leftBleacherX + leftBleacherW;
  const middleBleacherX = leftStairX + stairWidth;
  const middleBleacherW = bleacherSectionWidth;
  const rightStairX = middleBleacherX + middleBleacherW;
  const rightBleacherX = rightStairX + stairWidth;

  // Left bleacher section
  bleacherG.fillStyle(bleacherColor, 1);
  bleacherG.fillRect(0, bleacherTopY, bleacherSectionWidth, bleacherHeight);

  // Left stairs
  for (let i = 0; i < stairSteps; i++) {
    const color = stairColor[i % stairColor.length]; // alternate colors
    bleacherG.fillStyle(color, 1);
    bleacherG.fillRect(
      leftStairX,
      bleacherTopY + i * stepHeight,
      stairWidth,
      stepHeight
    );
  }

  // Middle bleacher section
  bleacherG.fillStyle(bleacherColor, 1);
  bleacherG.fillRect(
    middleBleacherX,
    bleacherTopY,
    bleacherSectionWidth,
    bleacherHeight
  );

  // Right stairs
  for (let i = 0; i < stairSteps; i++) {
    const color = stairColor[i % stairColor.length];
    bleacherG.fillStyle(color, 1);
    bleacherG.fillRect(
      rightStairX,
      bleacherTopY + i * stepHeight,
      stairWidth,
      stepHeight
    );
  }

  // Right bleacher section
  bleacherG.fillStyle(bleacherColor, 1);
  bleacherG.fillRect(
    rightBleacherX,
    bleacherTopY,
    W - rightBleacherX,
    bleacherHeight
  );

  // ---------- Draw left/right iron rails ----------
  const railW = 4; // px
  const railInset = 1; // small gap between rail and stair edge
  // left stair rails (two bars: left edge and right edge of left stair)
  bleacherG.fillStyle(railColor, 1);
  // left edge bar of left stairs
  bleacherG.fillRect(
    leftStairX - railInset - railW,
    bleacherTopY,
    railW,
    bleacherHeight
  );
  // right edge bar of left stairs
  bleacherG.fillRect(
    leftStairX + stairWidth + railInset,
    bleacherTopY,
    railW,
    bleacherHeight
  );

  // right stair rails (two bars: left and right edge of right stair)
  bleacherG.fillRect(
    rightStairX - railInset - railW,
    bleacherTopY,
    railW,
    bleacherHeight
  );
  bleacherG.fillRect(
    rightStairX + stairWidth + railInset,
    bleacherTopY,
    railW,
    bleacherHeight
  );
  // ========== CROWD (6 rows, 20 columns per section) ==========
  const crowdG = scene.add.graphics().setDepth(cfg.depthBase - 14);

  const fanKeys = ["fan_0", "fan_1", "fan_2", "fan_3"];

  function drawCrowdSection(startX, width) {
    const rows = 8;
    const cols = 12;
    const rowHeight = bleacherHeight / (rows + 1);
    const colWidth = width / (cols + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + colWidth * (c + 1);
        const y = bleacherTopY + rowHeight * (r + 1);

        // Pick random fan sprite
        const fanKey = Phaser.Utils.Array.GetRandom(fanKeys);

        // Add sprite to scene
        const fan = scene.add
          .sprite(x, y, fanKey)
          .setDepth(cfg.depthBase - 14)
          .setOrigin(0.5, 1); // fans "stand" on their y

        fan.setScale(0.07);
        // Store baseY for tweening
        fan.setData("baseY", y);
        // Add simple tween to simulate jumping/waving
        // Different height/duration/delay for each fan
        const jumpH = Phaser.Math.Between(2, 4); // pixels up
        const dur = Phaser.Math.Between(350, 500); // ms
        const initialDelay = Phaser.Math.Between(0, 1200);

        scene.tweens.add({
          targets: fan,
          // tween *to* the absolute target (baseY - jumpH)
          y: fan.getData("baseY") - jumpH,
          duration: dur,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
          delay: initialDelay,
          // safety: ensure final position is exactly baseY if tween ever stops
          onStop: () => {
            fan.y = fan.getData("baseY");
          },
        });
        // Optional: flip some fans for variation
        if (Math.random() < 0.5) {
          fan.flipX = true;
        }
      }
    }
  }

  // Draw crowd in each section
  drawCrowdSection(0, bleacherSectionWidth);
  drawCrowdSection(middleBleacherX, bleacherSectionWidth);
  drawCrowdSection(rightBleacherX, W - rightBleacherX);

  // Draw crowd in each section
  drawCrowdSection(0, bleacherSectionWidth);
  drawCrowdSection(middleBleacherX, bleacherSectionWidth);
  drawCrowdSection(rightBleacherX, W - rightBleacherX);

  // ========== COMMERCIAL BOARDS ==========
  const boardTopY = bleacherTopY + bleacherHeight + Math.round(H * 0.01);
  const boardHeight = Math.round(H * 0.05);
  const boardsG = scene.add.graphics().setDepth(cfg.depthBase - 10);

  // Background
  boardsG.fillStyle(0x2a5a7d, 1);
  boardsG.fillRect(0, boardTopY, W, boardHeight);

  // Ad panels
  const adCount = 5;
  const adWidth = W / adCount;
  const adColors = [0xffc107, 0xff5722, 0x4caf50, 0x2196f3, 0xe91e63];

  const sponsors = ["Adidas", "Nike", "Puma", "Reebok", "Under Armour"];

  for (let i = 0; i < adCount; i++) {
    const x = i * adWidth;
    boardsG.fillStyle(adColors[i], 1);
    boardsG.fillRect(x + 8, boardTopY + 8, adWidth - 16, boardHeight - 16);

    const adText = scene.add
      .text(x + adWidth / 2, boardTopY + boardHeight / 2, sponsors[i], {
        font: "bold 16px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(cfg.depthBase - 9);
  }

  // ========== PITCH EXTENSION (green area above topY) ==========
  // This extends the green pitch from topY up to the commercial boards
  const pitchExtensionY = boardTopY + boardHeight;
  const pitchExtensionHeight = cfg.topY - pitchExtensionY;

  const extensionG = scene.add.graphics().setDepth(cfg.depthBase - 5);
  extensionG.fillStyle(0x5ab02b, 1);

  // Create trapezoid that extends from boards to pitch topY
  const extPts = trapezoidPoints(
    cfg.centerX,
    topWidthPx,
    topWidthPx,
    pitchExtensionY - pitchExtensionHeight,
    cfg.topY
  );

  extensionG.beginPath();
  extensionG.moveTo(extPts[0].x, extPts[0].y);
  for (let i = 1; i < extPts.length; i++) {
    extensionG.lineTo(extPts[i].x, extPts[i].y);
  }
  extensionG.closePath();
  extensionG.fillPath();
  extensionG.setDepth(-1);

  // ========== MAIN PITCH WITH STRIPES ==========
  const mainBottomWidthPx = Math.round(topWidthPx * (1 + cfg.bottomExtra));
  const mainPts = trapezoidPoints(
    cfg.centerX,
    topWidthPx,
    mainBottomWidthPx,
    cfg.topY,
    cfg.bottomY
  );

  // Create mask for stripes
  const maskG = scene.add.graphics().setDepth(cfg.depthBase);
  maskG.fillStyle(0xffffff, 1);
  maskG.beginPath();
  maskG.moveTo(mainPts[0].x, mainPts[0].y);
  for (let i = 1; i < mainPts.length; i++) {
    maskG.lineTo(mainPts[i].x, mainPts[i].y);
  }
  maskG.closePath();
  maskG.fillPath();
  maskG.setVisible(false);

  const geomMask = maskG.createGeometryMask();

  // Draw horizontal stripes
  const stripesG = scene.add.graphics().setDepth(cfg.depthBase + 1);
  const stripeHeight = Math.round(H * 0.08);

  for (let y = cfg.topY; y < cfg.bottomY; y += stripeHeight) {
    const isLight = Math.floor((y - cfg.topY) / stripeHeight) % 2 === 0;
    const color = isLight ? 0x66b82e : 0x5ab02b;
    stripesG.fillStyle(color, 1);
    stripesG.fillRect(0, y, W, stripeHeight);
  }
  stripesG.setMask(geomMask);

  // ========== PITCH LINES ==========
  const lineG = scene.add.graphics().setDepth(cfg.depthBase + 5);
  lineG.lineStyle(cfg.lineWidth, cfg.lineColor, 1);

  // Main pitch outline
  lineG.beginPath();
  lineG.moveTo(mainPts[0].x, mainPts[0].y);
  for (let i = 1; i < mainPts.length; i++) {
    lineG.lineTo(mainPts[i].x, mainPts[i].y);
  }
  lineG.closePath();
  lineG.strokePath();

  // Inner boxes
  const boxMetas = [
    {
      name: "pitch",
      points: mainPts,
      topWidth: topWidthPx,
      bottomWidth: mainBottomWidthPx,
      topY: cfg.topY,
      bottomY: cfg.bottomY,
    },
  ];

  for (let i = 1; i < cfg.boxes.length; i++) {
    const box = cfg.boxes[i];
    const boxTopWidth = Math.round(topWidthPx * box.widthRatio);
    const boxBottomWidth = Math.round(boxTopWidth * (1 + cfg.bottomExtra));
    const boxTopY = cfg.topY;
    const boxBottomY = Math.round(cfg.topY + box.heightPx);

    const pts = trapezoidPoints(
      cfg.centerX,
      boxTopWidth,
      boxBottomWidth,
      boxTopY,
      boxBottomY
    );

    lineG.beginPath();
    lineG.moveTo(pts[0].x, pts[0].y);
    for (let p = 1; p < pts.length; p++) {
      lineG.lineTo(pts[p].x, pts[p].y);
    }
    lineG.closePath();
    lineG.strokePath();

    boxMetas.push({
      name: `box_${i}`,
      points: pts,
      topWidth: boxTopWidth,
      bottomWidth: boxBottomWidth,
      topY: boxTopY,
      bottomY: boxBottomY,
    });

    if (i === 2) {
      const spotRadius = boxTopWidth * 0.008;
      const spotY = Math.round(boxTopY + box.heightPx * 0.66);
      const spotX = cfg.centerX;

      // draw the white filled circle
      const spotG = scene.add
        .graphics({ x: 0, y: 0 })
        .setDepth(cfg.depthBase + 6);
      spotG.fillStyle(0xffffff, 1);
      spotG.fillCircle(spotX, spotY, spotRadius);
    }
  }

  // ========== GOAL POSTS & NET ==========
  // ==== GOAL IMAGE (replace net + posts drawing) ====
  const goalTopWidth = Math.round(topWidthPx * 0.4);
  const goalXLeft = Math.round(cfg.centerX - goalTopWidth / 2);
  const goalXRight = Math.round(cfg.centerX + goalTopWidth / 2);

  // Try to place the image centered on the goal area.
  // Use centerY = topY - goalPostHeight/2 so the image spans from topY-goalPostHeight .. topY
  const goalImageY = cfg.topY - Math.round(cfg.goalPostHeight / 2);

  // Create image game object (assumes 'goalpost' is preloaded)
  const goalImage = scene.add
    .image(cfg.centerX, goalImageY, "goalpost")
    .setDepth(cfg.depthBase + 6)
    .setOrigin(0.5, 0.5);

  // Resize image to match layout dimensions.
  // We set display size to goalTopWidth x goalPostHeight to align with your previous drawing.
  goalImage.setDisplaySize(goalTopWidth, cfg.goalPostHeight);

  // Return the same structure (add goalImage under graphics so other code can access it if needed)
  return {
    centerX: cfg.centerX,
    topY: cfg.topY,
    topWidth: topWidthPx,
    bottomWidth: mainBottomWidthPx,
    bottomY: cfg.bottomY,
    goalInsetY: Math.round(H * 0.015),
    trapezoids: boxMetas,
    goal: {
      leftX: goalXLeft,
      rightX: goalXRight,
      centerX: Math.round((goalXLeft + goalXRight) / 2),
      postTopY: cfg.topY - cfg.goalPostHeight,
      postBottomY: cfg.topY,
      postHeight: cfg.goalPostHeight,
      postThickness: cfg.goalPostThickness,
    },
    graphics: {
      pitchGraphics: stripesG,
      outlinesGraphics: lineG,
      maskGraphic: maskG,
      extensionGraphics: extensionG,
      bleacherGraphics: bleacherG,
      crowdGraphics: crowdG,
      boardsGraphics: boardsG,
      goalImage: goalImage,
    },
  };
}
