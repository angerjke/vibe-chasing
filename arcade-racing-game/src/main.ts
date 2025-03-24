// ----- Pako-style minimal level + Tile-based Road Generator + Ammo.js -----

import * as THREE from 'three';
import * as Ammo from 'ammo.js';
import { createDefCar, createTestCar } from './car-gen';


let scene, camera, renderer, clock, vehicle;
let physicsWorld;
let carBody, carMesh;
let tmpTrans;
const carColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);

const keysPressed = { forward: false, backward: false, left: false, right: false, camToggle: false };
let useFollowCamera = true;
let taillights = [];

// ----- Создадим HUD -----
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

// Пример формата дорожного уровня на основе строкового массива
const roadMap = [
  "   w   |                       ",
  "---+---+----------------+------",
  "   w P |                :      ",
  "WWW+WWW:WWWWWWWWWWWWWWWW+WWWWWW",
  "   w   :                :      ",
  "   w   :                :      ",
  "   w   :                :      ",
  "   w   :                :      ",
];

function generateRoadFromMap(map, scene) {
  const tileSize = 10;

  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const markingYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
  const markingWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const tileGeo = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
  const markingLineThinH = new THREE.BoxGeometry(tileSize * 0.9, 0.01, tileSize * 0.02);
  const markingLineThinV = new THREE.BoxGeometry(tileSize * 0.02, 0.01, tileSize * 0.9);

   // Невидимая платформа под уровнем земли — защита от проваливания
   const fallbackShape = new Ammo.btBoxShape(new Ammo.btVector3(200, 5, 200));
   const fallbackTransform = new Ammo.btTransform();
   fallbackTransform.setIdentity();
   fallbackTransform.setOrigin(new Ammo.btVector3(0, -0.5, 0));
   const fallbackMotion = new Ammo.btDefaultMotionState(fallbackTransform);
   const fallbackRBInfo = new Ammo.btRigidBodyConstructionInfo(0, fallbackMotion, fallbackShape, new Ammo.btVector3(0, 0, 0));
   const fallbackBody = new Ammo.btRigidBody(fallbackRBInfo);
   physicsWorld.addRigidBody(fallbackBody);

  for (let z = 0; z < map.length; z++) {
    const row = map[z];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const posX = (x - row.length / 2) * tileSize;
      const posZ = (z - map.length / 2) * tileSize;

      let road = null;

      const isVertical = char === '|' || char === 'P' || char === '#' || char === ':' || char === 'w';
      const isHorizontal = char === '-' || char === '=' || char === '.' || char === 'W';

      // Простая дорога и широкие тайлы
      if (isVertical || isHorizontal || char === '+') {
        if (char === 'W') {
          // Четырёхполосная горизонтальная
          const wideRoad = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.1, tileSize * 2), roadMaterial);
          wideRoad.position.set(posX, 0.05, posZ);
          scene.add(wideRoad);

          const whiteSpacing = tileSize * 0.375;
          const yellowSpacing = 0.02 * tileSize;

          // Белые линии по краям
          for (let i = -1; i <= 1; i += 2) {
            const whiteLine = new THREE.Mesh(markingLineThinH, markingWhite);
            whiteLine.position.set(posX, 0.11, posZ + i * whiteSpacing);
            scene.add(whiteLine);
          }

          // Двойная жёлтая в центре
          for (let i = -1; i <= 1; i += 2) {
            const yellowGeo = new THREE.BoxGeometry(tileSize, 0.01, tileSize * 0.015);
            const yellowLine = new THREE.Mesh(yellowGeo, markingYellow);
            yellowLine.position.set(posX, 0.11, posZ + i * yellowSpacing);
            scene.add(yellowLine);
          }
        } else if (char === 'w') {
          // Четырёхполосная вертикальная
          const wideRoad = new THREE.Mesh(new THREE.BoxGeometry(tileSize * 2, 0.1, tileSize), roadMaterial);
          wideRoad.position.set(posX, 0.05, posZ);
          scene.add(wideRoad);

          const whiteSpacing = tileSize * 0.375;
          const yellowSpacing = 0.02 * tileSize;

          // Белые линии по краям
          for (let i = -1; i <= 1; i += 2) {
            const whiteLine = new THREE.Mesh(markingLineThinV, markingWhite);
            whiteLine.position.set(posX + i * whiteSpacing, 0.11, posZ);
            scene.add(whiteLine);
          }

          // Двойная жёлтая в центре
          for (let i = -1; i <= 1; i += 2) {
            const yellowGeo = new THREE.BoxGeometry(tileSize * 0.015, 0.01, tileSize);
            const yellowLine = new THREE.Mesh(yellowGeo, markingYellow);
            yellowLine.position.set(posX + i * yellowSpacing, 0.11, posZ);
            scene.add(yellowLine);
          }
        } else {
          road = new THREE.Mesh(tileGeo, roadMaterial);
          road.position.set(posX, 0.05, posZ);
          scene.add(road);
        }
      }

      // Разметка жёлтая двойная сплошная горизонтальная (==)
      if (char === '=') {
        const spacing = 0.01 * tileSize;
        const solidLength = tileSize;
        const solidWidth = tileSize * 0.015;

        for (let i = -1; i <= 1; i += 2) {
          const markingGeo = new THREE.BoxGeometry(solidLength, 0.01, solidWidth);
          const marking = new THREE.Mesh(markingGeo, markingYellow);
          marking.position.set(posX, 0.11, posZ + i * spacing);
          scene.add(marking);
        }
      }

      // Разметка жёлтая двойная сплошная вертикальная (#)
      if (char === '#') {
        const spacing = 0.01 * tileSize;
        const solidLength = tileSize;
        const solidWidth = tileSize * 0.015;

        for (let i = -1; i <= 1; i += 2) {
          const markingGeo = new THREE.BoxGeometry(solidWidth, 0.01, solidLength);
          const marking = new THREE.Mesh(markingGeo, markingYellow);
          marking.position.set(posX + i * spacing, 0.11, posZ);
          scene.add(marking);
        }
      }

      // Разметка прерывистая горизонтальная (.)
      if (char === '.') {
        const marking = new THREE.Mesh(markingLineThinH, markingWhite);
        marking.position.set(posX, 0.11, posZ);
        scene.add(marking);
      }

      // Разметка прерывистая вертикальная (:)
      if (char === ':') {
        const marking = new THREE.Mesh(markingLineThinV, markingWhite);
        marking.position.set(posX, 0.11, posZ);
        scene.add(marking);
      }
    }
  }
}

