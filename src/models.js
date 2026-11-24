import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function tubeBetween(start, end, radius, material, radialSegments = 10) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments), material);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(UP, direction.normalize());
  return object;
}

function updateTube(object, start, end) {
  const direction = end.clone().sub(start);
  object.position.copy(start).add(end).multiplyScalar(0.5);
  object.scale.y = direction.length();
  object.quaternion.setFromUnitVectors(UP, direction.normalize());
}

export function createPelicanBike() {
  const root = new THREE.Group();
  const bike = new THREE.Group();
  const bird = new THREE.Group();
  root.add(bike, bird);

  const coral = new THREE.MeshStandardMaterial({ color: '#ef5f49', roughness: 0.42, metalness: 0.12 });
  const coralDark = new THREE.MeshStandardMaterial({ color: '#b93f35', roughness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: '#263c4b', roughness: 0.35, metalness: 0.65 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff1cf', roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.78 });
  const feather = new THREE.MeshStandardMaterial({ color: '#dce8e8', roughness: 0.82 });
  const orange = new THREE.MeshStandardMaterial({ color: '#ffab45', roughness: 0.55 });
  const black = new THREE.MeshStandardMaterial({ color: '#142633', roughness: 0.4 });
  const mint = new THREE.MeshStandardMaterial({ color: '#35bda8', roughness: 0.65 });
  const leather = new THREE.MeshStandardMaterial({ color: '#714b38', roughness: 0.85 });

  const wheelPivots = [];
  for (const z of [-0.92, 0.92]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.67, z);
    const tire = mesh(new THREE.TorusGeometry(0.6, 0.085, 10, 32), black, [0, 0, 0], [0, Math.PI / 2, 0]);
    const rim = mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 28), cream, [0, 0, 0], [0, Math.PI / 2, 0]);
    pivot.add(tire, rim);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      pivot.add(tubeBetween([0, 0, 0], [0, Math.cos(angle) * 0.49, Math.sin(angle) * 0.49], 0.012, metal, 6));
    }
    bike.add(pivot);
    wheelPivots.push(pivot);
  }

  const rear = [0, 0.67, 0.92];
  const front = [0, 0.67, -0.92];
  const crankPoint = [0, 0.76, 0.02];
  const seatPoint = [0, 1.48, 0.34];
  const headPoint = [0, 1.43, -0.62];
  for (const [a, b] of [[rear, seatPoint], [seatPoint, crankPoint], [crankPoint, rear], [seatPoint, headPoint], [headPoint, crankPoint], [headPoint, front]]) {
    bike.add(tubeBetween(a, b, 0.055, coral));
  }
  bike.add(tubeBetween([0, 1.43, -0.62], [0, 1.83, -0.72], 0.045, metal));
  bike.add(tubeBetween([-0.43, 1.83, -0.72], [0.43, 1.83, -0.72], 0.04, metal));
  bike.add(mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), leather, [0, 1.55, 0.38], [0.08, 0, 0]));
  bike.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 14), coralDark, [0, 0.76, 0.02], [0, 0, Math.PI / 2]));
  bike.add(mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 20), metal, [0, 0.76, 0.02], [0, Math.PI / 2, 0]));
  bike.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 18), metal, [0, 0.67, 0.92], [0, Math.PI / 2, 0]));
  bike.add(tubeBetween([0, 0.76, -0.16], [0, 0.67, 0.8], 0.014, metal, 6));
  bike.add(tubeBetween([0, 0.76, 0.2], [0, 0.67, 1.04], 0.014, metal, 6));

  const crank = new THREE.Group();
  crank.position.set(0, 0.76, 0.02);
  crank.add(tubeBetween([-0.24, 0, 0], [0.24, 0, 0], 0.035, metal));
  crank.add(tubeBetween([-0.24, 0, 0], [-0.24, 0.27, 0], 0.028, metal));
  crank.add(tubeBetween([0.24, 0, 0], [0.24, -0.27, 0], 0.028, metal));
  const leftPedal = mesh(new THREE.BoxGeometry(0.22, 0.07, 0.16), black, [-0.24, 0.27, 0]);
  const rightPedal = mesh(new THREE.BoxGeometry(0.22, 0.07, 0.16), black, [0.24, -0.27, 0]);
  crank.add(leftPedal, rightPedal);
  bike.add(crank);

  bird.add(mesh(new THREE.SphereGeometry(0.62, 20, 14), white, [0, 2.12, 0.28], [0.12, 0, 0], [0.92, 1.08, 1.05]));
  bird.add(mesh(new THREE.SphereGeometry(0.4, 18, 12), white, [0, 2.63, -0.02], [0, 0, 0], [0.82, 1.25, 0.85]));
  bird.add(mesh(new THREE.SphereGeometry(0.34, 18, 12), white, [0, 3.03, -0.25], [0, 0, 0], [0.9, 1.12, 0.92]));
  bird.add(mesh(new THREE.SphereGeometry(0.36, 20, 14), white, [0, 3.3, -0.4], [0, 0, 0], [1, 0.94, 1.05]));
  bird.add(mesh(new THREE.SphereGeometry(0.5, 20, 12), orange, [0, 3.2, -1], [0.08, 0, 0], [0.42, 0.2, 1.5]));
  bird.add(mesh(new THREE.SphereGeometry(0.25, 16, 10), orange, [0, 3.08, -0.91], [0, 0, 0], [0.8, 0.5, 1.45]));
  bird.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), black, [-0.29, 3.37, -0.62]));
  bird.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), black, [0.29, 3.37, -0.62]));
  bird.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), white, [-0.31, 3.39, -0.66]));
  bird.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), white, [0.27, 3.39, -0.66]));

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.5, 2.25, 0.3);
  leftWing.add(mesh(new THREE.SphereGeometry(0.42, 16, 10), feather, [-0.12, -0.12, 0.08], [0.1, 0.15, -0.28], [0.46, 1.05, 0.82]));
  const rightWing = new THREE.Group();
  rightWing.position.set(0.5, 2.25, 0.3);
  rightWing.add(mesh(new THREE.SphereGeometry(0.42, 16, 10), feather, [0.12, -0.12, 0.08], [0.1, -0.15, 0.28], [0.46, 1.05, 0.82]));
  bird.add(leftWing, rightWing);

  bird.add(mesh(new THREE.TorusGeometry(0.29, 0.07, 8, 20), mint, [0, 2.76, -0.08], [Math.PI / 2, 0, 0], [1, 1, 0.8]));
  const scarfTail = mesh(new THREE.BoxGeometry(0.18, 0.05, 0.78), mint, [0.18, 2.68, 0.42], [-0.2, -0.15, 0.08]);
  bird.add(scarfTail);

  const legMaterial = new THREE.MeshStandardMaterial({ color: '#e89a3d', roughness: 0.65 });
  const legs = [];
  for (const side of [-1, 1]) {
    const upper = mesh(new THREE.CylinderGeometry(0.055, 0.05, 1, 8), legMaterial);
    const lower = mesh(new THREE.CylinderGeometry(0.045, 0.04, 1, 8), legMaterial);
    const foot = mesh(new THREE.BoxGeometry(0.2, 0.08, 0.28), legMaterial);
    root.add(upper, lower, foot);
    legs.push({ side, upper, lower, foot });
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const upper = mesh(new THREE.CylinderGeometry(0.075, 0.065, 1, 8), feather);
    const lower = mesh(new THREE.CylinderGeometry(0.065, 0.05, 1, 8), feather);
    const hand = mesh(new THREE.SphereGeometry(0.14, 12, 8), feather, [0, 0, 0], [0, 0, 0], [1.15, 0.7, 1.25]);
    root.add(upper, lower, hand);
    arms.push({ side, upper, lower, hand });
  }

  let pedalAngle = 0;
  function update(dt, speed, jumping, ducking, elapsed) {
    pedalAngle -= dt * (2.5 + speed * 0.28);
    wheelPivots.forEach(wheel => { wheel.rotation.x -= dt * speed / 0.6; });
    crank.rotation.x = pedalAngle;
    leftPedal.rotation.x = -pedalAngle;
    rightPedal.rotation.x = -pedalAngle;
    const duck = THREE.MathUtils.clamp(ducking, 0, 1);
    bird.position.y = -duck * 0.5;
    bird.rotation.x = duck * 0.45;
    leftWing.rotation.z = jumping ? -0.85 - Math.sin(elapsed * 18) * 0.18 : -0.08 + Math.sin(elapsed * 4) * 0.04;
    rightWing.rotation.z = jumping ? 0.85 + Math.sin(elapsed * 18) * 0.18 : 0.08 - Math.sin(elapsed * 4) * 0.04;
    scarfTail.rotation.x = -0.2 + Math.sin(elapsed * 9) * 0.12 - speed * 0.008;
    bird.updateMatrix();
    for (const arm of arms) {
      const shoulder = new THREE.Vector3(arm.side * 0.5, 2.25, 0.3).applyMatrix4(bird.matrix);
      const grip = new THREE.Vector3(arm.side * 0.43, 1.83, -0.72);
      const elbow = shoulder.clone().lerp(grip, 0.55).add(new THREE.Vector3(arm.side * 0.1, 0.06, 0.04));
      updateTube(arm.upper, shoulder, elbow);
      updateTube(arm.lower, elbow, grip);
      arm.hand.position.copy(grip).add(new THREE.Vector3(0, 0.03, 0));
      arm.hand.rotation.z = arm.side * 0.12;
    }
    for (const leg of legs) {
      const phase = pedalAngle + (leg.side === 1 ? Math.PI : 0);
      const hip = new THREE.Vector3(leg.side * 0.24, 1.88, 0.28);
      const pedal = new THREE.Vector3(leg.side * 0.24, 0.76 + Math.cos(phase) * 0.27, 0.02 + Math.sin(phase) * 0.27);
      const knee = hip.clone().lerp(pedal, 0.52).add(new THREE.Vector3(0, 0.04, -0.18));
      updateTube(leg.upper, hip, knee);
      updateTube(leg.lower, knee, pedal);
      leg.foot.position.copy(pedal).add(new THREE.Vector3(0, 0.06, -0.04));
      leg.foot.rotation.x = Math.sin(phase) * 0.15;
    }
  }

  root.userData.update = update;
  return root;
}

