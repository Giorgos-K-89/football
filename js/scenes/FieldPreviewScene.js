import Player from "../entities/Player.js";
import { createField } from "../utils/createField.js";
import { createNets } from "../utils/createNets.js";
import { createPlayersFormation } from "../utils/createPlayersFormation.js";

export default class FieldPreviewScene extends Phaser.Scene {
  constructor() {
    super("FieldPreviewScene");
  }

  init() {
    this.gameOver = false;
    this.worldHeight = 0;
    this.worldWidth = 0;
    this.fieldData = null;

    // Camera settings
    this.cameraSettings = {
      runSpeed: 220,
      playerBottomOffset: 200,
    };

    // Game entities
    this.player = null;
    this.opponents = null;
    this.keeper = null;

    // Shooting target
    this.shootingTarget = {
      x: 0,
      y: 0,
      isSet: false,
    };

    // Tackle zone state
    this.tackleZone = {
      active: false,
      timer: 300,
      warningText: null,
      timerText: null,
      timeScale: 1,
    };

    this.cursors = null;
    this.spaceKey = null;
  }

  preload() {
    // Player assets
    this.load.image("player1", "assets/player1-1.png");
    this.load.image("player2", "assets/player1-2.png");
    this.load.image("shoot1", "assets/shoot1-1.png");

    // Opponent assets
    this.load.image("opponent1", "assets/opponent1-1.png");
    this.load.image("opponent2", "assets/opponent1-2.png");
    this.load.image("keeper1", "assets/keeper1-1.png");
    this.load.image("keeper2", "assets/keeper1-2.png");

    // Fans
    this.load.image("fan_0", "assets/fan_0.png");
    this.load.image("fan_1", "assets/fan_1.png");
    this.load.image("fan_2", "assets/fan_2.png");
    this.load.image("fan_3", "assets/fan_3.png");
  }

  create() {
    this.setupWorld();
    this.createField();
    this.setupCamera();
    this.createPlayer();
    this.createOpponents();
    this.setupInput();
    this.setShootingTarget();
    this.preloadShootSceneAssets();
  }

  setupWorld() {
    const { width, height } = this.sys.game.config;
    this.worldHeight = height * 4;
    this.worldWidth = width * 1.5;
  }

  createField() {
    this.fieldData = createField(this, {
      width: this.sys.game.config.width,
      height: this.sys.game.config.height,
      worldHeight: this.worldHeight,
      worldWidth: this.worldWidth,
      paddingPercentage: 0.1,
      textureKey: "fieldFull",
    });

    this.add.image(0, 0, "fieldFull").setOrigin(0, 0).setDepth(0);
    this.createNets();
  }

  createNets() {
    const { goalLeft, goalRight, goalLineTopY, goalLineBottomY } =
      this.fieldData;

    this.topNet = createNets(this, {
      goalLeft,
      goalRight,
      goalLineY: goalLineTopY,
      direction: "top",
      netDepth: 24,
      colSpacing: 8,
      rowSpacing: 8,
      color: 0xffffff,
      alpha: 0.65,
      lineWidth: 1,
      depth: 220,
    });

    this.bottomNet = createNets(this, {
      goalLeft,
      goalRight,
      goalLineY: goalLineBottomY,
      direction: "down",
      netDepth: 24,
      colSpacing: 8,
      rowSpacing: 8,
      color: 0xffffff,
      alpha: 0.65,
      lineWidth: 1,
      depth: 220,
    });
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, this.worldHeight * 0.85);
    cam.setZoom(1);

    // Start at bottom of field
    cam.centerOn(
      this.worldWidth / 2,
      this.worldHeight - this.sys.game.config.height / 2
    );

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  createPlayer() {
    const startY = this.worldHeight - 200;

    this.player = new Player(this, this.worldWidth / 2, startY, {
      scale: 0.08,
      frameKeys: ["player1", "player2"],
      idleFrame: "player1",
      runAnimKey: "player_anim",
      runSpeed: 100,
      bottomOffset: this.cameraSettings.playerBottomOffset,
      shootFrame: "shoot1",
    });

    this.cameras.main.startFollow(this.player, false, 0.12, 0);
  }

