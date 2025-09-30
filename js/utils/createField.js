export function createField(scene, opts = {}) {
  if (!scene || typeof scene.add === "undefined") {
    throw new Error("createField: first argument must be a Phaser.Scene");
  }

  const { width, height } = scene.sys.game.config;
  const paddingPercentage = opts.paddingPercentage || 0.1;

  const config = {
    width,
    height,
    worldHeight: height * 3,
    worldWidth: width * 2,
    paddingPercentage,
    textureKey: opts.textureKey || "fieldFull",
    ...opts,
  };

  const pad = Math.floor(config.worldWidth * paddingPercentage);

  // Create zones for all field elements
  const zones = calculateZones(config, pad);

  // Create graphics object for drawing
  const graphics = scene.add.graphics();

  // Draw all field elements in order
  drawGrassStripes(graphics, config);
  drawShadows(graphics, zones);
  drawCommercialBoards(graphics, zones.commercialBoards);
  drawBleachers(graphics, zones.bleachers);
  drawStairs(graphics, zones.stairs);
  drawPitchLines(graphics, zones.field, config);
  drawGoalLines(graphics, zones.field, config);
  drawCenterLineAndCircle(graphics, zones.field, config);
  drawPenaltyBoxes(graphics, zones.field, config);
  drawCorners(graphics, zones.field);

  // Generate texture from graphics
  const texKey = config.textureKey;
  graphics.generateTexture(texKey, config.worldWidth, config.worldHeight);
  graphics.destroy();

  // Add text labels and fans on top of texture
  addCommercialBoardLabels(scene, zones.commercialBoards, config);
  addFansToBleachers(scene, zones.bleachers);

  // Return metadata
  return createMetadata(texKey, zones, config, pad);
}

// ==================== ZONE CALCULATION ====================

function calculateZones(config, pad) {
  const boardPadding = pad * 0.4;
  const bleacherDepth = pad * 0.5;

  // Field zone (inner playing area)
  const field = {
    x: pad,
    y: pad * 2,
    width: config.worldWidth - pad * 2,
    height: config.worldHeight - pad * 4,
  };

  // Commercial boards zone (between field and bleachers)
  const commercialBoards = {
    top: {
      x: pad,
      y: pad * 2 - boardPadding * 2,
      width: config.worldWidth - pad * 2,
      height: boardPadding - 10,
    },
    bottom: {
      x: pad,
      y: config.worldHeight - pad - boardPadding,
      width: config.worldWidth - pad * 2,
      height: boardPadding - 10,
    },
    left: {
      x: pad - boardPadding * 2,
      y: pad * 2,
      width: boardPadding - 10,
      height: config.worldHeight - pad * 4,
    },
    right: {
      x: config.worldWidth - pad + boardPadding,
      y: pad * 2,
      width: boardPadding - 10,
      height: config.worldHeight - pad * 4,
    },
  };

  // Bleachers zone (only top, divided into 3 sections with stairs)
  const topBleacherWidth = config.worldWidth - bleacherDepth * 2;
  const stairWidth = 40;
  const sectionWidth = (topBleacherWidth - stairWidth * 2) / 3;

  const bleachers = {
    topLeft: {
      x: bleacherDepth,
      y: -bleacherDepth,
      width: sectionWidth,
      height: pad * 1.5,
    },
    topCenter: {
      x: bleacherDepth + sectionWidth + stairWidth,
      y: -bleacherDepth,
      width: sectionWidth,
      height: pad * 1.5,
    },
    topRight: {
      x: bleacherDepth + sectionWidth * 2 + stairWidth * 2,
      y: -bleacherDepth,
      width: sectionWidth,
      height: pad * 1.5,
    },
  };

  // Stairs between sections
  const stairs = {
    left: {
      x: bleacherDepth + sectionWidth,
      y: -bleacherDepth,
      width: stairWidth,
      height: pad * 1.5,
    },
    right: {
      x: bleacherDepth + sectionWidth * 2 + stairWidth,
      y: -bleacherDepth,
      width: stairWidth,
      height: pad * 1.5,
    },
  };

  return { field, commercialBoards, bleachers, stairs };
}