export function createFish() {
  const group = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: '#ffb547', emissive: '#8a4a08', emissiveIntensity: 0.18, roughness: 0.45 });
  const light = new THREE.MeshStandardMaterial({ color: '#fff1b8', roughness: 0.5 });
  group.add(mesh(new THREE.SphereGeometry(0.24, 14, 10), orange, [0, 0, 0], [0, 0, 0], [1.25, 0.72, 0.58]));
  group.add(mesh(new THREE.ConeGeometry(0.2, 0.34, 3), orange, [-0.34, 0, 0], [0, 0, Math.PI / 2]));
  group.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), light, [0.2, 0.06, 0.12]));
  group.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), light, [0.2, 0.06, -0.12]));
  return group;
}

export function createObstacle(type) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#a86a3d', roughness: 0.86 });
  const woodLight = new THREE.MeshStandardMaterial({ color: '#d69a5b', roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3c4650', roughness: 0.7 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#ffd15c', roughness: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: '#ef6250', roughness: 0.55 });

  if (type === 'crate') {
    group.add(mesh(new THREE.BoxGeometry(1.45, 1.35, 1.15), wood, [0, 0.68, 0]));
    for (const x of [-0.58, 0.58]) group.add(mesh(new THREE.BoxGeometry(0.12, 1.4, 1.2), woodLight, [x, 0.68, 0]));
    for (const y of [0.18, 1.16]) group.add(mesh(new THREE.BoxGeometry(1.5, 0.12, 1.2), woodLight, [0, y, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.12, 1.65, 0.08), woodLight, [0, 0.72, 0.62], [0, 0, 0.72]));
  }

  if (type === 'barrier') {
    for (const x of [-0.65, 0.65]) group.add(mesh(new THREE.BoxGeometry(0.16, 0.9, 0.18), dark, [x, 0.45, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.55, 0.28, 0.24), yellow, [0, 0.72, 0]));
    for (let i = -2; i <= 2; i++) group.add(mesh(new THREE.BoxGeometry(0.16, 0.3, 0.26), red, [i * 0.3, 0.72, 0], [0, 0, -0.35]));
  }

  if (type === 'overhead') {
    for (const x of [-0.82, 0.82]) group.add(mesh(new THREE.BoxGeometry(0.16, 2.7, 0.18), dark, [x, 1.35, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.85, 0.36, 0.28), yellow, [0, 2.35, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.45, 0.58, 0.12), red, [0, 1.95, 0]));
    for (let i = -2; i <= 2; i++) group.add(mesh(new THREE.BoxGeometry(0.17, 0.38, 0.14), yellow, [i * 0.29, 1.95, 0], [0, 0, -0.35]));
  }

  group.userData.type = type;
  return group;
}

