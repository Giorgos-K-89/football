export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    this.scene.start("FieldPreviewScene");
  }
}