  createOpponents() {
    const players = createPlayersFormation(this, {
      worldHeight: this.worldHeight,
      worldWidth: this.worldWidth,
      paddingPercentage: 0.1,
      goalLineY: this.fieldData.goalLineTopY,
    });

    this.opponents = players.opponentsGroup;
    this.keeper = players.keeper;

    this.opponents.getChildren().forEach((opponent) => {
      opponent.setDepth(40);
      this.createTackleZone(opponent);
    });

    if (this.keeper) this.keeper.setDepth(230);

    this.physics.add.overlap(
      this.player,
      this.opponents,
      (player, opponent) => {
        // only treat as a hit when bottom 20% of both overlap
        if (this.checkBottomOverlapUsingBody(player, opponent, 0.2)) {
          this.handlePlayerHit(player, opponent);
        }
      },
      null,
      this
    );
  }

  // returns true if the bottom `fraction` of a and b overlap
  checkBottomOverlapUsingBody(a, b, fraction = 0.2) {
    // prefer arcade body if present
    const aBody = a.body;
    const bBody = b.body;

    a._bottomRect = new Phaser.Geom.Rectangle();
    b._bottomRect = new Phaser.Geom.Rectangle();

    const aBottomH = aBody.height * fraction;
    const bBottomH = bBody.height * fraction;

    // body.x/y is top-left in Arcade body coords
    a._bottomRect.setTo(
      aBody.x,
      aBody.y + aBody.height - aBottomH,
      aBody.width,
      aBottomH
    );
    b._bottomRect.setTo(
      bBody.x,
      bBody.y + bBody.height - bBottomH,
      bBody.width,
      bBottomH
    );

    return Phaser.Geom.Intersects.RectangleToRectangle(
      a._bottomRect,
      b._bottomRect
    );
  }
  buildCurvedTacklePolygon(opponent, opts = {}) {
    const tackleDistance = opts.tackleDistance ?? 180;
    const tackleWidth = opts.tackleWidth ?? 220;
    const curveDepth = opts.curveDepth ?? 60; // how much the outer curve bows outward
    const segments = opts.segments ?? 24; // points used to approximate curve

    const tipX = opponent.x;
    const tipY = opponent.y;

    const leftX = opponent.x - tackleWidth / 2;
    const leftY = opponent.y + tackleDistance;
    const rightX = opponent.x + tackleWidth / 2;
    const rightY = leftY;

    // control point for the quadratic/cubic curve (pulls curve downward)
    const controlX = opponent.x;
    const controlY = opponent.y + tackleDistance + curveDepth;

    // Build a QuadraticBezier from leftBase -> control -> rightBase
    const start = new Phaser.Math.Vector2(leftX, leftY);
    const control = new Phaser.Math.Vector2(controlX, controlY);
    const end = new Phaser.Math.Vector2(rightX, rightY);
    const curve = new Phaser.Curves.QuadraticBezier(start, control, end);

    // sample curve points (Vector2[])
    const curvePoints = curve.getPoints(segments, 0); // array of Vector2

    // Build polygon points in order: tip -> leftBase -> ...curvePoints... -> rightBase
    // Phaser.Geom.Polygon constructor accepts array of numbers [x,y,x,y,...] or Vector2 points.
    const pts = [];
    pts.push(tipX, tipY);
    pts.push(leftX, leftY);
    for (let p of curvePoints) {
      pts.push(p.x, p.y);
    }
    pts.push(rightX, rightY);

    // create polygon geom
    const poly = new Phaser.Geom.Polygon(pts);
    return { poly, ptsArray: pts, curvePoints };
  }

