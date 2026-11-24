import './style.css';
import { PelicanGame } from './game.js';
import { GameAudio } from './audio.js';

const byId = id => document.getElementById(id);
const ui = {
  root: byId('game-root'),
  loading: byId('loading'),
  hud: byId('hud'),
  menu: byId('menu'),
  menuCard: byId('menu-card'),
  menuMinimize: byId('menu-minimize-btn'),
  menuExpand: byId('menu-expand-btn'),
  pausePanel: byId('pause-panel'),
  resultPanel: byId('result-panel'),
  mobileControls: byId('mobile-controls'),
  shade: document.querySelector('.scene-shade'),
  distance: byId('distance'),
  fish: byId('fish'),
  score: byId('score'),
  health: byId('health'),
  best: byId('best-score'),
  camera: byId('camera-btn'),
  sound: byId('sound-btn'),
  toast: byId('toast'),
  resultEyebrow: byId('result-eyebrow'),
  resultTitle: byId('result-title'),
  resultStars: byId('result-stars'),
  finalScore: byId('final-score'),
  finalDistance: byId('final-distance'),
  finalFish: byId('final-fish'),
  finalHealth: byId('final-health'),
  resultNote: byId('result-note'),
};

const audio = new GameAudio();
let toastTimer = 0;
let flashTimer = 0;

function showToast(message, duration = 2200) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  toastTimer = window.setTimeout(() => ui.toast.classList.add('hidden'), duration);
}

function flashScene() {
  window.clearTimeout(flashTimer);
  ui.shade.style.background = 'rgba(255, 92, 68, 0.3)';
  flashTimer = window.setTimeout(() => { ui.shade.style.background = ''; }, 140);
}

function updateHud(data) {
  ui.distance.textContent = `${data.distance} m`;
  ui.fish.textContent = String(data.fish);
  ui.score.textContent = String(data.score);
  ui.health.textContent = `${data.health} / 3`;
  ui.health.style.color = data.health === 1 ? '#ffb4a6' : data.health === 2 ? '#ffd166' : '';
}

function updateCameraButton(mode) {
  const orbiting = mode === 'orbit';
  ui.camera.textContent = orbiting ? '后视' : '环视';
  ui.camera.setAttribute('aria-label', orbiting ? '切换到后视视角' : '切换到自由环视');
  ui.camera.setAttribute('aria-pressed', String(orbiting));
}

function updateState(state) {
  ui.menu.classList.toggle('hidden', state !== 'menu');
  ui.pausePanel.classList.toggle('hidden', state !== 'paused');
  ui.resultPanel.classList.toggle('hidden', state !== 'won' && state !== 'gameover');
  ui.hud.classList.toggle('hidden', state === 'menu' || state === 'won' || state === 'gameover');
  ui.mobileControls.classList.toggle('hidden', state !== 'playing');
  ui.best.textContent = String(game?.bestScore || 0);
}

function showResult(result) {
  ui.resultEyebrow.textContent = result.won ? 'RUN COMPLETE' : 'RUN ENDED';
  ui.resultTitle.textContent = result.won ? '漂亮的一程' : '下次一定更远';
  ui.finalScore.textContent = String(result.score);
  ui.finalDistance.textContent = `${result.distance} m`;
  ui.finalFish.textContent = String(result.fish);
  ui.finalHealth.textContent = `${result.health} / 3`;
  ui.best.textContent = String(result.best);
  [...ui.resultStars.children].forEach((star, index) => star.classList.toggle('active', index < result.stars));
  ui.resultStars.setAttribute('aria-label', `${result.stars} 星评价`);
  if (!result.won) ui.resultNote.textContent = '木箱要绕开，木栏要跳过，横杆要低头';
  else if (result.stars === 3) ui.resultNote.textContent = '满体力、25 条小鱼，完美通关！';
  else if (result.stars === 2) ui.resultNote.textContent = result.fish >= 25 ? '再保住满体力，就能拿到三星' : '收集 25 条小鱼，就能拿到三星';
  else ui.resultNote.textContent = '到达终点就值得鼓掌，再试一次挑战三星';
}

let game;
try {
  game = new PelicanGame(ui.root, {
    onHud: updateHud,
    onState: updateState,
    onCameraChange: updateCameraButton,
    onToast: showToast,
    onEvent: event => {
      audio.play(event);
      if (event === 'hit') flashScene();
    },
    onResult: showResult,
  });
  game.render();
  updateCameraButton(game.cameraMode);
  if (import.meta.env.DEV) window.__pelicanGame = game;
  requestAnimationFrame(() => {
    ui.loading.style.opacity = '0';
    window.setTimeout(() => ui.loading.classList.add('hidden'), 360);
  });
} catch (error) {
  const message = document.createElement('p');
  message.textContent = '无法启动 3D 场景，请确认浏览器已开启 WebGL。';
  ui.loading.replaceChildren(message);
  console.error(error);
}

function setMenuMinimized(minimized) {
  ui.menu.classList.toggle('menu-minimized', minimized);
  ui.menuCard.classList.toggle('hidden', minimized);
  ui.menuCard.setAttribute('aria-hidden', String(minimized));
  ui.menuCard.inert = minimized;
  ui.menuExpand.classList.toggle('hidden', !minimized);
  ui.menuMinimize.setAttribute('aria-expanded', String(!minimized));
  ui.menuExpand.setAttribute('aria-expanded', String(minimized));
  if (minimized) ui.menuExpand.focus({ preventScroll: true });
  else ui.menuMinimize.focus({ preventScroll: true });
}

function startRun() {
  audio.init();
  game.start();
}

byId('start-btn').addEventListener('click', startRun);
ui.camera.addEventListener('click', () => game.toggleCamera());
ui.menuMinimize.addEventListener('click', () => setMenuMinimized(true));
ui.menuExpand.addEventListener('click', () => setMenuMinimized(false));
byId('pause-btn').addEventListener('click', () => game.pause());
byId('resume-btn').addEventListener('click', () => game.resume());
byId('restart-btn').addEventListener('click', startRun);
byId('again-btn').addEventListener('click', startRun);
byId('home-btn').addEventListener('click', () => game.home());
ui.sound.addEventListener('click', () => {
  audio.init();
  const muted = audio.toggle();
  ui.sound.textContent = muted ? '音效 关' : '音效 开';
  ui.sound.setAttribute('aria-pressed', String(muted));
});

window.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.repeat || event.target.closest?.('button')) return;
  if (game.state === 'menu' || game.state === 'won' || game.state === 'gameover') startRun();
  else if (game.state === 'paused') game.resume();
});

for (const button of ui.mobileControls.querySelectorAll('button')) {
  const action = button.dataset.action;
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (action === 'left') game.moveLane(-1);
    if (action === 'right') game.moveLane(1);
    if (action === 'jump') game.jump();
    if (action === 'duck') game.setDuck(true);
  });
  const release = () => {
    if (action === 'duck') game.setDuck(false);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
}