// ==================== DRAWING FUNCTIONS ====================

function drawGrassStripes(g, config) {
  const stripeH = 120;
  for (let y = 0; y < config.worldHeight; y += stripeH) {
    const isLight = Math.floor(y / stripeH) % 2 === 0;
    const color = isLight ? 0x66b82e : 0x5ab02b;
    g.fillStyle(color, 1);
    g.fillRect(0, y, config.worldWidth, stripeH);
  }
}

function drawShadows(g, zones) {
  const shadowColor = 0x000000;
  const shadowAlpha = 0.15;
  const shadowOffset = 8;

  g.fillStyle(shadowColor, shadowAlpha);

  // Commercial board shadows
  const { commercialBoards } = zones;

  // Top board shadow
  g.fillRect(
    commercialBoards.top.x,
    commercialBoards.top.y + commercialBoards.top.height,
    commercialBoards.top.width,
    shadowOffset
  );

  // Bottom board shadow
  g.fillRect(
    commercialBoards.bottom.x,
    commercialBoards.bottom.y + commercialBoards.bottom.height,
    commercialBoards.bottom.width,
    shadowOffset
  );

  // Left board shadow
  g.fillRect(
    commercialBoards.left.x + commercialBoards.left.width,
    commercialBoards.left.y,
    shadowOffset,
    commercialBoards.left.height
  );

  // Right board shadow
  g.fillRect(
    commercialBoards.right.x + commercialBoards.right.width,
    commercialBoards.right.y,
    shadowOffset,
    commercialBoards.right.height
  );

  // Bleacher shadows (only top sections)
  const { bleachers } = zones;

  Object.values(bleachers).forEach((section) => {
    g.fillRect(
      section.x,
      section.y + section.height,
      section.width,
      shadowOffset
    );
  });
}

function drawCommercialBoards(g, zones) {
  const boardsConfig = {
    top: {
      sponsors: ["Adidas", "Nike", "Puma", "Reebok", "Under Armour"],
      colors: [0xffc107, 0xff5722, 0x4caf50, 0x2196f3, 0xe91e63],
    },
    bottom: {
      sponsors: ["CocaCola", "Pepsi", "Sprite", "Fanta", "7Up"],
      colors: [0xdb1f48, 0x005bbb, 0x00c853, 0xff6d00, 0x00acc1],
    },
    left: {
      sponsors: ["Heineken", "Budweiser", "Guinness"],
      colors: [0x2e7d32, 0xc62828, 0x212121],
    },
    right: {
      sponsors: ["Sony", "Samsung", "LG"],
      colors: [0x000000, 0x1565c0, 0x43a047],
    },
  };

  const boardsBgColor = 0x2a5a7d;
  const panelInset = 6;

  // Draw background for all boards
  g.fillStyle(boardsBgColor, 1);
  Object.values(zones).forEach((zone) => {
    if (zone.width > 2) {
      g.fillRect(zone.x, zone.y, zone.width, zone.height);
    }
  });

  // Draw horizontal boards (top and bottom)
  ["top", "bottom"].forEach((side) => {
    const zone = zones[side];
    const cfg = boardsConfig[side];
    const count = cfg.sponsors.length;
    const adWidth = zone.width / count;

    for (let i = 0; i < count; i++) {
      const x = zone.x + i * adWidth;
      const panelX = Math.round(x + panelInset);
      const panelY = Math.round(zone.y + panelInset);
      const panelW = Math.max(4, Math.round(adWidth - panelInset * 2));
      const panelH = Math.max(4, Math.round(zone.height - panelInset * 2));
      const color = cfg.colors[i % cfg.colors.length];

      g.fillStyle(color, 1);
      g.fillRect(panelX, panelY, panelW, panelH);
    }
  });

  // Draw vertical boards (left and right)
  ["left", "right"].forEach((side) => {
    const zone = zones[side];
    if (zone.width <= 2) return;

    const cfg = boardsConfig[side];
    const count = cfg.sponsors.length;
    const adHeight = zone.height / count;

    for (let i = 0; i < count; i++) {
      const y = zone.y + i * adHeight;
      const panelX = Math.round(zone.x + panelInset);
      const panelY = Math.round(y + panelInset);
      const panelW = Math.max(4, Math.round(zone.width - panelInset * 2));
      const panelH = Math.max(4, Math.round(adHeight - panelInset * 2));
      const color = cfg.colors[i % cfg.colors.length];

      g.fillStyle(color, 1);
      g.fillRect(panelX, panelY, panelW, panelH);
    }
  });
}