  createTackleZone(opponent) {
    // store config for later updates
    opponent.tackleCfg = {
      tackleDistance: 100,
      tackleWidth: 140,
      curveDepth: 60,
      segments: 24,
    };

    const { poly, ptsArray } = this.buildCurvedTacklePolygon(
      opponent,
      opponent.tackleCfg
    );

    opponent.tacklePoly = poly;

    // draw visual once (we will update it every frame)
    const g = this.add.graphics({ x: 0, y: 0 }).setDepth(35);
    g.fillStyle(0xff0000, 0.08);

    // fillPoints accepts [{x,y}, ...] — build that quickly from ptsArray
    const ptsObjs = [];
    for (let i = 0; i < ptsArray.length; i += 2) {
      ptsObjs.push({ x: ptsArray[i], y: ptsArray[i + 1] });
    }
    g.fillPoints(ptsObjs, true);
    g.lineStyle(1, 0xff0000, 0.18);
    g.strokePoints(ptsObjs, true);

    opponent.tackleVisual = g;
    opponent.tackleActive = true;
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.player.enableInput(this.cursors);
    this.setupKeyboardShortcuts();

    // Space key handler for dribbling
    this.spaceKey.on("down", () => {
      if (this.tackleZone.active) {
        this.performDribble();
      }
    });
  }

  setupKeyboardShortcuts() {
    const { width, height } = this.sys.game.config;
    const fitZoom = Math.min(
      width / this.worldWidth,
      height / this.worldHeight
    );

    this.input.keyboard.on("keydown-V", () => {
      const cam = this.cameras.main;
      if (Math.abs(cam.zoom - fitZoom) < 1e-6) {
        cam.setZoom(1);
        cam.centerOn(this.worldWidth / 2, this.worldHeight - height / 2);
      } else {
        cam.setZoom(fitZoom);
        cam.centerOn(this.worldWidth / 2, this.worldHeight / 2);
      }
    });
  }

  setShootingTarget() {
    this.shootingTarget.x = this.worldWidth / 2;
    this.shootingTarget.y = this.fieldData.goalLineTopY + 250;
    this.shootingTarget.isSet = true;
  }

  preloadShootSceneAssets() {
    this.load.video(
      "ballkickingVideo",
      "assets/cropedfootball.mp4",
      "loaded",
      false,
      true
    );
    this.load.start();
  }

  update(time, delta) {
    // this.time.delayedCall(500, () => {
    //   this.scene.pause();
    // });

    if (this.gameOver) return;

    if (this.player) {
      this.player.update(time, delta);
    }

    if (this.player?.isReady()) return;

    this.updateCameraMovement(delta);
    this.updatePlayerMovement(delta);
    this.updateOpponents();
    this.updateTackleZones();
    this.checkShootingPosition();

    // Update tackle zone timer if active
    if (this.tackleZone.active) {
      this.updateTackleZoneTimer(delta);
    }
  }

  updateCameraMovement(delta) {
    const cam = this.cameras.main;
    const maxScrollY = 0;

    if (cam.scrollY > maxScrollY) {
      const dy = (this.cameraSettings.runSpeed * delta) / 1000;
      cam.scrollY = Math.max(maxScrollY, cam.scrollY - dy);
    }
  }

  updatePlayerMovement(delta) {
    const cam = this.cameras.main;
    const { height } = this.sys.game.config;

    if (this.player.isMovingToTarget()) {
      return;
    }

    if (this.shootingTarget.isSet) {
      const distanceToTarget = Math.abs(this.shootingTarget.y - this.player.y);

      if (distanceToTarget <= this.cameraSettings.playerBottomOffset) {
        this.player.setTargetPosition(
          this.shootingTarget.x,
          this.shootingTarget.y
        );

        if (distanceToTarget < 120) {
          this.stopOpponents();
        }
      } else {
        this.player.setPositionRelativeToCamera(cam, height);
      }
    } else {
      this.player.setPositionRelativeToCamera(cam, height);
    }

    // Clamp to field boundaries
    const pad = this.fieldData.pad || 48;
    const minX = pad + 40;
    const maxX = this.worldWidth - pad - 40;
    this.player.clampToBounds(minX, maxX);
  }

