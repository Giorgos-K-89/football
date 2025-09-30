// scenes/ShootScene.js
import { perspectivePitch } from "../utils/perspectivePitch.js";

export default class ShootScene extends Phaser.Scene {
  constructor() {
    super("ShootScene");
  }

  preload() {
    // Player
    this.load.image("player1", "assets/player1-1.png");
    this.load.image("player2", "assets/player1-2.png");
    this.load.image("shoot1", "assets/shoot1-1.png");
    this.load.image("shoot2", "assets/shoot1-2.png");
    // Keeper
    this.load.image("keeper1", "assets/keeper1-1.png");
    this.load.image("keeper2", "assets/keeper1-2.png");
    // Ball and overlay video
    this.load.image("ball", "assets/ball.png");
    this.load.video(
      "ballkickingVideo",
      "assets/cropedfootball.mp4",
      "loaded",
      false,
      true
    );
    //goalpost
    this.load.image("goalpost", "assets/goalpost.png");
    //arrow
    this.load.image("arrow", "assets/pointer.png");
  }

  create() {
    // ================ PITCH DRAW ================
    this.pitch = perspectivePitch(this, {
      topY: Math.round(this.scale.height * 0.35),
      topWidth: 1,
      bottomExtra: 0.35,
      bottomY: this.scale.height + 24,
      boxes: [
        {}, // main pitch
        { widthRatio: 0.65, heightPx: Math.round(this.scale.height * 0.14) },
        { widthRatio: 1, heightPx: Math.round(this.scale.height * 0.58) },
      ],
      goalPostHeight: Math.round(this.scale.height * 0.12),
    });

    const pitch = this.pitch;
    const mainT = pitch.trapezoids[0];
    const { goal } = pitch;

    // ================ KEEPER ================
    this.keeper = this.add
      .sprite(
        goal.centerX,
        pitch.topY + Math.round(this.scale.height * 0.015),
        "keeper1"
      )
      .setOrigin(0.5, 0.9)
      .setScale(0.08)
      .setDepth(40);

    if (!this.anims.exists("keeper_anim")) {
      this.anims.create({
        key: "keeper_anim",
        frames: [{ key: "keeper1" }, { key: "keeper2" }],
        frameRate: 3,
        repeat: -1,
      });
    }
    this.keeper.play("keeper_anim");

    // ================ PLAYER ================
    const botLeft = mainT.points[3].x;
    const botRight = mainT.points[2].x;
    const botY = mainT.points[2].y;
    const bottomCenterX = Math.round((botLeft + botRight) / 2);

    const mainHeight = Math.abs(mainT.points[2].y - mainT.points[0].y);
    const safeYOffset = Math.round(mainHeight * 0.5);
    const playerStartY = botY - safeYOffset;

    this.player = this.physics.add
      .sprite(bottomCenterX, playerStartY, "player1")
      .setScale(0.1)
      .setDepth(60);

    this.player.setData("role", "shooter");
    this.player.runSpeed = Math.round(this.scale.width * 0.35);

    if (!this.anims.exists("shooter_run")) {
      this.anims.create({
        key: "shooter_run",
        frames: [{ key: "player1" }, { key: "player2" }],
        frameRate: 8,
        repeat: -1,
      });
    }
    this.player.play("shooter_run");

    this.player.minX =
      Math.min(botLeft, botRight) + Math.round(this.scale.width * 0.03);
    this.player.maxX =
      Math.max(botLeft, botRight) - Math.round(this.scale.width * 0.03);

    // ================ AIMING ================
    this.aim = {
      active: true,
      timer: 0,
      speed: 0.0035,
      padding: Math.round(this.scale.width * 0.02),
      lastTarget: null,
    };

    this.aimRange = {
      left: goal.leftX + this.aim.padding,
      right: goal.rightX - this.aim.padding,
      y: pitch.topY + (pitch.goalInsetY || 0),
    };

    // ================ INPUT ================
    this.cursors = this.input.keyboard.createCursorKeys();

    this.spaceHandler = () => {
      if (!this.aim.active) return;
      const target = this.aim.lastTarget ?? this.computeAimTarget();
      this.startShootSequence(target.x, target.y);
    };
    this.input.keyboard.on("keydown-SPACE", this.spaceHandler);

    // Create ball trail texture
    this.createBallTrailTexture();

    this.shootingLocked = false;
  }

