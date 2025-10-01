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

    this.cursors = null;
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
    this.worldHeight = height * 3;
    this.worldWidth = width * 2;
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

    this.opponents.getChildren().forEach((opponent) => opponent.setDepth(40));
    if (this.keeper) this.keeper.setDepth(230);

    this.physics.add.overlap(
      this.player,
      this.opponents,
      this.handlePlayerHit,
      null,
      this
    );
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.player.enableInput(this.cursors);
    this.setupKeyboardShortcuts();
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
    if (this.gameOver) return;

    if (this.player) {
      this.player.update(time, delta);
    }

    if (this.player?.isReady()) return;

    this.updateCameraMovement(delta);
    this.updatePlayerMovement(delta);
    this.updateOpponents();
    this.checkShootingPosition();
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

    // Stop camera movement
    this.cameras.main.stopFollow();

    // Flash screen red
    this.cameras.main.flash(200, 255, 0, 0, false);

    // Show "LOST BALL!" text briefly
    const { width, height } = this.sys.game.config;
    const cam = this.cameras.main;

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
      this.cameras.main.fadeOut(500, 0, 0, 0);

      this.cameras.main.once("camerafadeoutcomplete", () => {
        // Stop and destroy this scene, go to GameOver
        this.scene.stop();
        this.scene.start("GameOverScene", {
          message: "You lose",
          reason: "You lost the ball.",
        });
      });
    });
  }

  shutdown() {
    // Clean up when scene is stopped
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    if (this.opponents) {
      this.opponents.clear(true, true);
      this.opponents = null;
    }

    if (this.keeper) {
      this.keeper.destroy();
      this.keeper = null;
    }

    this.cursors = null;
    this.fieldData = null;
  }
}