function drawBleachers(g, zones) {
  const color = 0x7880ad;

  Object.values(zones).forEach((section) => {
    if (!section || section.width <= 0 || section.height <= 0) return;

    // draw the full uniform bleacher rectangle for the section
    g.fillStyle(color, 1);
    g.fillRect(
      Math.round(section.x),
      Math.round(section.y),
      Math.round(section.width),
      Math.ceil(section.height)
    );
  });
}

function drawStairs(g, zones) {
  const stairColor = 0x8891bc;
  const stepHeight = 12;

  const railColor = 0x4e587a; // iron rail color
  const railW = 2; // rail width in px
  const railInset = 0; // inset from stair rect edge

  Object.values(zones).forEach((stair) => {
    if (!stair || stair.width <= 0 || stair.height <= 0) return;

    // Fill stair background
    g.fillStyle(stairColor, 1);
    g.fillRect(stair.x, stair.y, stair.width, stair.height);

    // Draw steps (horizontal separators)
    const numSteps = Math.floor(stair.height / stepHeight);
    g.lineStyle(2, 0x596cb1, 1);

    for (let i = 1; i < numSteps; i++) {
      const stepY = stair.y + i * stepHeight;
      g.beginPath();
      g.moveTo(stair.x, stepY);
      g.lineTo(stair.x + stair.width, stepY);
      g.strokePath();
    }

    // Draw left and right iron rails (on top of steps so they stay visible)
    if (stair.width > railInset * 2 + railW) {
      // left rail
      const leftRailX = Math.round(stair.x + railInset);
      g.fillStyle(railColor, 1);
      g.fillRect(leftRailX, stair.y, railW, stair.height);

      // right rail
      const rightRailX = Math.round(stair.x + stair.width - railInset - railW);
      g.fillStyle(railColor, 1);
      g.fillRect(rightRailX, stair.y, railW, stair.height);
    }
  });
}

function drawPitchLines(g, field, config) {
  g.lineStyle(4, 0xffffff, 1);
  g.strokeRect(field.x, field.y, field.width, field.height);
}

function drawGoalLines(g, field, config) {
  const goalWidth = Math.round(field.width / 6);
  const goalLeft = Math.round((config.worldWidth - goalWidth) / 2);
  const goalLineTopY = field.y;
  const goalLineBottomY = field.y + field.height;

  g.fillStyle(0xffffff, 1);
  g.fillRect(goalLeft, goalLineTopY, goalWidth, 4);
  g.fillRect(goalLeft, goalLineBottomY - 4, goalWidth, 4);
}

function drawCenterLineAndCircle(g, field, config) {
  const centerY = Math.floor(config.worldHeight / 2);
  const centerX = Math.floor(config.worldWidth / 2);
  const centerRadius = Math.round(config.worldWidth / 8);

  // Center line
  g.fillStyle(0xffffff, 1);
  g.fillRect(field.x, centerY - 2, field.width, 4);

  // Center circle
  g.lineStyle(4, 0xffffff, 1);
  g.strokeCircle(centerX, centerY, centerRadius);
  g.fillCircle(centerX, centerY, 6);
}