  computeAimTarget() {
    const t = Math.sin(this.aim.timer * this.aim.speed) * 0.5 + 0.5;
    const x = Phaser.Math.Linear(this.aimRange.left, this.aimRange.right, t);
    return { x, y: this.aimRange.y };
  }

  drawAim(target) {
    const px = this.player.x;
    const py = this.player.y;
    const tx = target.x;
    const ty = target.y;

    if (!this.aimArrow) {
      this.aimArrow = this.add
        .image(px, py, "arrow")
        .setOrigin(0, 0.5)
        .setDepth(20);
    }

    const angle = Math.atan2(ty - py, tx - px);
    const arrowLength = 200;

    this.aimArrow.setPosition(px, py);
    this.aimArrow.setRotation(angle);
    this.aimArrow.setDisplaySize(arrowLength, 30);
    this.aimArrow.setVisible(true);
  }

  update(time, delta) {
    if (this.shootingLocked) return;

    if (this.aim.active) {
      this.aim.timer += delta;
      const target = this.computeAimTarget();
      this.aim.lastTarget = target;
      this.drawAim(target);
    }

    // Horizontal movement
    const moveStep = (this.player.runSpeed * delta) / 1000;
    if (this.cursors.left.isDown) {
      this.player.x = Math.max(this.player.minX, this.player.x - moveStep);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.x = Math.min(this.player.maxX, this.player.x + moveStep);
      this.player.setFlipX(false);
    }

    if (!this.player.anims.isPlaying) {
      this.player.play("shooter_run");
    }
  }

  createBallTrailTexture() {
    if (!this.textures.exists("ballTrail")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("ballTrail", 8, 8);
      g.destroy();
    }
  }

  startShootSequence(targetX, targetY) {
    this.shootingLocked = true;
    this.aim.active = false;
    if (this.aimArrow) {
      this.aimArrow.setVisible(false);
    }

    const screenW = this.scale.width;
    const screenH = this.scale.height;

    const overlayW = screenW;
    const overlayH = Math.round((overlayW * 9) / 16);
    const overlayLeft = 0;
    const overlayTop = Math.round((screenH - overlayH) / 2);

    const overlay = this.add
      .video(screenW / 2, screenH / 2, "ballkickingVideo")
      .setOrigin(0.5)
      .setDepth(5000)
      .setScrollFactor(0)
      .setScale(0.6)
      .setAlpha(0);

    overlay.play(true);

    // Polygon clip path
    const polyPercents = [
      [0, 0],
      [0.55, 0],
      [0.34, 0.11],
      [1, 0],
      [1, 0.99],
      [0.42, 1],
      [0.52, 0.89],
      [0, 1],
    ];

    const polyPoints = polyPercents.map(([px, py]) => ({
      x: Math.round(overlayLeft + px * overlayW),
      y: Math.round(overlayTop + py * overlayH),
    }));

    // Create geometry mask
    const maskG = this.add
      .graphics({ x: 0, y: 0 })
      .setDepth(1999)
      .setScrollFactor(0);
    maskG.fillStyle(0xffffff, 1);
    maskG.beginPath();
    maskG.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++) {
      maskG.lineTo(polyPoints[i].x, polyPoints[i].y);
    }
    maskG.closePath();
    maskG.fillPath();

    const geomMask = maskG.createGeometryMask();
    overlay.setMask(geomMask);
    maskG.setVisible(false);