export function createPalm(scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.MeshStandardMaterial({ color: '#9a653d', roughness: 0.9 });
  const trunkLight = new THREE.MeshStandardMaterial({ color: '#bb8550', roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#2f9f74', roughness: 0.82 });
  const leafLight = new THREE.MeshStandardMaterial({ color: '#55bd83', roughness: 0.82 });
  const coconut = new THREE.MeshStandardMaterial({ color: '#6f4931', roughness: 0.9 });
  group.add(mesh(new THREE.CylinderGeometry(0.16, 0.26, 4.8, 8), trunk, [0.18, 2.4, 0], [0, 0, -0.075]));
  for (let i = 0; i < 6; i++) group.add(mesh(new THREE.TorusGeometry(0.21 - i * 0.008, 0.025, 6, 12), trunkLight, [0.18 + i * 0.018, 0.55 + i * 0.68, 0], [Math.PI / 2, 0, -0.075]));
  const crown = new THREE.Vector3(0.36, 4.75, 0);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frond = mesh(new THREE.SphereGeometry(1, 10, 5), i % 2 ? leaf : leafLight, [crown.x + Math.cos(angle) * 1.05, crown.y + 0.12 - (i % 3) * 0.08, crown.z + Math.sin(angle) * 1.05], [0.08 * Math.sin(angle), -angle, 0.16 * Math.cos(angle)], [1.45, 0.09, 0.32]);
    group.add(frond);
  }
  for (const x of [-0.18, 0.18]) for (const z of [-0.12, 0.12]) group.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), coconut, [crown.x + x, crown.y - 0.18, crown.z + z]));
  group.scale.setScalar(scale);
  return group;
}

