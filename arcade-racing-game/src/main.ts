// Pako-style minimal level with a detailed low-poly car and buildings
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeaeaea);
scene.fog = new THREE.Fog(0xeaeaea, 40, 150);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(30, 40, 30);
camera.lookAt(0, 0, 0);

const minimapCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 500);
minimapCamera.position.set(0, 100, 0);
minimapCamera.lookAt(0, 0, 0);


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(30, 60, 20);
light.castShadow = true;
scene.add(light);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Road
const road = new THREE.Mesh(
  new THREE.BoxGeometry(6, 0.1, 120),
  new THREE.MeshStandardMaterial({ color: 0x2f2f2f })
);
road.position.set(0, 0.05, 0);
road.receiveShadow = true;
scene.add(road);

// Buildings
function createBuilding(x, z, width, depth, height) {
  const buildingGroup = new THREE.Group();

  const baseColor = new THREE.Color().setHSL(Math.random(), 0.2, 0.7);

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: baseColor })
  );
  main.position.y = height / 2;
  main.castShadow = true;
  main.receiveShadow = true;
  buildingGroup.add(main);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.7, 2, 4),
    new THREE.MeshStandardMaterial({ color: baseColor.clone().offsetHSL(0, 0, -0.2) })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = height + 1;
  buildingGroup.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x884400 })
  );
  door.position.set(0, 1, depth / 2 + 0.11);
  buildingGroup.add(door);

  const winMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x223344 });
  for (let i = -1; i <= 1; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), winMat);
    win.position.set(i * 1.5, height / 2, depth / 2 + 0.11);
    buildingGroup.add(win);
  }

  buildingGroup.position.set(x, 0, z);
  return buildingGroup;
}

for (let x of [-10, 10]) {
  for (let z = -50; z <= 50; z += 15) {
    const h = Math.random() * 5 + 6;
    scene.add(createBuilding(x, z, 6, 6, h));
  }
}

// Car with animation-ready wheels, shadow and variant color
const car = new THREE.Group();
const carColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);

const body = new THREE.Mesh(
  new THREE.BoxGeometry(2, 0.6, 4),
  new THREE.MeshStandardMaterial({ color: carColor })
);
body.position.y = 0.3;
car.add(body);

const roof = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.3, 2),
  new THREE.MeshStandardMaterial({ color: carColor.clone().offsetHSL(0, 0, -0.2) })
);
roof.position.set(0, 0.75, 0);
car.add(roof);

const scoop = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.2, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
scoop.position.set(0, 0.6, -1.2);
car.add(scoop);

const spoiler = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 0.1, 0.4),
  new THREE.MeshStandardMaterial({ color: carColor })
);
spoiler.position.set(0, 0.8, 2.2);
car.add(spoiler);

const mirrorL = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.2, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
mirrorL.position.set(-1.05, 0.5, 0.5);
car.add(mirrorL);
const mirrorR = mirrorL.clone();
mirrorR.position.x *= -1;
car.add(mirrorR);

const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc });
for (let x of [-0.6, 0.6]) {
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), headlightMat);
  light.position.set(x, 0.5, -2.1);
  car.add(light);
}

const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const wheels = [];
const wheelPositions = [
  [-0.9, -1.4],
  [0.9, -1.4],
  [-0.9, 1.4],
  [0.9, 1.4]
];
for (let [x, z] of wheelPositions) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, 0.15, z);
  car.add(wheel);
  wheels.push(wheel);
}

// Shadow (fake)
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), shadowMat);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.01;
car.add(shadow);

scene.add(car);

// Trees
for (let i = 0; i < 20; i++) {
  const x = Math.random() * 160 - 80;
  const z = Math.random() * 160 - 80;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  trunk.position.y = 0.5;

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x55aa55 })
  );
  crown.position.y = 1.5;

  const tree = new THREE.Group();
  tree.add(trunk);
  tree.add(crown);
  tree.position.set(x, 0, z);
  scene.add(tree);
}

// Animated background gradient
let bgPhase = 0;
function updateBackgroundGradient(delta) {
  scene.background = new THREE.Color(0xffcc99); // golden hour base
}

