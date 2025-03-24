// Pako-style minimal level — refactored for Ammo.js physics integration
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import * as Ammo from 'ammo.js';

let scene, camera, renderer, clock, vehicle;
let physicsWorld;
let carBody, carMesh;
let tmpTrans;
const carColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);

const keysPressed = { forward: false, backward: false, left: false, right: false, camToggle: false };
let useFollowCamera = true;
let taillights = [];



function generateHousingArea() {
  const baseX = -80, baseZ = 30;
  const spacing = 10;
  const rows = 5, cols = 5;
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xa0b0c0 });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = baseX + j * spacing + 3;
      const z = baseZ + i * spacing + 3;

            const base = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2, 4),
        houseMat
      );
      base.position.set(x, 1, z);
      base.castShadow = true;
      scene.add(base);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3, 1.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x553333 })
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, 2.6, z);
      roof.castShadow = true;
      scene.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x884400 })
      );
      door.position.set(x, 0.5, z + 2.05);
      scene.add(door);

      const windowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x113355 });
      for (let dx of [-0.9, 0.9]) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.05),
          windowMat
        );
        win.position.set(x + dx, 1.2, z + 2.05);
        scene.add(win);
      }

            const shape = new Ammo.btBoxShape(new Ammo.btVector3(2, 1, 2));
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(x, 1, z));
      const motion = new Ammo.btDefaultMotionState(transform);
      const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
      const body = new Ammo.btRigidBody(rbInfo);
      physicsWorld.addRigidBody(body);
    }
  }

  // Add dirt roads between houses
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x8b7765 });
  for (let i = 0; i <= rows; i++) {
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(spacing * cols, 0.05, 2),
      roadMat
    );
    path.position.set(baseX + spacing * cols / 2, 0.025, baseZ + i * spacing);
    scene.add(path);
  }
  for (let j = 0; j <= cols; j++) {
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.05, spacing * rows),
      roadMat
    );
    path.position.set(baseX + j * spacing, 0.025, baseZ + spacing * rows / 2);
    scene.add(path);
  }
}


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

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffcc99);
  scene.fog = new THREE.Fog(0xffcc99, 40, 150);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(30, 40, 30);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Ammo physics world
  let collisionCfg = new Ammo.btDefaultCollisionConfiguration();
  let dispatcher = new Ammo.btCollisionDispatcher(collisionCfg);
  let broadphase = new Ammo.btDbvtBroadphase();
  let solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionCfg);
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));

  tmpTrans = new Ammo.btTransform();

  // Map generator (low poly layout)
function addZone(x, z, w, d, name, colorHex) {
  const geo = new THREE.BoxGeometry(w, 0.2, d);
  const mat = new THREE.MeshStandardMaterial({ color: colorHex });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2, 0.1, z + d / 2);
  scene.add(mesh);

  const shape = new Ammo.btBoxShape(new Ammo.btVector3(w / 2, 0.1, d / 2));
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(x + w / 2, -0.1, z + d / 2));
  const motion = new Ammo.btDefaultMotionState(transform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
  const body = new Ammo.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(body);

  // Optional label
  const label = document.createElement('div');
  label.textContent = name;
  label.style.position = 'absolute';
  label.style.left = `${x + 100}px`;
  label.style.top = `${z + 100}px`;
  label.style.color = '#333';
  label.style.fontSize = '12px';
  label.style.pointerEvents = 'none';
  document.body.appendChild(label);
}