  updateOpponents() {
    if (!this.opponents) return;

    const defaultHoming = 50;

    this.opponents.getChildren().forEach((opponent) => {
      if (!opponent.active || !opponent.body) return;

      // Stop if player is ready to shoot
      if (this.player?.isReady()) {
        opponent.body.setVelocity(0, 0);
        if (opponent.anims?.isPlaying) {
          opponent.anims.pause();
        }
        return;
      }

      // Check if opponent should home in on player
      const shouldHome = opponent.getData("homing");
      if (!shouldHome) {
        if (opponent.anims?.isPaused) {
          opponent.anims.resume();
        }
        return;
      }

      // Calculate homing movement
      const dx = this.player.x - opponent.x;
      const dy = this.player.y - opponent.y;
      const dist = Math.hypot(dx, dy) || 1;

      const speed = opponent.getData("homingSpeed") || defaultHoming;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      opponent.body.setVelocity(vx, vy);

      if (opponent.anims?.isPaused) {
        opponent.anims.resume();
      }
    });
  }

  stopOpponents() {
    if (!this.opponents) return;

    this.opponents.getChildren().forEach((opponent) => {
      if (opponent.body) {
        opponent.body.setVelocity(0, 0);
      }
      if (opponent.anims?.isPlaying) {
        opponent.anims.pause();
      }
    });
  }

  checkShootingPosition() {
    if (!this.shootingTarget.isSet || !this.player) return;

    if (this.player.isAtTarget()) {
      this.reachShootingPosition();
    }
  }

  reachShootingPosition() {
    const cam = this.cameras.main;
    cam.stopFollow();

    const targetScrollY = Math.max(
      0,
      this.shootingTarget.y - this.sys.game.config.height * 0.6
    );
    cam.scrollY = targetScrollY;
    cam.centerOnX(this.shootingTarget.x);

    this.player.setTargetPosition(this.shootingTarget.x, this.shootingTarget.y);
    this.player.moveTowardsTarget(16);
    this.player.setReadyToShoot();

    // Transition to ShootScene
    cam.fadeOut(500, 0, 0, 0);
    cam.once("camerafadeoutcomplete", () => {
      const payload = {
        playerX: this.player.x,
        playerY: this.player.y,
        playerFlipX: this.player.flipX ?? false,
        playerFrame: this.player.texture.key ?? "player1",
        shootingTarget: {
          x: this.shootingTarget.x,
          y: this.shootingTarget.y,
        },
      };

      // Stop and destroy this scene, launch ShootScene
      this.scene.stop();
      this.scene.start("ShootScene", payload);
    });
  }

