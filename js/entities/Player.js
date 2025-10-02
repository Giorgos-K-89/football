export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    const { idleFrame = "player1" } = options;
    super(scene, x, y, idleFrame);

    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuration
    this.config = {
      scale: options.scale || 0.08,
      runSpeed: options.runSpeed || 100,
      bottomOffset: options.bottomOffset || 200,
      frameKeys: options.frameKeys || ["player1", "player2"],
      idleFrame: options.idleFrame || "player1",
      runAnimKey: options.runAnimKey || "player_anim",
      shootFrame: options.shootFrame || "shoot1",
      ...options,
    };

    // State
    this.state = {
      isMoving: false,
      facingLeft: false,
      isReadyToShoot: false,
      targetPosition: null,
    };

    // Movement
    this.movement = {
      targetX: 0,
      targetY: 0,
      moveToTarget: false,
      tolerance: 8,
    };

    this.setupPhysics();
    this.setupAppearance();
    this.createAnimations();
  }

  setupPhysics() {
    this.body.allowGravity = false;
    this.body.immovable = false;
    this.body.moves = true;
    this.body.setVelocity(0, 0);
    this.setCollideWorldBounds(true);
  }

  setupAppearance() {
    this.setScale(this.config.scale);
    this.setDepth(50);
    this.setData("role", "player");
  }

  createAnimations() {
    if (!this.scene.anims.exists(this.config.runAnimKey)) {
      this.scene.anims.create({
        key: this.config.runAnimKey,
        frames: this.config.frameKeys.map((key) => ({ key })),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  enableInput(cursors) {
    this.cursors = cursors;
  }

  disableInput() {
    this.cursors = null;
  }

  setTargetPosition(x, y) {
    this.movement.targetX = x;
    this.movement.targetY = y;
    this.movement.moveToTarget = true;
  }

  clearTarget() {
    this.movement.moveToTarget = false;
    this.movement.targetX = 0;
    this.movement.targetY = 0;
  }

  isAtTarget() {
    if (!this.movement.moveToTarget) return false;

    const dx = this.movement.targetX - this.x;
    const dy = this.movement.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.movement.tolerance;
  }

  moveTowardsTarget(delta) {
    if (!this.movement.moveToTarget) return;

    const dx = this.movement.targetX - this.x;
    const dy = this.movement.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.movement.tolerance) {
      this.clearTarget();
      return;
    }

    // Normalized direction
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Movement for this frame
    const moveDistance = this.config.runSpeed * (delta / 1000);
    const moveX = dirX * moveDistance;
    const moveY = dirY * moveDistance;

    this.x += moveX;
    this.y += moveY;

    // Update facing direction
    if (Math.abs(dx) > this.movement.tolerance) {
      this.setFacingDirection(dx < 0);
    }

    // Update physics body
    if (this.body) {
      this.body.setVelocity((moveX / delta) * 1000, (moveY / delta) * 1000);
    }
  }

  handleKeyboardInput(delta) {
    if (!this.cursors) return;

    let moveX = 0;
    let isMoving = false;

    if (this.cursors.left.isDown) {
      moveX = -this.config.runSpeed * (delta / 1000);
      isMoving = true;
      this.setFacingDirection(true);
    } else if (this.cursors.right.isDown) {
      moveX = this.config.runSpeed * (delta / 1000);
      isMoving = true;
      this.setFacingDirection(false);
    }

    if (moveX !== 0) {
      this.x += moveX;
    }

    this.state.isMoving = isMoving;

    // Update physics body
    if (this.body) {
      this.body.setVelocity(moveX * (1000 / delta), this.body.velocity.y);
    }
  }

  setFacingDirection(facingLeft) {
    this.state.facingLeft = facingLeft;
    this.setFlipX(facingLeft);
  }

  updateAnimation() {
    // keep shoot/ready state untouched
    if (this.state.isReadyToShoot) return;

    // always play the running animation
    if (
      !this.anims.isPlaying ||
      this.anims.currentAnim?.key !== this.config.runAnimKey
    ) {
      this.play(this.config.runAnimKey, true);
    }
  }

  setReadyToShoot() {
    this.state.isReadyToShoot = true;
    this.clearTarget();

    // Change to shooting frame
    if (this.scene.textures.exists(this.config.shootFrame)) {
      this.setTexture(this.config.shootFrame);
    }

    // Stop all movement and animation
    if (this.anims && this.anims.isPlaying) {
      this.anims.stop();
    }

    // Ensure completely stationary
    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.moves = false;
    }
  }

  setPositionRelativeToCamera(camera, screenHeight) {
    const targetY = camera.scrollY + screenHeight - this.config.bottomOffset;
    this.y = targetY;
  }

  clampToBounds(minX, maxX) {
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
  }

  update(time, delta) {
    // Handle target movement first
    if (this.movement.moveToTarget) {
      this.moveTowardsTarget(delta);
    } else if (!this.state.isReadyToShoot) {
      // Handle keyboard input only if not moving to target and not ready to shoot
      this.handleKeyboardInput(delta);
    }

    // Update animation
    this.updateAnimation();
  }

  // Utility methods for external access
  getPosition() {
    return { x: this.x, y: this.y };
  }

  isMovingToTarget() {
    return this.movement.moveToTarget;
  }

  isReady() {
    return this.state.isReadyToShoot;
  }
}
