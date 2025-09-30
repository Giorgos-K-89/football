export function createPlayersFormation(scene, opts = {}) {
  const { width, height } = scene.sys.game.config;

  const cfg = Object.assign(
    {
      // keys for image frames already loaded in preload()
      oppFrameKeys: ["opponent1", "opponent2"],
      keeperFrameKeys: ["keeper1", "keeper2"],
      // scales
      oppScale: 0.08,
      keeperScale: 0.06,
      // formation counts (4-4-2)
      defenders: 4,
      midfielders: 4,
      attackers: 2,
      worldHeight: scene.worldHeight || height * 3,
      worldWidth: scene.worldWidth || width * 2,
      paddingPercentage: opts.paddingPercentage || 0.1, // 10% default padding
      // vertical bands (distance from bottom): attackers closest to bottom, then mids, then defenders
      attackersBandSpread: 80, // vertical jitter
      midfieldBandSpread: scene.worldWidth / 4,
      defendersBandSpread: scene.worldWidth / 4,
      // horizontal play area (inside sidelines)
      centerX: scene.centerX || scene.worldWidth / 2,
      // animation keys
      oppAnimKey: "opponent_anim",
      keeperAnimKey: "keeper_anim",
      // randomness (seedless)
      jitterX: 30,
      depth: 10,
      homingSpeed: 50,
    },
    opts
  );

  const pad = Math.floor(cfg.worldWidth * cfg.paddingPercentage);
  const leftBound = pad + 40;
  const rightBound = cfg.worldWidth - pad - 40;
  const attackersBandOffsetFromBottom = (cfg.worldHeight - pad) / 3;
  const midfieldBandOffsetFromBottom = (cfg.worldHeight - pad) / 2;
  const defendersBandOffsetFromBottom = ((cfg.worldHeight - pad) * 3) / 4;

  // convenience
  const randBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const makeLineX = (n, idx) => {
    // evenly distribute n players across leftBound..rightBound
    const L = leftBound;
    const R = rightBound;
    if (n === 1) return Math.round((L + R) / 2);
    const step = (R - L) / (n - 1);
    return Math.round(L + idx * step);
  };

  // ensure animations exist
  if (!scene.anims.exists(cfg.oppAnimKey)) {
    scene.anims.create({
      key: cfg.oppAnimKey,
      frames: [{ key: cfg.oppFrameKeys[0] }, { key: cfg.oppFrameKeys[1] }],
      frameRate: 6,
      repeat: -1,
    });
  }
  if (!scene.anims.exists(cfg.keeperAnimKey)) {
    scene.anims.create({
      key: cfg.keeperAnimKey,
      frames: [
        { key: cfg.keeperFrameKeys[0] },
        { key: cfg.keeperFrameKeys[1] },
      ],
      frameRate: 3,
      repeat: -1,
    });
  }

  const opponentsGroup = scene.physics.add.group();
  const opponentsArray = [];

  // helper to create a sprite at world coords (x,y)
  function createOpp(x, y, index) {
    const spr = scene.physics.add
      .sprite(x, y, cfg.oppFrameKeys[0])
      .setScale(cfg.oppScale);
    spr.body.allowGravity = false;
    spr.body.immovable = false;
    spr.play(cfg.oppAnimKey);
    spr.setDepth(cfg.depth);
    spr.setData("role", "opponent");
    spr.setData("index", index);
    spr.setData("homing", true);
    spr.setData("homingSpeed", cfg.homingSpeed);
    opponentsGroup.add(spr);
    opponentsArray.push(spr);
    return spr;
  }

  // compute world bottom
  const worldBottomY = cfg.worldHeight;

  // 1) Attackers (2) — closest to bottom, so smallest distance above bottom
  const pairSpacing = cfg.worldWidth / 4;
  for (let i = 0; i < cfg.attackers; i++) {
    const offset =
      i === 0 ? -Math.round(pairSpacing / 2) : Math.round(pairSpacing / 2);
    const x =
      cfg.centerX +
      offset +
      randBetween(-Math.round(cfg.jitterX / 3), Math.round(cfg.jitterX / 3));
    const y =
      worldBottomY -
      attackersBandOffsetFromBottom +
      randBetween(
        -Math.round(cfg.attackersBandSpread / 2),
        Math.round(cfg.attackersBandSpread / 2)
      );
    createOpp(x, y, `A${i + 1}`);
  }

  // 2) Midfielders (4) — higher up
  for (let i = 0; i < cfg.midfielders; i++) {
    const x =
      makeLineX(cfg.midfielders, i) + randBetween(-cfg.jitterX, cfg.jitterX);
    const y =
      worldBottomY -
      midfieldBandOffsetFromBottom +
      randBetween(-cfg.midfieldBandSpread / 2, cfg.midfieldBandSpread / 2);
    createOpp(x, y, `M${i + 1}`);
  }

  // 3) Defenders (4) — even higher
  for (let i = 0; i < cfg.defenders; i++) {
    const x =
      makeLineX(cfg.defenders, i) + randBetween(-cfg.jitterX, cfg.jitterX);
    const y =
      worldBottomY -
      defendersBandOffsetFromBottom +
      randBetween(-cfg.defendersBandSpread / 2, cfg.defendersBandSpread / 2);
    createOpp(x, y, `D${i + 1}`);
  }

  // Keeper at centerX near goalLine (top area) — place him slightly below the goalLineY if provided
  const keeperY =
    typeof cfg.goalLineY !== "undefined"
      ? cfg.goalLineY + 8
      : Math.round(cfg.worldHeight * 0.03);
  const keeper = scene.physics.add
    .sprite(cfg.centerX, keeperY, cfg.keeperFrameKeys[0])
    .setScale(cfg.keeperScale);
  keeper.body.allowGravity = false;
  keeper.body.immovable = true;
  keeper.body.setCollideWorldBounds(true);
  keeper.setData("role", "keeper");
  keeper.setData("homing", false); // explicit
  keeper.play(cfg.keeperAnimKey);
  keeper.setDepth(cfg.depth + 2);

  return { opponentsGroup, opponentsArray, keeper };
}