    // Border
    const borderG = this.add.graphics().setDepth(2001).setScrollFactor(0);
    borderG.lineStyle(10, 0xff3333, 0.9);
    borderG.beginPath();
    borderG.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++)
      borderG.lineTo(polyPoints[i].x, polyPoints[i].y);
    borderG.closePath();
    borderG.strokePath();

    borderG.lineStyle(3, 0xffffff, 1);
    borderG.beginPath();
    borderG.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++)
      borderG.lineTo(polyPoints[i].x, polyPoints[i].y);
    borderG.closePath();
    borderG.strokePath();

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 180,
      ease: "Quad.easeOut",
    });

    this.time.delayedCall(
      4000,
      () => {
        overlay.destroy();
        borderG.destroy();
        maskG.destroy();
        this.performShot(targetX, targetY);
      },
      [],
      this
    );
  }

  performShot(targetX, targetY) {
    if (this.textures.exists("shoot2")) {
      this.player.setTexture("shoot2");
    }

    const ball = this.add
      .image(this.player.x, this.player.y - 10, "ball")
      .setDepth(210)
      .setScale(0.07);

    if (!this.textures.exists("ballTrail")) {
      const g = this.add.graphics();
      g.fillStyle(0xfff176, 1);
      g.fillRect(0, 0, 4, 18);
      g.generateTexture("__laser", 4, 18);
      g.destroy();
    }

    // Create ball trail particle emitter
    const emitter = this.add.particles(ball.x, ball.y, "ballTrail", {
      speed: { min: 50, max: 100 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 400,
      blendMode: "ADD",
      frequency: 20,
      tint: 0xffff00,
    });

    emitter.startFollow(ball);

    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY - 24,
      angle: 720,
      duration: 700,
      ease: "Power2",
      onComplete: () => {
        emitter.stop();
        this.resolveShot(ball, emitter, targetX, targetY);
      },
    });

    this.keeperDive();
  }

  keeperDive() {
    const choices = ["left", "center", "right"];
    const choice = Phaser.Math.RND.pick(choices);

    const goal = this.pitch.goal;
    const goalCenterX = goal.centerX;
    const quarter = Math.round((goal.rightX - goal.leftX) / 4);

    let keeperTargetX = goalCenterX;
    if (choice === "left") keeperTargetX = goalCenterX - quarter;
    else if (choice === "right") keeperTargetX = goalCenterX + quarter;

    const keeperTargetY =
      this.pitch.topY + Math.round(this.scale.height * 0.02);
    const rotateAngle = choice === "left" ? -70 : choice === "right" ? 70 : -18;

    if (this.keeper.anims?.isPlaying) {
      this.keeper.anims.stop();
      this.keeper.setTexture("keeper1");
    }

    this.tweens.add({
      targets: this.keeper,
      x: keeperTargetX,
      y: keeperTargetY,
      angle: rotateAngle,
      duration: 520,
      ease: "Cubic.easeOut",
    });
  }

  resolveShot(ball, emitter, targetX, targetY) {
    const goal = this.pitch.goal;
    const catchThresholdX = Math.max(36, (goal.rightX - goal.leftX) * 0.18);
    const catchThresholdY = 48;

    const dx = Math.abs(ball.x - this.keeper.x);
    const dy = Math.abs(ball.y - this.keeper.y);
    const caught = dx <= catchThresholdX && dy <= catchThresholdY;

    // Clean up
    if (emitter) {
      this.time.delayedCall(500, () => emitter.destroy());
    }
    ball.destroy();

    if (caught) {
      this.showSaved();
    } else {
      this.showGoal();
    }

    // Transition to GameOver scene after showing result
    this.time.delayedCall(
      2000,
      () => {
        this.scene.start("GameOverScene", {
          scored: !caught,
        });
      },
      [],
      this
    );
  }

  showSaved() {
    const { width, height } = this.scale;

    const savedText = this.add
      .text(width / 2, height / 2, "SAVED!", {
        font: "bold 72px Arial",
        fill: "#00aaff",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10000)
      .setScrollFactor(0);

    this.tweens.add({
      targets: savedText,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: "Quad.easeOut",
    });
  }

  showGoal() {
    const { width, height } = this.scale;
    const goalText = this.add
      .text(width / 2, height / 2, "GOAL!", {
        font: "bold 160px Arial",
        fill: "#ffff00",
        stroke: "#000",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(10000)
      .setScrollFactor(0);

    const singleCycleMs = 120;
    const cycles = Math.max(1, Math.round(2000 / (singleCycleMs * 2)));
    this.tweens.add({
      targets: goalText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1.06 },
      ease: "Cubic.easeInOut",
      duration: singleCycleMs,
      yoyo: true,
      repeat: cycles - 1,
      onComplete: () => {
        this.tweens.add({
          targets: goalText,
          alpha: 0,
          duration: 220,
          ease: "Quad.easeOut",
        });
      },
    });
  }

  shutdown() {
    if (this.spaceHandler) {
      this.input.keyboard.off("keydown-SPACE", this.spaceHandler);
    }
  }
}
