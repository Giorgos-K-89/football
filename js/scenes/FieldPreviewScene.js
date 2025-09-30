import Player from "../entities/Player.js";
import { createField } from "../utils/createField.js";
import { createNets } from "../utils/createNets.js";
import { createPlayersFormation } from "../utils/createPlayersFormation.js";

export default class FieldPreviewScene extends Phaser.Scene {
  constructor() {
    super("FieldPreviewScene");
  }

  init() {
    // Scene state
    this.gameOver = false;
    this.cameraAtTop = false;

    // World dimensions
    this.worldHeight = 0;
    this.worldWidth = 0;

    // Field data
    this.fieldData = null;

    // Camera settings
    this.cameraSettings = {
      runSpeed: 220, // px/sec - how fast camera moves up
      playerBottomOffset: 200, // px from bottom of screen
      followLerpX: 0.12,
    };

    // Game entities
    this.player = null;
    this.opponents = null;
    this.keeper = null;

    // Target shooting position
    this.shootingTarget = {
      x: 0,
      y: 0,
      tolerance: 8,
      isSet: false,
    };

    // Input
    this.cursors = null;
    this.spaceKey = null;
  }

  preload() {
    // Player assets
    this.load.image("player1", "assets/player1-1.png");
    this.load.image("player2", "assets/player1-2.png");
    this.load.image("shoot1", "assets/shoot1-1.png");
    this.load.image("shoot2", "assets/shoot1-2.png");

    // Game assets
    this.load.image("ball", "assets/ball.png");
    this.load.video(
      "ballkickingVideo",
      "assets/cropedfootball.mp4",
      "loaded",
      false,
      true
    );

    // Opponent assets
    this.load.image("opponent1", "assets/opponent1-1.png");
    this.load.image("opponent2", "assets/opponent1-2.png");
    this.load.image("keeper1", "assets/keeper1-1.png");
    this.load.image("keeper2", "assets/keeper1-2.png");

    //fans
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
    // this.setupUI();
    this.setShootingTarget();
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
      pad: 48,
      paddingPercentage: 0.1, // 10% padding
      textureKey: "fieldFull",
      showZones: true,
    });

    // Add field image
    this.add.image(0, 0, "fieldFull").setOrigin(0, 0).setDepth(0);

    // Create goal nets
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
    cam.setBounds(0, 0, this.worldWidth, this.worldHeight * 0.85); // starting camera at 85% of world height so i dont show the bottom part
    cam.setZoom(1);

    // Start at bottom of field
    cam.centerOn(
      this.worldWidth / 2,
      this.worldHeight - this.sys.game.config.height / 2
    );

    // Setup physics world
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

    // Start camera following player
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

    // Set depths
    this.opponents.getChildren().forEach((opponent) => opponent.setDepth(40));
    if (this.keeper) this.keeper.setDepth(230);

    // Setup collision
    this.physics.add.overlap(
      this.opponents,
      this.player,
      this.handlePlayerHit,
      null,
      this
    );
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.player.enableInput(this.cursors);

    // Setup keyboard shortcuts
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
    this.shootingTarget.x = this.worldWidth / 2; // Center of field
    this.shootingTarget.y = this.fieldData.goalLineTopY + 250; // 250px from goal
    this.shootingTarget.isSet = true;

    console.log(
      `Shooting target: (${this.shootingTarget.x}, ${this.shootingTarget.y})`
    );
  }

  update(time, delta) {
    if (this.gameOver) return;

    // Update player
    if (this.player) {
      this.player.update(time, delta);
    }

    // Skip other updates if ready to shoot or shot taken
    if (this.player?.isReady()) return;

    this.updateCameraMovement(delta);
    this.updatePlayerMovement(delta);
    this.updateOpponents();
    this.checkShootingPosition();
  }

  updateCameraMovement(delta) {
    const cam = this.cameras.main;
    const maxScrollY = 0; // Top of world

    if (cam.scrollY > maxScrollY) {
      const dy = (this.cameraSettings.runSpeed * delta) / 1000;
      cam.scrollY = Math.max(maxScrollY, cam.scrollY - dy);
    }
  }

  updatePlayerMovement(delta) {
    const cam = this.cameras.main;
    const { height } = this.sys.game.config;

    // If player is moving to target, let the Player class handle it
    if (this.player.isMovingToTarget()) {
      return;
    }

    // Keep player at fixed position relative to camera
    if (this.shootingTarget.isSet) {
      const distanceToTarget = Math.abs(this.shootingTarget.y - this.player.y);

      // When close to target, start moving toward exact position
      if (distanceToTarget <= this.cameraSettings.playerBottomOffset) {
        this.player.setTargetPosition(
          this.shootingTarget.x,
          this.shootingTarget.y
        );

        // Stop opponents when getting close
        if (distanceToTarget < 120) {
          this.stopOpponents();
        }
      } else {
        // Normal movement - keep player relative to camera
        this.player.setPositionRelativeToCamera(cam, height);
      }
    } else {
      // Fallback - stay relative to camera
      this.player.setPositionRelativeToCamera(cam, height);
    }

    // Clamp player to field boundaries
    const fieldMargin = this.fieldData.fieldLeft + 40;
    const minX = fieldMargin;
    const maxX = this.worldWidth - fieldMargin;
    this.player.clampToBounds(minX, maxX);
  }

  updateOpponents() {
    if (!this.opponents?.getChildren) return;

    const defaultHoming = 50;

    this.opponents.getChildren().forEach((opponent) => {
      if (!opponent.active || !opponent.body) return;

      if (this.player?.isReady()) {
        opponent.body.setVelocity(0, 0);
        if (opponent.anims?.isPlaying) opponent.anims.pause();
        return;
      }

      if (!opponent.getData("homing")) {
        if (opponent.anims?.isPaused) opponent.anims.resume();
        return;
      }

      // Calculate homing movement
      const px = this.player.x;
      const py = this.player.y;
      const dx = px - opponent.x;
      const dy = py - opponent.y;
      const dist = Math.hypot(dx, dy) || 1;

      const speed = opponent.getData("homingSpeed") || defaultHoming;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      opponent.body.setVelocity(vx, vy);

      if (opponent.anims?.isPaused) opponent.anims.resume();
    });
  }

  stopOpponents() {
    if (!this.opponents?.getChildren) return;

    this.opponents.getChildren().forEach((opponent) => {
      if (opponent.body) opponent.body.setVelocity(0);
    });
  }

  checkShootingPosition() {
    if (!this.shootingTarget.isSet || !this.player) return;

    if (this.player.isAtTarget()) {
      this.reachShootingPosition();
    }
  }

  reachShootingPosition() {
    // Stop camera follow and snap camera to show shooting area nicely
    const cam = this.cameras.main;
    cam.stopFollow();

    const targetScrollY = Math.max(
      0,
      this.shootingTarget.y - this.sys.game.config.height * 0.6
    );
    cam.scrollY = targetScrollY;
    cam.centerOnX(this.shootingTarget.x);

    // Ensure player is exactly at the spot
    this.player.setTargetPosition(this.shootingTarget.x, this.shootingTarget.y);
    // force immediate settle (optional small tween could be used)
    this.player.moveTowardsTarget(16); // move a small step so isAtTarget can be true

    // Make player ready (stops movement in the Field scene)
    this.player.setReadyToShoot();

    // Toast / UI in Field (optional)

    // Fade out FieldPreviewScene camera, then launch ShootScene and pause FieldPreviewScene
    cam.fadeOut(500, 0, 0, 0);
    cam.once("camerafadeoutcomplete", () => {
      // Build data to pass to ShootScene:
      const payload = {
        // world coordinates (so ShootScene can show the player at same visual x)
        playerX: this.player.x,
        playerY: this.player.y,
        playerFlipX: this.player.flipX ?? false,
        playerFrame: this.player.texture.key ?? "player1",
        shootingTarget: { x: this.shootingTarget.x, y: this.shootingTarget.y },
      };

      // Launch ShootScene and pause the FieldPreviewScene so it can be resumed later
      this.scene.launch("ShootScene", payload);
      this.scene.pause(); // pause this scene's update loop
    });
  }

  handlePlayerHit(player, opponent) {
    // Handle collision between player and opponents
    return;
  }
}
