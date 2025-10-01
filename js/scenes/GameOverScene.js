import {
  gameEndDiv,
  gameWinLoseSpan,
  gameWinLoseReason,
  canvas,
} from "../main.js";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    console.log(data);
    const { message, reason } = data;
    this.message = message;
    this.reason = reason;
  }

  create() {
    this.scene.stop("ShotScene");
    gameWinLoseSpan.textContent = this.message;
    gameWinLoseReason.textContent = this.reason;
    gameEndDiv.style.display = "flex";
    canvas.style.display = "none";
  }
}