function drawPenaltyBoxes(g, field, config) {
  const boxW = Math.round(field.width / 1.6);
  const boxH = Math.round(field.height / 6);
  const smallBoxW = Math.round(field.width * 0.35);
  const smallBoxH = Math.round(field.height / 18);
  const cx = Math.round(config.worldWidth / 2);
  const centerRadius = Math.round(config.worldWidth / 8);

  g.lineStyle(4, 0xffffff, 1);

  // Top penalty box
  const topBoxY = field.y;
  g.strokeRect(cx - boxW / 2, topBoxY, boxW, boxH);
  g.strokeRect(cx - smallBoxW / 2, topBoxY, smallBoxW, smallBoxH);

  // Top penalty spot
  const penaltySpotTopY = topBoxY + boxH - Math.round(boxH * 0.3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx, penaltySpotTopY, 3);

  // Top penalty arc
  const arcDegrees = 100;
  const halfAngleRad = (arcDegrees * Math.PI) / 180 / 2;
  const topArcCenterY = topBoxY + boxH - 160;
  g.beginPath();
  g.arc(
    cx,
    topArcCenterY,
    centerRadius,
    Math.PI / 2 - halfAngleRad,
    Math.PI / 2 + halfAngleRad,
    false
  );
  g.strokePath();

  // Bottom penalty box
  const bottomBoxY = field.y + field.height - boxH;
  g.strokeRect(cx - boxW / 2, bottomBoxY, boxW, boxH);
  g.strokeRect(
    cx - smallBoxW / 2,
    bottomBoxY + boxH - smallBoxH,
    smallBoxW,
    smallBoxH
  );

  // Bottom penalty spot
  const penaltySpotBottomY = bottomBoxY + Math.round(boxH * 0.3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx, penaltySpotBottomY, 3);

  // Bottom penalty arc
  const bottomArcCenterY = bottomBoxY + 160;
  g.beginPath();
  g.arc(
    cx,
    bottomArcCenterY,
    centerRadius,
    (3 * Math.PI) / 2 - halfAngleRad,
    (3 * Math.PI) / 2 + halfAngleRad,
    false
  );
  g.strokePath();
}

function drawCorners(g, field) {
  const cornerRadius = 34;

  g.lineStyle(4, 0xffffff, 1);

  // Top-left
  g.beginPath();
  g.arc(field.x, field.y, cornerRadius, 0, Math.PI / 2, false);
  g.strokePath();

  // Top-right
  g.beginPath();
  g.arc(
    field.x + field.width,
    field.y,
    cornerRadius,
    Math.PI / 2,
    Math.PI,
    false
  );
  g.strokePath();

  // Bottom-left
  g.beginPath();
  g.arc(
    field.x,
    field.y + field.height,
    cornerRadius,
    (3 * Math.PI) / 2,
    0,
    false
  );
  g.strokePath();

  // Bottom-right
  g.beginPath();
  g.arc(
    field.x + field.width,
    field.y + field.height,
    cornerRadius,
    Math.PI,
    (3 * Math.PI) / 2,
    false
  );
  g.strokePath();
}

// ==================== TEXT LABELS ====================

