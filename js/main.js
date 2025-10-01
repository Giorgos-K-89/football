import { phaserConfig } from "./config.js";

const gameStartDiv = document.getElementById("gameStartDiv");
const gameStartBtn = document.getElementById("gameStartBtn");
const gameEndDiv = document.getElementById("gameEndDiv");
const gameRestartBtn = document.getElementById("gameRestartBtn");
const gameWinLoseSpan = document.getElementById("gameWinLoseSpan");
const gameWinLoseReason = document.getElementById("gameWinLoseReason");
const canvas = document.getElementById("gameCanvas");

let game = null;

gameStartBtn.addEventListener("click", () => {
  gameStartDiv.style.display = "none";
  if (!game) game = new Phaser.Game(phaserConfig);
  else game.scene.start("FieldPreviewScene");
});

gameRestartBtn.addEventListener("click", () => {
  gameEndDiv.style.display = "none";
  canvas.style.display = "flex";
  game.scene.keys["FieldPreviewScene"].scene.restart();
});

// Expose DOM elements so scenes can call them
export { gameEndDiv, gameWinLoseSpan, gameWinLoseReason, canvas };
