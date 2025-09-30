import { gameEndDiv, gameWinLoseSpan, gameEndScore, canvas } from "../main.js";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    const { scored } = data;
    this.scored = scored;
  }

  create() {
    this.scene.stop("ShotScene");
    console.log(this.scored);

    gameWinLoseSpan.textContent = this.scored ? "Win!" : "Lose!";
    gameEndDiv.style.display = "flex";
    canvas.style.display = "none";
  }
}