function addCommercialBoardLabels(scene, zones, config) {
  const boardsConfig = {
    top: {
      sponsors: ["Adidas", "Nike", "Puma", "Reebok", "Under Armour"],
    },
    bottom: {
      sponsors: ["CocaCola", "Pepsi", "Sprite", "Fanta", "7Up"],
    },
    left: {
      sponsors: ["Heineken", "Budweiser", "Guinness"],
    },
    right: {
      sponsors: ["Sony", "Samsung", "LG"],
    },
  };

  const fontSize = Math.max(12, Math.round(config.worldWidth * 0.012));
  const textStyle = {
    font: `bold ${fontSize}px Arial`,
    fill: "#ffffff",
    align: "center",
    stroke: "#000000",
    strokeThickness: 4,
  };

  // Horizontal labels (top and bottom)
  ["top", "bottom"].forEach((side) => {
    const zone = zones[side];
    const sponsors = boardsConfig[side].sponsors;
    const adWidth = zone.width / sponsors.length;

    sponsors.forEach((sponsor, i) => {
      const labelX = Math.round(zone.x + i * adWidth + adWidth / 2);
      const labelY = Math.round(zone.y + zone.height / 2);

      scene.add
        .text(labelX, labelY, sponsor, textStyle)
        .setOrigin(0.5)
        .setDepth(10000)
        .setScrollFactor(1, 1);
    });
  });

  // Vertical labels (left and right)
  ["left", "right"].forEach((side) => {
    const zone = zones[side];
    if (zone.width <= 2) return;

    const sponsors = boardsConfig[side].sponsors;
    const adHeight = zone.height / sponsors.length;
    const flipText = side === "left";

    sponsors.forEach((sponsor, i) => {
      const labelX = Math.round(zone.x + zone.width / 2);
      const labelY = Math.round(zone.y + i * adHeight + adHeight / 2);

      const txt = scene.add
        .text(labelX, labelY, sponsor, textStyle)
        .setOrigin(0.5)
        .setDepth(10000)
        .setScrollFactor(1, 1);

      txt.setRotation(flipText ? -Math.PI / 2 : Math.PI / 2);
    });
  });
}

function addFansToBleachers(scene, zones, config = {}) {
  const rows = 14;
  const cols = 20;
  const fanTypes = ["fan_0", "fan_1", "fan_2", "fan_3"];
  const fanScale = 0.08;
  const fillProbability = 1;
  const jitter = 2; // pixels jitter to avoid perfect grid
  const depth = 100;
  const scrollFactor = { x: 1, y: 1 };
  const origin = { x: 0.5, y: 1 };

  Object.values(zones).forEach((section) => {
    if (!section || section.width <= 0 || section.height <= 0) return;

    const rowHeight = section.height / (rows + 1);
    const colWidth = section.width / (cols + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > fillProbability) continue;

        // compute evenly spaced x,y for the fan inside the section
        const x = section.x + colWidth * (c + 1);
        const y = section.y + rowHeight * (r + 1);

        // small random jitter so fans don't look grid-perfect
        const jx = jitter ? Phaser.Math.Between(-jitter, jitter) : 0;
        const jy = jitter ? Phaser.Math.Between(-jitter, jitter) : 0;

        const key = Phaser.Utils.Array.GetRandom(fanTypes);

        const fan = scene.add
          .image(Math.round(x + jx), Math.round(y + jy), key)
          .setOrigin(origin.x, origin.y)
          .setScale(fanScale)
          .setDepth(depth)
          .setScrollFactor(scrollFactor.x, scrollFactor.y);

        // tiny random flip for variety
        if (Math.random() < 0.5) fan.setFlipX(true);

        // store some metadata if you want later control
        fan.setData("bleacherRow", r);
        fan.setData("bleacherCol", c);
        fan.setData("sectionBounds", section);
      }
    }
  });
}

// ==================== METADATA ====================

function createMetadata(texKey, zones, config, pad) {
  const goalWidth = Math.round(zones.field.width / 6);
  const goalLeft = Math.round((config.worldWidth - goalWidth) / 2);

  return {
    textureKey: texKey,
    pitch: {
      x: zones.field.x,
      y: zones.field.y,
      w: zones.field.width,
      h: zones.field.height,
    },
    goalLeft,
    goalRight: goalLeft + goalWidth,
    goalLineTopY: zones.field.y,
    goalLineBottomY: zones.field.y + zones.field.height,
    worldWidth: config.worldWidth,
    worldHeight: config.worldHeight,
    pad,
    paddingPercentage: config.paddingPercentage,
    centerX: Math.round(config.worldWidth / 2),
    centerY: Math.round(config.worldHeight / 2),
    zones,
  };
}