const clock = new THREE.Clock();
let useFollowCamera = true;


// Animate
// Input handling
const keys = { forward: false, backward: false, left: false, right: false, camToggle: false };
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.forward = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.backward = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'KeyC') keys.camToggle = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.forward = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.backward = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'KeyC' && keys.camToggle) {
    useFollowCamera = !useFollowCamera;
    keys.camToggle = false;
  }
});

// Car state
let carSpeed = 0;
let carRotation = 0; // reset to face forward correctly
const carPos = new THREE.Vector3(0, 0, -55); // start lower on the road

// Shake state
let shakeTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateBackgroundGradient(delta);
  // Car controls
  const acceleration = 20;
  const maxSpeed = 175;
  const turnSpeed = 2.5;
  const friction = 0.96;

  if (keys.forward) carSpeed += acceleration * delta;
  if (keys.backward) carSpeed -= acceleration * delta;
  if (keys.left) carRotation += turnSpeed * delta * (carSpeed > 0 ? 1 : -1);
  if (keys.right) carRotation -= turnSpeed * delta * (carSpeed > 0 ? 1 : -1);

  carSpeed *= friction;
  carSpeed = Math.max(-maxSpeed, Math.min(maxSpeed, carSpeed));

  carPos.x += Math.sin(carRotation) * carSpeed * delta;
  carPos.z += Math.cos(carRotation) * carSpeed * delta; // fix direction

  car.position.set(carPos.x, 0, carPos.z);
  car.rotation.y = carRotation + Math.PI;

  // Rotate wheels
  for (let wheel of wheels) {
    wheel.rotation.x -= carSpeed * delta * 4;
  }

  // Smooth follow or fixed camera
  if (useFollowCamera) {
    const offset = new THREE.Vector3(0, 15, -20).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation);
    const target = car.position.clone().add(offset);

    // Camera shake when accelerating
    if (Math.abs(carSpeed) > 1) {
      shakeTime += delta * 10;
      target.x += Math.sin(shakeTime * 20) * 0.2;
      target.y += Math.sin(shakeTime * 15) * 0.2;
    }

    camera.position.lerp(target, 0.1);
    camera.lookAt(car.position);
  } else {
    camera.position.set(0, 60, 0);
    camera.lookAt(car.position);
  }

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  // Minimap styling: draw border
  const ctx = renderer.domElement.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.strokeRect(window.innerWidth - 202, window.innerHeight - 202, 204, 204);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(window.innerWidth - 200, window.innerHeight - 200, 200, 200);

  }

  // Draw directional arrow on minimap
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(Math.sin(carRotation), 0, Math.cos(carRotation)),
    car.position.clone().setY(0.1),
    4,
    0xff0000
  );
  scene.add(arrow);
  setTimeout(() => scene.remove(arrow), 0);

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.render(scene, camera);

  // Render minimap
  renderer.setViewport(window.innerWidth - 200, window.innerHeight - 200, 200, 200);
  renderer.setScissor(window.innerWidth - 200, window.innerHeight - 200, 200, 200);
  renderer.setScissorTest(true);

  minimapCamera.position.x = car.position.x;
  minimapCamera.position.z = car.position.z;
  minimapCamera.lookAt(car.position.x, 0, car.position.z);
  renderer.render(scene, minimapCamera);

  // Update HUD
  const kmh = Math.abs(carSpeed * 8).toFixed(0);
  const gear = carSpeed < -0.5 ? 'R' : 'D';
  hud.innerHTML = `Speed: ${kmh} km/h \n Gear: ${gear}`;

  renderer.render(scene, camera);
}

// Add HUD panel
const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.left = '20px';
hud.style.bottom = '20px';
hud.style.padding = '10px 15px';
hud.style.borderRadius = '10px';
hud.style.background = 'linear-gradient(135deg, rgba(255,0,150,0.6), rgba(28, 92, 92, 0.4))';
hud.style.color = '#ffffff';
hud.style.fontFamily = 'Orbitron, monospace';
hud.style.fontSize = '18px';
hud.style.pointerEvents = 'none';
hud.innerHTML = 'Speed: 0 km/h Gear: D';
document.body.appendChild(hud);


animate();