// Modified road generator with lane markings and pedestrian crossings
function addRoad(x, z, width = 6, length = 100, isHorizontal = true, hasCrosswalk = false) {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(isHorizontal ? length : width, 0.05, isHorizontal ? width : length),
    roadMat
  );
  road.position.set(
    x + (isHorizontal ? length / 2 : 0),
    0.025,
    z + (isHorizontal ? 0 : length / 2)
  );
  road.receiveShadow = true;
  scene.add(road);

  // Разметка: жёлтая двойная + прерывистая белая или синяя
  if (width > 6) {
    // Двойная жёлтая сплошная
    for (let offset of [-0.15, 0.15]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length : 0.05, 0.01, isHorizontal ? 0.05 : length),
        new THREE.MeshStandardMaterial({ color: 0xffff00 })
      );
      line.position.set(
        road.position.x + (isHorizontal ? 0 : offset),
        0.051,
        road.position.z + (isHorizontal ? offset : 0)
      );
      scene.add(line);
    }

    // Прерывистая белая по центру каждой полосы (для вида)
    const dashLength = 2;
    const gap = 2;
    const count = Math.floor(length / (dashLength + gap));
    for (let laneOffset of [-width / 4, width / 4]) {
      for (let i = 0; i < count; i++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(
            isHorizontal ? dashLength : 0.05,
            0.01,
            isHorizontal ? 0.05 : dashLength
          ),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        const offset = i * (dashLength + gap) - (length / 2);
        line.position.set(
          road.position.x + (isHorizontal ? offset : laneOffset),
          0.051,
          road.position.z + (isHorizontal ? laneOffset : offset)
        );
        scene.add(line);
      }
    }
  } else {
    // Синяя прерывистая линия (по центру)
    const dashLength = 2;
    const gap = 1;
    const count = Math.floor(length / (dashLength + gap));
    for (let i = 0; i < count; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontal ? dashLength : 0.05,
          0.01,
          isHorizontal ? 0.05 : dashLength
        ),
        new THREE.MeshStandardMaterial({ color: 0x66ccff })
      );
      const offset = i * (dashLength + gap) - (length / 2);
      line.position.set(
        road.position.x + (isHorizontal ? offset : 0),
        0.051,
        road.position.z + (isHorizontal ? 0 : offset)
      );
      scene.add(line);
    }
  }

  // Пешеходный переход (полосы ПАРАЛЛЕЛЬНО оси дороги и на всю ширину)
  if (hasCrosswalk) {
    const stripeCount = width > 12 ? 27 : 16;
    const stripeSpacing = 0.7;
    const stripeWidth = 0.3;

    for (let i = 0; i < stripeCount; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontal ? width * 0.98 : stripeWidth,
          0.01,
          isHorizontal ? stripeWidth : width * 0.98
        ),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      stripe.position.set(
        road.position.x + (isHorizontal ? 0 : (i - stripeCount / 2) * stripeSpacing),
        0.052,
        road.position.z + (isHorizontal ? (i - stripeCount / 2) * stripeSpacing : 0)
      );
      scene.add(stripe);
    }
  }
}


// Примеры дорог
addRoad(-100, 0, 12, 180, true, true);                 // Двухполосная горизонтальная
addRoad(0, -100, 20, 180, false, true);               // Четырёхполосная вертикальная
addRoad(-50, 30, 12, 40, true, true);            // Двухполосная с переходом
addRoad(30, 60, 20, 60, true, true);            // Широкая с двойной жёлтой и переходом

