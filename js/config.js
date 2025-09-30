import StartScene from "./scenes/StartScene.js";
import FieldPreviewScene from "./scenes/FieldPreviewScene.js";
import GameOverScene from "./scenes/GameOverScene.js";
import ShootScene from "./scenes/ShootScene.js";

const gameWidth = window.innerWidth;
const gameHeight = window.innerHeight;

export const phaserConfig = {
  type: Phaser.CANVAS,
  width: 1000,
  height: gameHeight,
  canvas: document.getElementById("gameCanvas"),
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [StartScene, FieldPreviewScene, ShootScene, GameOverScene],
};
