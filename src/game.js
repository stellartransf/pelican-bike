import * as THREE from 'three';
import { createPelicanBike, createFish, createObstacle, createPalm, createRock, createCloud, createUmbrella } from './models.js';

const LANE_X = [-2.45, 0, 2.45];
const TARGET_DISTANCE = 600;
const WORLD_LENGTH = 210;

function seededRandom(seed = 1234567) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function disposeObject(object) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

function createFinishGate() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#234b59', roughness: 0.65 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff3d6', roughness: 0.7 });
  for (const x of [-4.25, 4.25]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 5, 10), dark);
    post.position.set(x, 2.5, 0);
    group.add(post);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff3d6';
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 24);
  context.fill();
  context.fillStyle = '#ef5f49';
  context.font = '900 82px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('FINISH', canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.38), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  banner.position.set(0, 4.55, 0);
  group.add(banner);
  for (let i = 0; i < 14; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.8), i % 2 ? dark : cream);
    tile.position.set(-4.03 + i * 0.62, 0.015, 0);
    group.add(tile);
  }
  return group;
}

export class PelicanGame {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.callbacks = callbacks;
    this.random = seededRandom();
    this.state = 'menu';
    this.distance = 0;
    this.fish = 0;
    this.health = 3;
    this.score = 0;
    this.speed = 0;
    this.lane = 1;
    this.jumpHeight = 0;
    this.verticalVelocity = 0;
    this.ducking = false;
    this.invincible = 0;
    this.hitFlash = 0;
    this.cameraShake = 0;
    this.cameraMode = 'follow';
    this.orbitYaw = -0.55;
    this.orbitPitch = 0.28;
    this.orbitDistance = 8.6;
    this.orbitPointers = new Map();
    this.orbitPinchDistance = 0;
    this.elapsed = 0;
    this.nextObstacleAt = 48;
    this.nextFishAt = 18;
    this.hudTimer = 0;
    this.lastTime = 0;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.scenery = [];
    this.clouds = [];
    this.roadDashes = [];
    this.waveLines = [];
    this.keys = new Set();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bestScore = this.readBestScore();
    this.initScene();
    this.bindEvents();
    this.resetRun();
    this.setState('menu');
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  readBestScore() {
    try {
      const value = Number(localStorage.getItem('pelican-pedal-best') || 0);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  saveBestScore() {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      localStorage.setItem('pelican-pedal-best', String(this.bestScore));
    } catch {
      this.callbacks.onToast?.('本局成绩已更新，但浏览器未允许保存');
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8ed8f8');
    this.scene.fog = new THREE.Fog('#a7dff2', 75, 190);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
    const orbitDistance = Math.cos(this.orbitPitch) * this.orbitDistance;
    this.camera.position.set(
      Math.sin(this.orbitYaw) * orbitDistance,
      1.55 + Math.sin(this.orbitPitch) * this.orbitDistance,
      Math.cos(this.orbitYaw) * orbitDistance
    );
    this.camera.lookAt(0, 1.55, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.replaceChildren(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight('#e9f8ff', '#7c6950', 2.2);
    this.scene.add(hemisphere);
    const sunLight = new THREE.DirectionalLight('#fff2d2', 3.1);
    sunLight.position.set(-24, 38, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1536, 1536);
    sunLight.shadow.camera.left = -28;
    sunLight.shadow.camera.right = 28;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.bias = -0.00035;
    this.scene.add(sunLight);

    this.buildWorld();
    this.player = createPelicanBike();
    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);

    const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#193b46', transparent: true, opacity: 0.2, depthWrite: false });
    this.playerShadow = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), shadowMaterial);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.y = 0.012;
    this.playerShadow.scale.set(0.75, 1.25, 1);
    this.scene.add(this.playerShadow);

    this.finishGate = createFinishGate();
    this.finishGate.position.z = -TARGET_DISTANCE;
    this.scene.add(this.finishGate);
  }

  buildWorld() {
    const oceanMaterial = new THREE.MeshStandardMaterial({ color: '#3aa9c7', roughness: 0.3, metalness: 0.08 });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(650, 650), oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.62, -150);
    ocean.receiveShadow = true;
    this.scene.add(ocean);

    const sandMaterial = new THREE.MeshStandardMaterial({ color: '#f1d39a', roughness: 0.95 });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(32, WORLD_LENGTH + 80), sandMaterial);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, -0.09, -85);
    sand.receiveShadow = true;
    this.scene.add(sand);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: '#e7c991', roughness: 0.92 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8.6, WORLD_LENGTH + 60), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.025, -90);
    road.receiveShadow = true;
    this.scene.add(road);

    const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#fff4d8', roughness: 0.8 });
    for (const x of [-4.08, 4.08]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, WORLD_LENGTH + 60), edgeMaterial);
      edge.position.set(x, 0.005, -90);
      edge.receiveShadow = true;
      this.scene.add(edge);
    }

    const dashMaterial = new THREE.MeshStandardMaterial({ color: '#fff7df', roughness: 0.8 });
    for (const x of [-1.225, 1.225]) {
      for (let z = 24; z > -220; z -= 8) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 3.4), dashMaterial);
        dash.position.set(x, 0.008, z);
        dash.receiveShadow = true;
        this.scene.add(dash);
        this.roadDashes.push(dash);
      }
    }

    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? -1 : 1;
      const palm = createPalm(0.78 + this.random() * 0.38);
      palm.position.set(side * (7.2 + this.random() * 7.5), -0.04, 25 - i * 10.2);
      palm.rotation.y = this.random() * Math.PI * 2;
      palm.userData.speedFactor = 1;
      this.scene.add(palm);
      this.scenery.push(palm);
    }

    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? -1 : 1;
      const rock = createRock(0.45 + this.random() * 0.75);
      rock.position.set(side * (5.4 + this.random() * 8), -0.04, 20 - i * 10.5);
      rock.rotation.y = this.random() * Math.PI * 2;
      rock.userData.speedFactor = 1;
      this.scene.add(rock);
      this.scenery.push(rock);
    }

    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? -1 : 1;
      const umbrella = createUmbrella();
      umbrella.position.set(side * (6.4 + this.random() * 4), -0.02, 8 - i * 29);
      umbrella.rotation.y = this.random() * Math.PI * 2;
      umbrella.userData.speedFactor = 1;
      this.scene.add(umbrella);
      this.scenery.push(umbrella);
    }

    for (let i = 0; i < 9; i++) {
      const cloud = createCloud(2.4 + this.random() * 2.6);
      cloud.position.set(-70 + this.random() * 140, 20 + this.random() * 18, -40 - i * 22);
      cloud.userData.speedFactor = 0.12;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }

    const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff2b5' }));
    sun.position.set(-65, 52, -155);
    this.scene.add(sun);

    const waveMaterial = new THREE.MeshBasicMaterial({ color: '#d8f7ff', transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 28; i++) {
      const wave = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.28, 28), waveMaterial);
      wave.rotation.x = -Math.PI / 2;
      wave.scale.set(2 + this.random() * 3, 0.6 + this.random(), 1);
      wave.position.set((this.random() - 0.5) * 120, -0.6, 20 - this.random() * 210);
      this.scene.add(wave);
      this.waveLines.push(wave);
    }
  }

  getOrbitTarget() {
    if (this.state === 'menu') return new THREE.Vector3(0, 1.55, 0);
    return new THREE.Vector3(this.player.position.x, 1.55 + this.jumpHeight * 0.25, 0);
  }

  enterOrbitMode() {
    const offset = this.camera.position.clone().sub(this.getOrbitTarget());
    const distance = Math.max(offset.length(), 0.001);
    this.orbitDistance = THREE.MathUtils.clamp(distance, 5.8, 13);
    this.orbitYaw = Math.atan2(offset.x, offset.z);
    this.orbitPitch = THREE.MathUtils.clamp(Math.asin(offset.y / distance), 0.08, 1.05);
    this.cameraMode = 'orbit';
    this.callbacks.onCameraChange?.(this.cameraMode);
  }

  toggleCamera() {
    if (this.state === 'menu') return;
    if (this.cameraMode === 'orbit') {
      this.cameraMode = 'follow';
      this.callbacks.onCameraChange?.(this.cameraMode);
    } else {
      this.enterOrbitMode();
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointerdown', event => {
      if ((this.state !== 'menu' && this.state !== 'playing') || event.target.closest?.('button')) return;
      event.preventDefault();
      if (this.state === 'playing' && this.cameraMode === 'follow') this.enterOrbitMode();
      this.orbitPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      event.target.setPointerCapture?.(event.pointerId);
      if (this.orbitPointers.size === 2) {
        const [a, b] = [...this.orbitPointers.values()];
        this.orbitPinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    window.addEventListener('pointermove', event => {
      if ((this.state !== 'menu' && this.state !== 'playing') || !this.orbitPointers.has(event.pointerId)) return;
      const previous = this.orbitPointers.get(event.pointerId);
      this.orbitPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.orbitPointers.size === 1) {
        this.orbitYaw -= (event.clientX - previous.x) * 0.008;
        this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + (event.clientY - previous.y) * 0.006, 0.08, 1.05);
      } else if (this.orbitPointers.size >= 2) {
        const [a, b] = [...this.orbitPointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.orbitPinchDistance > 0 && distance > 0) {
          this.orbitDistance = THREE.MathUtils.clamp(this.orbitDistance * this.orbitPinchDistance / distance, 5.8, 13);
        }
        this.orbitPinchDistance = distance;
      }
    });
    const releaseOrbitPointer = event => {
      this.orbitPointers.delete(event.pointerId);
      if (this.orbitPointers.size < 2) this.orbitPinchDistance = 0;
    };
    window.addEventListener('pointerup', releaseOrbitPointer);
    window.addEventListener('pointercancel', releaseOrbitPointer);
    window.addEventListener('wheel', event => {
      if ((this.state !== 'menu' && this.state !== 'playing') || event.target.closest?.('button')) return;
      event.preventDefault();
      if (this.state === 'playing' && this.cameraMode === 'follow') this.enterOrbitMode();
      this.orbitDistance = THREE.MathUtils.clamp(this.orbitDistance + event.deltaY * 0.008, 5.8, 13);
    }, { passive: false });
    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key) && this.state === 'playing') event.preventDefault();
      if ((key === 'p' || key === 'escape') && !event.repeat) {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        return;
      }
      if (key === 'c' && !event.repeat && (this.state === 'playing' || this.state === 'paused')) {
        this.toggleCamera();
        return;
      }
      if (this.state !== 'playing') return;
      this.keys.add(key);
      if (event.repeat) return;
      if (key === 'arrowleft' || key === 'a') this.moveLane(-1);
      if (key === 'arrowright' || key === 'd') this.moveLane(1);
      if (key === 'arrowup' || key === 'w' || key === ' ') this.jump();
      if (key === 'arrowdown' || key === 's') this.setDuck(true);
    });
    window.addEventListener('keyup', event => {
      const key = event.key.toLowerCase();
      this.keys.delete(key);
      if (key === 'arrowdown' || key === 's') this.setDuck(false);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.orbitPointers.clear();
      this.orbitPinchDistance = 0;
      this.setDuck(false);
      if (this.state === 'playing') this.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.fov = width < 620 ? 66 : 58;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setState(state) {
    this.state = state;
    if (state !== 'menu' && state !== 'playing') {
      this.orbitPointers.clear();
      this.orbitPinchDistance = 0;
    }
    this.callbacks.onState?.(state);
  }

  resetRun() {
    for (const object of [...this.obstacles, ...this.collectibles, ...this.particles]) {
      this.scene.remove(object);
      disposeObject(object);
    }
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.distance = 0;
    this.fish = 0;
    this.health = 3;
    this.score = 0;
    this.speed = 0;
    this.lane = 1;
    this.jumpHeight = 0;
    this.verticalVelocity = 0;
    this.ducking = false;
    this.invincible = 0;
    this.hitFlash = 0;
    this.cameraShake = 0;
    this.cameraMode = 'follow';
    this.elapsed = 0;
    this.nextObstacleAt = 48;
    this.nextFishAt = 18;
    this.hudTimer = 0;
    this.player.position.set(0, 0, 0);
    this.player.rotation.set(0, 0, 0);
    this.player.visible = true;
    this.finishGate.position.z = -TARGET_DISTANCE;
    this.emitHud();
  }

  start() {
    this.resetRun();
    this.setState('playing');
    this.callbacks.onCameraChange?.(this.cameraMode);
    this.callbacks.onToast?.('出发！留意木栏、高横杆和木箱');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.keys.clear();
    this.setDuck(false);
    this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('playing');
  }

  home() {
    this.resetRun();
    this.setState('menu');
  }

  moveLane(direction) {
    if (this.state !== 'playing') return;
    this.lane = THREE.MathUtils.clamp(this.lane + direction, 0, 2);
  }

  jump() {
    if (this.state !== 'playing' || this.jumpHeight > 0.02) return;
    this.verticalVelocity = 8.6;
    this.jumpHeight = 0.01;
    this.callbacks.onEvent?.('jump');
  }

  setDuck(value) {
    this.ducking = Boolean(value) && this.state === 'playing';
  }

  spawnObstacle() {
    const lane = Math.floor(this.random() * 3);
    const types = ['barrier', 'overhead', 'crate'];
    const type = types[Math.floor(this.random() * types.length)];
    const obstacle = createObstacle(type);
    obstacle.position.set(LANE_X[lane], 0, -132);
    obstacle.userData.lane = lane;
    obstacle.userData.hit = false;
    this.scene.add(obstacle);
    this.obstacles.push(obstacle);
    if (this.random() > 0.72 && this.distance < 430) {
      const secondLane = (lane + 1 + Math.floor(this.random() * 2)) % 3;
      const second = createObstacle(this.random() > 0.5 ? 'barrier' : 'crate');
      second.position.set(LANE_X[secondLane], 0, -132);
      second.userData.lane = secondLane;
      second.userData.hit = false;
      this.scene.add(second);
      this.obstacles.push(second);
    }
  }

  spawnFishLine() {
    const lane = Math.floor(this.random() * 3);
    const count = 5 + Math.floor(this.random() * 3);
    const arc = this.random() > 0.68;
    for (let i = 0; i < count; i++) {
      const fish = createFish();
      const progress = i / Math.max(1, count - 1);
      fish.position.set(LANE_X[lane], 1.2 + (arc ? Math.sin(progress * Math.PI) * 1.25 : Math.sin(i * 0.8) * 0.12), -126 - i * 3.1);
      fish.userData.baseY = fish.position.y;
      fish.userData.phase = this.random() * Math.PI * 2;
      this.scene.add(fish);
      this.collectibles.push(fish);
    }
  }

  spawnParticles(position, color, count = 9) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < count; i++) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.055 + this.random() * 0.045, 6, 4), material.clone());
      particle.position.copy(position);
      particle.userData.velocity = new THREE.Vector3((this.random() - 0.5) * 4, 1.5 + this.random() * 3, (this.random() - 0.5) * 3);
      particle.userData.life = 0.55 + this.random() * 0.35;
      particle.userData.maxLife = particle.userData.life;
      this.scene.add(particle);
      this.particles.push(particle);
    }
    material.dispose();
  }

  hitObstacle(obstacle) {
    obstacle.userData.hit = true;
    if (this.invincible > 0) return;
    this.health -= 1;
    this.invincible = 1.6;
    this.hitFlash = 0.45;
    this.cameraShake = this.reducedMotion ? 0 : 0.55;
    this.speed *= 0.58;
    this.spawnParticles(new THREE.Vector3(this.player.position.x, 1.4, 0), '#ff765f', 12);
    this.callbacks.onEvent?.('hit');
    this.callbacks.onToast?.(this.health > 0 ? `碰到障碍，还剩 ${this.health} 点体力` : '体力用尽，本次骑行结束');
    this.emitHud();
    if (this.health <= 0) this.finish(false);
  }

  finish(won) {
    if (this.state !== 'playing') return;
    this.score = Math.floor(this.distance) + this.fish * 25 + (won ? this.health * 150 : 0);
    this.saveBestScore();
    this.setState(won ? 'won' : 'gameover');
    this.callbacks.onEvent?.(won ? 'finish' : 'gameover');
    this.callbacks.onResult?.({
      won,
      score: this.score,
      distance: Math.floor(this.distance),
      fish: this.fish,
      health: this.health,
      stars: won ? 1 + (this.health === 3 ? 1 : 0) + (this.fish >= 25 ? 1 : 0) : 0,
      best: this.bestScore,
    });
  }

  updateWorld(dt, worldSpeed) {
    for (const object of this.scenery) {
      object.position.z += worldSpeed * dt * object.userData.speedFactor;
      if (object.position.z > 34) object.position.z -= WORLD_LENGTH;
    }
    for (const cloud of this.clouds) {
      cloud.position.z += worldSpeed * dt * cloud.userData.speedFactor;
      if (cloud.position.z > 40) cloud.position.z -= 230;
    }
    for (const dash of this.roadDashes) {
      dash.position.z += worldSpeed * dt;
      if (dash.position.z > 28) dash.position.z -= 248;
    }
    for (let i = 0; i < this.waveLines.length; i++) {
      const wave = this.waveLines[i];
      wave.position.z += worldSpeed * dt * 0.18;
      wave.material.opacity = 0.16 + Math.sin(this.elapsed * 1.5 + i) * 0.07;
      if (wave.position.z > 35) wave.position.z -= 240;
    }
  }

  updateDynamicObjects(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.position.z += this.speed * dt;
      const sameLane = Math.abs(obstacle.position.x - this.player.position.x) < 1.05;
      if (!obstacle.userData.hit && sameLane && obstacle.position.z > -1.15 && obstacle.position.z < 1.15) {
        const type = obstacle.userData.type;
        const safe = type === 'barrier' ? this.jumpHeight > 0.82 : type === 'overhead' ? this.ducking : false;
        if (!safe) this.hitObstacle(obstacle);
      }
      if (obstacle.position.z > 12) {
        this.scene.remove(obstacle);
        disposeObject(obstacle);
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const fish = this.collectibles[i];
      fish.position.z += this.speed * dt;
      fish.position.y = fish.userData.baseY + Math.sin(this.elapsed * 5 + fish.userData.phase) * 0.1;
      fish.rotation.y += dt * 3.2;
      fish.rotation.z = Math.sin(this.elapsed * 4 + fish.userData.phase) * 0.12;
      if (fish.position.z > -1 && fish.position.z < 1.2 && Math.abs(fish.position.x - this.player.position.x) < 0.95) {
        this.fish += 1;
        this.spawnParticles(fish.position, '#ffd166', 8);
        this.callbacks.onEvent?.('collect');
        this.scene.remove(fish);
        disposeObject(fish);
        this.collectibles.splice(i, 1);
        continue;
      }
      if (fish.position.z > 12) {
        this.scene.remove(fish);
        disposeObject(fish);
        this.collectibles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.userData.life -= dt;
      particle.userData.velocity.y -= dt * 7;
      particle.position.addScaledVector(particle.userData.velocity, dt);
      particle.material.opacity = Math.max(0, particle.userData.life / particle.userData.maxLife);
      particle.scale.setScalar(0.6 + particle.material.opacity * 0.6);
      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        disposeObject(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  updatePlayer(dt) {
    const targetX = LANE_X[this.lane];
    const previousX = this.player.position.x;
    this.player.position.x = THREE.MathUtils.damp(this.player.position.x, targetX, 11, dt);
    const lateralVelocity = (this.player.position.x - previousX) / Math.max(dt, 0.001);
    this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, -lateralVelocity * 0.022, 9, dt);
    this.player.rotation.x = THREE.MathUtils.damp(this.player.rotation.x, -this.verticalVelocity * 0.012, 7, dt);

    if (this.jumpHeight > 0 || this.verticalVelocity > 0) {
      this.verticalVelocity -= 22 * dt;
      this.jumpHeight += this.verticalVelocity * dt;
      if (this.jumpHeight <= 0) {
        this.jumpHeight = 0;
        this.verticalVelocity = 0;
      }
    }
    this.player.position.y = this.jumpHeight;
    this.player.visible = this.invincible <= 0 || Math.floor(this.invincible * 12) % 2 === 0;
    this.playerShadow.position.x = this.player.position.x;
    this.playerShadow.material.opacity = 0.2 * (1 - Math.min(this.jumpHeight / 2.2, 0.65));
    this.playerShadow.scale.set(0.75 + this.jumpHeight * 0.12, 1.25 + this.jumpHeight * 0.12, 1);
    this.player.userData.update(dt, this.speed, this.jumpHeight > 0.05, this.ducking ? 1 : 0, this.elapsed);
  }

  updateCamera(dt) {
    if (this.state === 'menu' || this.cameraMode === 'orbit') {
      const target = this.getOrbitTarget();
      const horizontalDistance = Math.cos(this.orbitPitch) * this.orbitDistance;
      const orbitPosition = target.clone().add(new THREE.Vector3(
        Math.sin(this.orbitYaw) * horizontalDistance,
        Math.sin(this.orbitPitch) * this.orbitDistance,
        Math.cos(this.orbitYaw) * horizontalDistance
      ));
      this.camera.position.lerp(orbitPosition, 1 - Math.exp(-dt * 8));
      this.camera.lookAt(target);
      return;
    }
    const targetPosition = new THREE.Vector3(this.player.position.x * 0.32, 5.7 + this.jumpHeight * 0.22, 11.2);
    const lookTarget = new THREE.Vector3(this.player.position.x * 0.45, 1.55 + this.jumpHeight * 0.25, -8.5);
    this.camera.position.lerp(targetPosition, 1 - Math.exp(-dt * 5));
    if (this.cameraShake > 0) {
      this.camera.position.x += (this.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (this.random() - 0.5) * this.cameraShake * 0.5;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    }
    this.camera.lookAt(lookTarget);
  }

  emitHud() {
    this.callbacks.onHud?.({
      distance: Math.min(TARGET_DISTANCE, Math.floor(this.distance)),
      fish: this.fish,
      health: this.health,
      score: Math.floor(this.distance) + this.fish * 25,
      speed: Math.round(this.speed * 3.6),
      progress: Math.min(1, this.distance / TARGET_DISTANCE),
    });
  }

  step(dt) {
    this.elapsed += dt;
    if (this.state === 'playing') {
      const targetSpeed = 14.5 + Math.min(this.distance / TARGET_DISTANCE, 1) * 7.5;
      this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 2.4, dt);
      this.distance = Math.min(TARGET_DISTANCE, this.distance + this.speed * dt);
      this.invincible = Math.max(0, this.invincible - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.updatePlayer(dt);
      this.updateWorld(dt, this.speed);
      this.updateDynamicObjects(dt);
      this.finishGate.position.z = this.distance - TARGET_DISTANCE;
      if (this.distance >= this.nextObstacleAt) {
        this.spawnObstacle();
        this.nextObstacleAt += 25 + this.random() * 10;
      }
      if (this.distance >= this.nextFishAt) {
        this.spawnFishLine();
        this.nextFishAt += 17 + this.random() * 8;
      }
      this.updateCamera(dt);
      this.hudTimer += dt;
      if (this.hudTimer > 0.08) {
        this.hudTimer = 0;
        this.emitHud();
      }
      if (this.distance >= TARGET_DISTANCE) this.finish(true);
    } else {
      this.speed = THREE.MathUtils.damp(this.speed, 0, 4, dt);
      this.updateWorld(dt, this.state === 'menu' ? 2.2 : 0);
      this.player.userData.update(dt, this.state === 'menu' ? 1.2 : 0, false, 0, this.elapsed);
      this.player.visible = true;
      this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, 0, 5, dt);
      this.updateCamera(dt);
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.userData.life -= dt;
        particle.position.addScaledVector(particle.userData.velocity, dt);
        particle.userData.velocity.y -= dt * 6;
        particle.material.opacity = Math.max(0, particle.userData.life / particle.userData.maxLife);
        if (particle.userData.life <= 0) {
          this.scene.remove(particle);
          disposeObject(particle);
          this.particles.splice(i, 1);
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  animate(time) {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 1 / 60;
    this.lastTime = time;
    this.step(dt);
    this.render();
    requestAnimationFrame(this.animate);
  }
}