generateHousingArea()
//addZone(-90, -5, 180, 10, 'Main Road', 0x2f2f2f);
// addZone(-5, -90, 10, 180, 'Vertical Road', 0x3c3c3c);
//addZone(-80, 30, 40, 40, 'Housing', 0xb0c4de);
addZone(40, -80, 50, 40, 'Warehouses', 0xd2b48c);
addZone(-80, -80, 30, 30, 'Construction', 0xdeaa88);
//addZone(-20, -20, 40, 40, 'Plaza', 0xffdead);
addZone(30, 30, 25, 25, 'Garage', 0x90ee90);
addZone(-30, 60, 25, 20, 'Buff Zone', 0xdda0dd);
addZone(60, 60, 15, 15, 'Viewpoint', 0xffa07a);

  // // Add road
  // const road = new THREE.Mesh(
  //   new THREE.BoxGeometry(6, 0.1, 120),
  //   new THREE.MeshStandardMaterial({ color: 0x2f2f2f })
  // );
  // road.position.set(0, 0.05, 0);
  // road.receiveShadow = true;
  // scene.add(road);

  // Add trees
  for (let i = 0; i < 44; i++) {
    const x = Math.random() * 200 - 100;
    const z = Math.random() * 200 - 100;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    trunk.position.y = 0.6;

    const leafColors = [0xdd5500, 0xff9900, 0xcc4411];
    const crown = new THREE.Group();
    for (let j = 0; j < 15; j++) {
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.2, 1),
        new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)] })
      );
      blob.position.set(
        (Math.random() - 0.5) * 0.8,
        1 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.8
      );
      crown.add(blob);
    }

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(crown);
    tree.position.set(x, 0, z);
    scene.add(tree);

    for (let l = 0; l < 16; l++) {
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.2),
        new THREE.MeshStandardMaterial({
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
          side: THREE.DoubleSide
        })
      );
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.set(
        x + (Math.random() - 0.5) * 1.5,
        0.02,
        z + (Math.random() - 0.5) * 1.5
      );
      scene.add(leaf);
    }
  }
  clock = new THREE.Clock();

  // Lights
  const light = new THREE.DirectionalLight(0xffeedd, 1.5);
  light.position.set(0, 10, -120);
  light.castShadow = true;
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  // Ground
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 grid = floor(vUv * 800.0);
      float h = hash(grid);
      
      vec3 autumn1 = vec3(0.65, 0.45, 0.28);
      vec3 autumn2 = vec3(0.5, 0.35, 0.2);
      vec3 autumn3 = vec3(0.8, 0.65, 0.35);
      vec3 autumn4 = vec3(0.6, 0.5, 0.25);

      vec3 color;
      if (h < 0.3) color = autumn3; // yellow — 30%
      else if (h < 0.7) color = autumn1; // orange — 40%
      else if (h < 0.9) color = autumn4; // brown — 20%
      else color = autumn2; // greenish — 10%

      gl_FragColor = vec4(color, 1.0);
    }
  `})
  
  const ground = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 400), groundMat);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(200, 0.5, 200));
  const groundTransform = new Ammo.btTransform();
  groundTransform.setIdentity();
  groundTransform.setOrigin(new Ammo.btVector3(0, -0.5, 0));
  const motionState = new Ammo.btDefaultMotionState(groundTransform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, groundShape, localInertia);
  const groundBody = new Ammo.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(groundBody);

    // Car visual
  carMesh = createCarMesh({
    color: carColor,
    roofColor: 0x111111,
    withSpoiler: true,
    withScoop: false,
    isPlayer: true
  });
    
  carMesh = createTestCar();
  carMesh.position.set(0, 2, -55);
  scene.add(carMesh);

  // Border walls for collision
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const wallSize = 100;
  const wallThickness = 1;

  function addWall(x, z, w, h) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, h), wallMat);
    wall.position.set(x, 2, z);
    scene.add(wall);

    const shape = new Ammo.btBoxShape(new Ammo.btVector3(w / 2, 2, h / 2));
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(x, 2, z));
    const motion = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
    const body = new Ammo.btRigidBody(rbInfo);
    physicsWorld.addRigidBody(body);
  }

  // addWall(0, -wallSize, wallSize * 2, wallThickness); // far back
  // addWall(0, wallSize, wallSize * 2, wallThickness);  // front
  // addWall(-wallSize, 0, wallThickness, wallSize * 2); // left
  // addWall(wallSize, 0, wallThickness, wallSize * 2);  // right

  // Car physics - using RaycastVehicle
  const chassisShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.3, 2));
  const chassisTransform = new Ammo.btTransform();
  chassisTransform.setIdentity();
  chassisTransform.setOrigin(new Ammo.btVector3(0, 2, -55));
  chassisTransform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1)); // rotate 180° around Y
  const chassisMass = 800;
  const chassisInertia = new Ammo.btVector3(0, 0, 0);
  chassisShape.calculateLocalInertia(chassisMass, chassisInertia);
  const chassisMotion = new Ammo.btDefaultMotionState(chassisTransform);
  const chassisRbInfo = new Ammo.btRigidBodyConstructionInfo(chassisMass, chassisMotion, chassisShape, chassisInertia);
  carBody = new Ammo.btRigidBody(chassisRbInfo);
  carBody.setActivationState(4);
  physicsWorld.addRigidBody(carBody);

  // Raycast vehicle setup
  const tuning = new Ammo.btVehicleTuning();
  const rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
  vehicle = new Ammo.btRaycastVehicle(tuning, carBody, rayCaster);
  vehicle.setCoordinateSystem(0, 1, 2);
  physicsWorld.addAction(vehicle);

  // Add wheels
  const wheelRadius = 0.4;
  const wheelWidth = 0.3;
  const wheelHalfTrack = 0.9;
  const wheelAxisHeight = 0.2;
  const wheelBase = 1.5;
  const isFront = true;

  function addWheel(isFront, pos) {
    const wheelInfo = vehicle.addWheel(
      pos,
      new Ammo.btVector3(0, -1, 0),
      new Ammo.btVector3(-1, 0, 0),
      0.4,
      wheelRadius,
      tuning,
      isFront
    );
    wheelInfo.set_m_suspensionStiffness(20);
    wheelInfo.set_m_wheelsDampingRelaxation(2.3);
    wheelInfo.set_m_wheelsDampingCompression(4.4);
    wheelInfo.set_m_frictionSlip(1000);
    wheelInfo.set_m_rollInfluence(0.1);
  }

  addWheel(true, new Ammo.btVector3(-wheelHalfTrack, wheelAxisHeight, wheelBase));
  addWheel(true, new Ammo.btVector3(wheelHalfTrack, wheelAxisHeight, wheelBase));
  addWheel(false, new Ammo.btVector3(-wheelHalfTrack, wheelAxisHeight, -wheelBase));
  addWheel(false, new Ammo.btVector3(wheelHalfTrack, wheelAxisHeight, -wheelBase));

  // // Horizon light effect (sun)
  // const sunGeo = new THREE.RingGeometry(15, 18, 64);
  // const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  // const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  // sunMesh.rotation.x = -Math.PI / 2;
  // sunMesh.position.set(0, 0.1, -120);
  // scene.add(sunMesh);

  // const haloGeo = new THREE.RingGeometry(19, 22, 64);
  // const haloMat = new THREE.MeshBasicMaterial({ color: 0xffddaa, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
  // const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  // haloMesh.rotation.x = -Math.PI / 2;
  // haloMesh.position.set(0, 0.09, -120);
  // scene.add(haloMesh);

  // const flareTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
  // const lensflare = new Lensflare();
  // lensflare.addElement(new LensflareElement(flareTexture, 512, 0));
  // lensflare.position.set(0, 10, -120);
  // scene.add(lensflare);

  // Buildings with collision
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
  function addBuilding(x, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);

    const shape = new Ammo.btBoxShape(new Ammo.btVector3(w / 2, h / 2, d / 2));
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(x, h / 2, z));
    const motion = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
    const body = new Ammo.btRigidBody(rbInfo);
    physicsWorld.addRigidBody(body);
  }

  for (let x of [-14, 14]) {
    for (let z = -50; z <= 50; z += 15) {
      const height = Math.random() * 5 + 6;
      addBuilding(x, z, 6, height, 6);
    }
  }

  // Controls

  document.addEventListener('keydown', e => {
    if (e.code === 'KeyW') keysPressed.forward = true;
    if (e.code === 'KeyS') keysPressed.backward = true;
    if (e.code === 'KeyA') keysPressed.left = true;
    if (e.code === 'KeyD') keysPressed.right = true;
    if (e.code === 'KeyC') keysPressed.camToggle = true;
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') keysPressed.forward = false;
    if (e.code === 'KeyS') keysPressed.backward = false;
    if (e.code === 'KeyA') keysPressed.left = false;
    if (e.code === 'KeyD') keysPressed.right = false;
    if (e.code === 'KeyC' && keysPressed.camToggle) {
      useFollowCamera = !useFollowCamera;
      keysPressed.camToggle = false;
    }
  });
}
let skidMarks = [];
let particleGroup = new THREE.Group();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  physicsWorld.stepSimulation(delta, 10);

  // Stop creeping when idle
  if (!keysPressed.forward && !keysPressed.backward) {
    const vel = carBody.getLinearVelocity();
    if (vel.length() < 0.5) {
      carBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    }
  }

  carBody.activate();

  let engineForce = 0;
  let brakingForce = 0;
  let steering = 0;

  // Reset brake force
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  if (keysPressed.forward) {
    engineForce = 2000;
    brakingForce = 0;
  }
  if (keysPressed.backward) {
    engineForce = 0;
    brakingForce = 700;
  }
  if (keysPressed.left) steering = 0.3;
  if (keysPressed.right) steering = -0.3;

  vehicle.applyEngineForce(engineForce, 2);
  vehicle.applyEngineForce(engineForce, 3);
  vehicle.setBrake(brakingForce, 2);
  vehicle.setBrake(brakingForce, 3);
  vehicle.setSteeringValue(steering, 0);
  vehicle.setSteeringValue(steering, 1);

  const tm = vehicle.getRigidBody().getMotionState();
  if (tm) {
    tm.getWorldTransform(tmpTrans);
    const origin = tmpTrans.getOrigin();
    const rotation = tmpTrans.getRotation();
    carMesh.position.set(origin.x(), origin.y(), origin.z());
      // Flip model visually while keeping physics intact
  const flip = new THREE.Quaternion();
  flip.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const physicsQuat = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());
  carMesh.quaternion.copy(physicsQuat.multiply(flip));
  }


  if (useFollowCamera) {
    const offset = new THREE.Vector3(0, 15, 20).applyQuaternion(carMesh.quaternion);
    const target = carMesh.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(carMesh.position);
  } else {
    camera.position.set(0, 60, 0);
    camera.lookAt(carMesh.position);
  }

  if (Math.abs(engineForce) > 500 && Math.random() < 0.5) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffaaaa, transparent: false, opacity: 1 })
    );
    particle.position.copy(carMesh.position).add(new THREE.Vector3(10, 0.1, 0));
    particleGroup.add(particle);
    setTimeout(() => particleGroup.remove(particle), 500);
  }
  
  // Skid marks
  if (Math.abs(engineForce) > 1900) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.copy(carMesh.position);
    mark.position.y = 0.01;
    scene.add(mark);
    skidMarks.push(mark);
    if (skidMarks.length > 200) {
      const old = skidMarks.shift();
      scene.remove(old);
    }
  }
  for (let light of taillights) {
    light.material.emissive.setHex(keysPressed.backward ? 0xff0000 : 0x000000);
  }

  const linVel = carBody.getLinearVelocity();
  const speed = linVel.length() * 3.6; // m/s to km/h
  const gear = engineForce < 0 ? 'R' : 'D';
  hud.innerHTML = `Speed: ${speed.toFixed(0)} km/h Gear: ${gear}`;


  renderer.render(scene, camera);
}

init();
animate();

function createDefCar() {
  const carMesh = new THREE.Group();
    
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: carColor })
    );
    body.position.y = 0.3;
    carMesh.add(body);
    
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 2),
      new THREE.MeshStandardMaterial({ color: carColor.clone().offsetHSL(0, 0, -0.2) })
    );
    roof.position.set(0, 0.75, 0);
    carMesh.add(roof);
    
    const scoop = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    scoop.position.set(0, 0.6, -1.2);
    carMesh.add(scoop);
    
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: carColor.clone().offsetHSL(0, 0, -0.2) })
    );
    spoiler.position.set(0, 0.8, 2.2);
    carMesh.add(spoiler);
    
    const mirrorL = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    mirrorL.position.set(-1.05, 0.5, 0.5);
    carMesh.add(mirrorL);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x *= -1;
    carMesh.add(mirrorR);
    
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc });
    for (let x of [-0.6, 0.6]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), headlightMat);
      light.position.set(x, 0.5, -2.1);
      carMesh.add(light);
    }
    
    // Taillights
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000 });
    for (let x of [-0.6, 0.6]) {
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), brakeMat.clone());
      brake.position.set(x, 0.5, 2.1);
      carMesh.add(brake);
      taillights.push(brake);
    }
    
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const wheelOffsets = [
      [-0.9, -1.5],
      [0.9, -1.5],
      [-0.9, 1.5],
      [0.9, 1.5]
    ];
    const wheels = [];
    for (const [x, z] of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.2, z);
      carMesh.add(wheel);
      wheels.push(wheel);
    }
    return carMesh;
}

function createCarMesh({
  color = 0x996633,
  withSpoiler = false,
  withScoop = false,
  isPlayer = false
} = {}) {
  const mesh = new THREE.Group();
  const carMat = new THREE.MeshStandardMaterial({ color });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0.6
  });

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.6, 4),
    carMat
  );
  body.position.y = 0.3;
  mesh.add(body);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.3, 2.4),
    carMat
  );
  roof.position.set(0, 0.8, 0.7);
  mesh.add(roof);

  // Front windshield — наклонено
  const frontGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.4, 0.05),
    glassMat
  );
  frontGlass.position.set(0, 0.9, -0.7);
  frontGlass.rotation.x = -Math.PI / 10;
  mesh.add(frontGlass);

  // Rear windshield — наклонено и выше
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.4, 0.05),
    glassMat
  );
  rearGlass.position.set(0, 0.9, 2.0);
  rearGlass.rotation.x = Math.PI / 10;
  mesh.add(rearGlass);

  // Side windows
  for (let side of [-0.78, 0.78]) {
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.4, 1.8),
      glassMat
    );
    sideGlass.position.set(side, 0.9, 0.7);
    mesh.add(sideGlass);
  }

  // Scoop
  if (withScoop) {
    const scoop = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    scoop.position.set(0, 0.6, -1.5);
    mesh.add(scoop);
  }

  // Spoiler
  if (withSpoiler) {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.1, 0.3),
      carMat
    );
    spoiler.position.set(0, 0.65, 2.2);
    mesh.add(spoiler);
  }

  // Bumpers
  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  bumperF.position.set(0, 0.15, -2.1);
  mesh.add(bumperF);

  const bumperR = bumperF.clone();
  bumperR.position.z = 2.1;
  mesh.add(bumperR);

  // Headlights
  for (let x of [-0.6, 0.6]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0x333300 })
    );
    light.position.set(x, 0.45, -2.15);
    mesh.add(light);
  }

  // Rear lights (player only)
  
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000 });
    for (let x of [-0.6, 0.6]) {
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), brakeMat.clone());
      brake.position.set(x, 0.45, 2.15);
      mesh.add(brake);
      if (isPlayer) {
        taillights.push(brake);
      }
    }
  

  // Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  for (const [x, z] of [
    [-0.9, -1.5], [0.9, -1.5],
    [-0.9, 1.5], [0.9, 1.5]
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.2, z);
    mesh.add(wheel);
  }

  return mesh;
}


function createTestCar() {
  const car = new THREE.Group();

  const mainColor = carColor;
  const glassColor = 0x22ccff;
  const baseColor = 0xcccccc;
  const wheelColor = 0x222222;
  const rimColor = 0xffffff;
  const headlightColor = 0xffdd88;

  // Основное основание (низ кузова)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.2, 4),
    new THREE.MeshStandardMaterial({ color: baseColor })
  );
  base.position.y = 0.2;
  car.add(base);

  // Корпус
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.8, 4),
    new THREE.MeshStandardMaterial({ color: mainColor })
  );
  body.position.y = 0.8;
  car.add(body);

  // Кабина (трапециевидная)
  const cabin = createTrapezoidCabin(0x66ccff);
  

  car.add(cabin);

  // Крыша
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.1, 1.9),
    new THREE.MeshStandardMaterial({ color: mainColor })
  );
  roof.position.set(0, 0.76, 0);
  cabin.add(roof);

  // Линии на капоте (чёрные полоски)
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  for (let offset of [-0.6, 0, 0.6]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 1.2), lineMat);
    line.position.set(offset, 1.01, -1.4);
    car.add(line);
  }

  // Фары
  for (let x of [-0.6, 0.6]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: headlightColor })
    );
    headlight.position.set(x, 0.9, -2.05);
    car.add(headlight);
  }

  // Колеса
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.22, 8);
  for (let [x, z] of [
    [-1, -1.5], [1, -1.5],
    [-1, 1.5], [1, 1.5]
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: wheelColor }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.4, z);
    car.add(wheel);

    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: rimColor }));
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, 0.401, z);
    car.add(rim);
  }

  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000 });
  for (let x of [-0.6, 0.6]) {
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), brakeMat.clone());
    brake.position.set(x, 0.45, 2.15);
    car.add(brake);
    if (true) {
      taillights.push(brake);
    }
  }

  return car;
}


function createTrapezoidCabin(color = 0x444444) {
  const group = new THREE.Group();

  const bottomWidth = 1.8;
  const topWidth = 1.2;
  const depth = 2;
  const height = 0.8;

  const shape = new THREE.Shape();
  shape.moveTo(-bottomWidth / 2, 0);
  shape.lineTo(bottomWidth / 2, 0);
  shape.lineTo(topWidth / 2, height);
  shape.lineTo(-topWidth / 2, height);
  shape.lineTo(-bottomWidth / 2, 0);

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ color });
  const cabin = new THREE.Mesh(geometry, material);
  cabin.position.set(0, 0, -depth / 2);
  group.add(cabin);

  // Add windows
  

  group.position.y = 0.95;

  return group;
}