export function createRock(scale = 1) {
  const material = new THREE.MeshStandardMaterial({ color: '#78939a', roughness: 0.95, flatShading: true });
  const group = new THREE.Group();
  group.add(mesh(new THREE.DodecahedronGeometry(0.8, 0), material, [0, 0.42, 0], [0.1, 0.4, 0.08], [1.2, 0.72, 0.9]));
  group.add(mesh(new THREE.DodecahedronGeometry(0.38, 0), material, [0.75, 0.2, 0.2], [0, 0.8, 0], [1, 0.7, 1]));
  group.scale.setScalar(scale);
  return group;
}

export function createCloud(scale = 1) {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.86 });
  const group = new THREE.Group();
  for (const [x, y, z, s] of [[-1.1, 0, 0, 0.8], [0, 0.25, 0, 1], [1.1, 0, 0.1, 0.75], [0.3, -0.1, 0.35, 0.8]]) {
    group.add(mesh(new THREE.SphereGeometry(1, 12, 8), material, [x, y, z], [0, 0, 0], [s, s * 0.62, s * 0.72]));
  }
  group.scale.setScalar(scale);
  return group;
}

export function createUmbrella() {
  const group = new THREE.Group();
  const pole = new THREE.MeshStandardMaterial({ color: '#f4e6c8', roughness: 0.7 });
  const coral = new THREE.MeshStandardMaterial({ color: '#f47b61', roughness: 0.72 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff1cf', roughness: 0.72 });
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), pole, [0, 1.2, 0]));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    group.add(mesh(new THREE.ConeGeometry(0.72, 0.42, 3, 1, true), i % 2 ? coral : cream, [Math.cos(angle) * 0.35, 2.32, Math.sin(angle) * 0.35], [0, -angle, 0.12]));
  }
  return group;
}