  handlePlayerHit(player, opponent) {
    if (this.gameOver) return;

    // Game over - player lost the ball
    this.gameOver = true;

    // Freeze everything
    this.physics.pause();

    // Stop all animations
    if (player.anims?.isPlaying) {
      player.anims.pause();
    }

    this.opponents.getChildren().forEach((opp) => {
      if (opp.anims?.isPlaying) {
        opp.anims.pause();
      }
    });

    const { width, height } = this.sys.game.config;
    const cam = this.cameras.main;

    // Stop camera movement
    cam.stopFollow();

    // Flash screen red
    cam.flash(200, 255, 0, 0, false);

    const lostText = this.add
      .text(width / 2, height / 2, "LOST BALL!", {
        font: "bold 72px Arial",
        fill: "#ff0000",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10000)
      .setScrollFactor(0);

    // Fade to black and transition to GameOver scene
    this.time.delayedCall(1000, () => {
      cam.fadeOut(500, 0, 0, 0);

      cam.once("camerafadeoutcomplete", () => {
        // Stop and destroy this scene, go to GameOver
        this.scene.stop();
        this.scene.start("GameOverScene", {
          message: "You lose",
          reason: "You lost the ball.",
        });
      });
    });
  }

  updateTackleZones() {
    if (!this.opponents || !this.player) return;

    this.opponents.getChildren().forEach((opponent) => {
      if (!opponent.tackleActive) return;

      const { poly, ptsArray } = this.buildCurvedTacklePolygon(
        opponent,
        opponent.tackleCfg
      );
      opponent.tacklePoly = poly;

      // update visual (clear + fillPoints)
      if (opponent.tackleVisual) {
        opponent.tackleVisual.clear();
        opponent.tackleVisual.fillStyle(0xff0000, 0.08);
        const ptsObjs = [];
        for (let i = 0; i < ptsArray.length; i += 2)
          ptsObjs.push({ x: ptsArray[i], y: ptsArray[i + 1] });
        opponent.tackleVisual.fillPoints(ptsObjs, true);
        opponent.tackleVisual.lineStyle(1, 0xff0000, 0.18);
        opponent.tackleVisual.strokePoints(ptsObjs, true);
      }

      // Check containment using polygon contains
      const px = this.player.x;
      const py = this.player.y;
      if (Phaser.Geom.Polygon.Contains(opponent.tacklePoly, px, py)) {
        if (!this.tackleZone.active) this.enterTackleZone(opponent);
      } else {
        if (
          this.tackleZone.active &&
          this.tackleZone.dangerousOpponent === opponent
        ) {
          this.cleanupTackleZone();
        }
      }
    });
  }

  enterTackleZone(opponent) {
    if (this.tackleZone.active || this.gameOver) return;

    this.tackleZone.active = true;
    this.tackleZone.timer = 3; // seconds (used only for display default)
    this.tackleZone.dangerousOpponent = opponent;

    // Save originals so we can restore later
    this.originalTweensTimeScale = 1;
    this.originalAnimsTimeScale = 1;
    this.cameraSettings.savedRunSpeed = this.cameraSettings.runSpeed;
    // Save original values for restore later
    this._savedPlayerBodyState = null;
    if (this.player && this.player.body) {
      this._savedPlayerBodyState = {
        enabled: this.player.body.enable,
        moves: this.player.body.moves,
        velX: this.player.body.velocity.x,
        velY: this.player.body.velocity.y,
      };
    }

    // Slow factor (0.25 = 25% speed)
    const slowFactor = 0.1;

    // Apply slowdowns
    if (this.tweens) {
      this.tweens.timeScale = slowFactor;
    }
    if (this.anims) {
      this.anims.globalTimeScale = slowFactor;
    }

    this.cameraSettings.runSpeed *= slowFactor;

    if (this.player && this.player.body) {
      this.player.body.setVelocity(0, 0);
      this.player.body.enable = false;
      this.player.body.moves = false;
      this.player.disableInput();
    }

    if (this.opponents) {
      this.opponents.getChildren().forEach((opp) => {
        const saved = opp.getData && opp.getData("homingSpeed");
        opp.savedHomingSpeed = saved ?? null;
        if (saved != null) {
          opp.setData("homingSpeed", saved * slowFactor);
        }
        if (opp.body && opp.body.velocity) {
          opp.body.velocity.x *= slowFactor;
          opp.body.velocity.y *= slowFactor;
        }
      });
    }

    // Start a real-time (wall clock) countdown:
    this.tackleZone._realStartMs = performance.now();
    this.tackleZone._realDurationMs = (this.tackleZone.timer || 3) * 1000;

    const { width, height } = this.sys.game.config;
    this.tackleZone.warningText = this.add
      .text(
        width / 2,
        height / 3,
        "You are about to get tackled!\nPress SPACE to dribble!",
        {
          font: "bold 32px Arial",
          fill: "#ffff00",
          stroke: "#000",
          strokeThickness: 6,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(9999)
      .setScrollFactor(0);

    this.tackleZone.timerText = this.add
      .text(width / 2, height / 2, String(this.tackleZone.timer), {
        font: "bold 120px Arial",
        fill: "#ff0000",
        stroke: "#000",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(9999)
      .setScrollFactor(0);
  }

  updateTackleZoneTimer() {
    if (!this.tackleZone.active || !this.tackleZone._realStartMs) return;

    const elapsedMs = performance.now() - this.tackleZone._realStartMs;
    const remainingMs = Math.max(
      0,
      (this.tackleZone._realDurationMs || 3000) - elapsedMs
    );
    const seconds = Math.ceil(remainingMs / 1000);

    if (this.tackleZone.timerText) {
      this.tackleZone.timerText.setText(String(seconds));
    }

    if (remainingMs <= 0) {
      // countdown finished in real time -> player is tackled
      this.cleanupTackleZone();
      this.handlePlayerHit(this.player, this.tackleZone.dangerousOpponent);
    }
  }

  performDribble() {
    // Player successfully dribbled
    this.cleanupTackleZone();

    // Quick dodge movement (left or right)
    const dodgeDistance = 100;
    const dodgeDirection = this.player.x < this.worldWidth / 2 ? 1 : -1;

    this.tweens.add({
      targets: this.player,
      x: this.player.x + dodgeDistance * dodgeDirection,
      duration: 200,
      ease: "Cubic.easeOut",
    });

    // Show success message briefly
    const { width, height } = this.sys.game.config;

    const successText = this.add
      .text(width / 2, height / 2, "NICE DRIBBLE!", {
        font: "bold 48px Arial",
        fill: "#00ff00",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(9999)
      .setScrollFactor(0);

    this.tweens.add({
      targets: successText,
      alpha: 0,
      duration: 800,
      ease: "Cubic.easeOut",
      onComplete: () => successText.destroy(),
    });

    // Resume normal time for both physics and game
    this.time.timeScale = 1;
  }

  cleanupTackleZone() {
    // restore flags
    this.tackleZone.active = false;

    // Restore global time scales
    if (this.physics && this.physics.world)
      if (this.tweens && this.originalTweensTimeScale != null) {
        this.tweens.timeScale = this.originalTweensTimeScale;
      }
    if (this.anims && this.originalAnimsTimeScale != null) {
      this.anims.globalTimeScale = this.originalAnimsTimeScale;
    }

    // restore movement speeds
    if (this.cameraSettings && this.cameraSettings.runSpeed != null) {
      this.cameraSettings.runSpeed = this.cameraSettings.savedRunSpeed;
      this.cameraSettings.savedRunSpeed = null;
    }

    if (this.player && this.player.body) {
      // Re-enable body as it was before disabling
      if (this._savedPlayerBodyState) {
        this.player.body.enable = !!this._savedPlayerBodyState.enabled;
        this.player.body.moves = !!this._savedPlayerBodyState.moves;
        // Reset body position to match sprite to avoid sudden jump
        if (typeof this.player.body.reset === "function") {
          this.player.body.reset(this.player.x, this.player.y);
        } else {
          // fallback: move body position fields (approx)
          this.player.body.x =
            this.player.x - (this.player.body.width * this.player.originX || 0);
          this.player.body.y =
            this.player.y -
            (this.player.body.height * this.player.originY || 0);
        }
        // zero velocity (safe)
        this.player.body.setVelocity(0, 0);
        this._savedPlayerBodyState = null;
      } else {
        // no saved state, ensure body is active and zero velocity
        this.player.body.enable = true;
        this.player.body.moves = true;
        if (typeof this.player.body.reset === "function") {
          this.player.body.reset(this.player.x, this.player.y);
        }
        this.player.body.setVelocity(0, 0);
      }
    }

    // restore input
    if (this.player) {
      if (typeof this.player.enableInput === "function") {
        this.player.enableInput(this.cursors);
      } else {
        this.player.setData("movementLocked", false);
      }
    }

    if (this.opponents) {
      this.opponents.getChildren().forEach((opp) => {
        if (opp.savedHomingSpeed != null) {
          opp.setData("homingSpeed", opp.savedHomingSpeed);
          opp.savedHomingSpeed = null;
        }
      });
    }

    if (this.tackleZone.warningText) {
      this.tackleZone.warningText.destroy();
      this.tackleZone.warningText = null;
    }
    if (this.tackleZone.timerText) {
      this.tackleZone.timerText.destroy();
      this.tackleZone.timerText = null;
    }

    this.tackleZone.dangerousOpponent = null;
    this.tackleZone._realStartMs = null;
    this.tackleZone._realDurationMs = null;
  }

  shutdown() {
    // Clean up when scene is stopped
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    if (this.opponents) {
      // Clean up tackle zones
      this.opponents.getChildren().forEach((opponent) => {
        if (opponent.tackleZone) {
          opponent.tackleZone.destroy();
          opponent.tackleZone = null;
        }
      });
      this.opponents.clear(true, true);
      this.opponents = null;
    }

    if (this.keeper) {
      this.keeper.destroy();
      this.keeper = null;
    }

    // Clean up tackle zone UI
    this.cleanupTackleZone();

    this.cursors = null;
    this.spaceKey = null;
    this.fieldData = null;
  }
}