// Использование (после init):
// generateRoadFromMap(roadMap, scene);

// Использование (после init):
// generateRoadFromMap(roadMap, scene);

// Использование (после init):
// generateRoadFromMap(roadMap, scene);


// Использование (после init):
// generateRoadFromMap(roadMap, scene);

// Использование (после init):


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
    `
  });

  const ground = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 400), groundMat);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(100, 0.5, 100));
  const groundTransform = new Ammo.btTransform();
  groundTransform.setIdentity();
  groundTransform.setOrigin(new Ammo.btVector3(0, -0.5, 0));
  const motionState = new Ammo.btDefaultMotionState(groundTransform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, groundShape, localInertia);
  const groundBody = new Ammo.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(groundBody);

  
  carMesh = createTestCar(carColor, taillights);
  carMesh.position.set(0, 2, -55);
  scene.add(carMesh);

  // Car physics
  const chassisShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.3, 2));
  const chassisTransform = new Ammo.btTransform();
  chassisTransform.setIdentity();
  chassisTransform.setOrigin(new Ammo.btVector3(0, 2, -55));
  chassisTransform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
  const chassisMass = 800;
  const chassisInertia = new Ammo.btVector3(0, 0, 0);
  chassisShape.calculateLocalInertia(chassisMass, chassisInertia);
  const chassisMotion = new Ammo.btDefaultMotionState(chassisTransform);
  const chassisRbInfo = new Ammo.btRigidBodyConstructionInfo(chassisMass, chassisMotion, chassisShape, chassisInertia);
  carBody = new Ammo.btRigidBody(chassisRbInfo);
  carBody.setActivationState(4);
  physicsWorld.addRigidBody(carBody);

  const tuning = new Ammo.btVehicleTuning();
  const rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
  vehicle = new Ammo.btRaycastVehicle(tuning, carBody, rayCaster);
  vehicle.setCoordinateSystem(0, 1, 2);
  physicsWorld.addAction(vehicle);

  // Wheels
  const wheelRadius = 0.4;
  const wheelWidth = 0.3;
  const wheelHalfTrack = 0.9;
  const wheelAxisHeight = 0.2;
  const wheelBase = 1.5;

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

  generateRoadFromMap(roadMap, scene);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  physicsWorld.stepSimulation(delta, 10);

  // Остановка, если не жмут газ/тормоз
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

  // Reset brake
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
    // Флип меша, чтобы модель шла «вперёд»
    const flip = new THREE.Quaternion();
    flip.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const physicsQuat = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());
    carMesh.quaternion.copy(physicsQuat.multiply(flip));
  }

  // Камера
  if (useFollowCamera) {
    const offset = new THREE.Vector3(0, 15, 20).applyQuaternion(carMesh.quaternion);
    const target = carMesh.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(carMesh.position);
  } else {
    camera.position.set(0, 60, 0);
    camera.lookAt(carMesh.position);
  }

  // Обновляем стоп-сигналы
  for (let light of taillights) {
    light.material.emissive.setHex(keysPressed.backward ? 0xff0000 : 0x000000);
  }

  // HUD
  const linVel = carBody.getLinearVelocity();
  const speed = linVel.length() * 3.6; // m/s в km/h
  const gear = engineForce < 0 ? 'R' : 'D';
  hud.innerHTML = `Speed: ${speed.toFixed(0)} km/h Gear: ${gear}`;

  renderer.render(scene, camera);
}

init();
animate();


