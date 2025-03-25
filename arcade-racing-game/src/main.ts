// ----- Pako-style minimal level + Tile-based Road Generator + Ammo.js -----

import * as THREE from 'three';
import * as Ammo from 'ammo.js';
import { createTestCar, createDefCar } from './car-gen';
import { createTrees } from './tree-gen';
import { createHouse, createParkingLot, createModernHighrise, createClassicHouse } from './house-get';
import addMapBorders from './mapBordert';

let alertLevel = 1;
const maxAlertLevel = 5;


let scene, camera, renderer, clock, vehicle;
let physicsWorld;
let carBody, carMesh;
let tmpTrans;
const carColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);

let policeCars = []


let gameOver = false;
let survivalTime = 0;
let survivalTimerInterval

const arrestMessage = document.createElement('div');
arrestMessage.style.position = 'absolute';
arrestMessage.style.top = '50%';
arrestMessage.style.left = '50%';
arrestMessage.style.transform = 'translate(-50%, -50%)';
arrestMessage.style.padding = '20px 40px';
arrestMessage.style.fontSize = '32px';
arrestMessage.style.fontFamily = 'Orbitron, monospace';
arrestMessage.style.background = 'rgba(0,0,0,0.7)';
arrestMessage.style.color = 'white';
arrestMessage.style.borderRadius = '15px';
arrestMessage.style.display = 'none';
arrestMessage.innerText = 'Busted!';
document.body.appendChild(arrestMessage);

function checkPlayerArrested() {
  const playerPos = carMesh.position;

  for (let car of policeCars) {
    const policePos = car.mesh.position;
    const distance = playerPos.distanceTo(policePos);
    if (distance < 4) {
      return true;
    }
  }
  return false;
}

const keysPressed = { forward: false, backward: false, left: false, right: false, camToggle: false };
let useFollowCamera = true;
let taillights = [];

function explodePoliceCar(car) {
  const { mesh, body, vehicle } = car;

  // Визуальный взрыв — создаём яркий вспышечный шар
  const explosion = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4400, emissive: 0xff0000 })
  );
  explosion.position.copy(mesh.position);
  scene.add(explosion);

  // Анимация исчезновения взрыва
  let scale = 1;
  const explosionInterval = setInterval(() => {
    scale += 0.3;
    explosion.scale.set(scale, scale, scale);
    explosion.material.opacity = 1 - scale / 5;
    if (scale >= 5) {
      clearInterval(explosionInterval);
      scene.remove(explosion);
    }
  }, 30);

  // Удаление из Ammo
  physicsWorld.removeRigidBody(body);
  physicsWorld.removeAction(vehicle);

  // Удаление из сцены
  scene.remove(mesh);

  // Удаление из массива
  const index = policeCars.indexOf(car);
  if (index !== -1) policeCars.splice(index, 1);
}

function spawnPoliceCar(scene, physicsWorld, playerMesh, roadMeshes) {
  const tuning = new Ammo.btVehicleTuning();
  const carColor = new THREE.Color(0x2233ff);
  const taillights = [];
  const mesh = createDefCar(carColor, taillights);
  mesh.position.set(Math.random() * 100 - 50, 1, Math.random() * 100 - 50);
  scene.add(mesh);

  const chassisShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.3, 2));
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));
  const mass = 600;
  const inertia = new Ammo.btVector3(0, 0, 0);
  chassisShape.calculateLocalInertia(mass, inertia);
  const motionState = new Ammo.btDefaultMotionState(transform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, chassisShape, inertia);
  const body = new Ammo.btRigidBody(rbInfo);
  body.setFriction(0.8);
  body.setDamping(0.1, 0.1);
  body.setRestitution(0.1);
  physicsWorld.addRigidBody(body);

  const rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
  const vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
  vehicle.setCoordinateSystem(0, 1, 2);
  physicsWorld.addAction(vehicle);

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
    wheelInfo.set_m_suspensionStiffness(30);
    wheelInfo.set_m_wheelsDampingRelaxation(4.3);
    wheelInfo.set_m_wheelsDampingCompression(4.4);
    wheelInfo.set_m_frictionSlip(1200);
    wheelInfo.set_m_rollInfluence(0.05);
    wheelInfo.set_m_maxSuspensionForce(10000);

  }
  addWheel(true, new Ammo.btVector3(-wheelHalfTrack, wheelAxisHeight, wheelBase));
  addWheel(true, new Ammo.btVector3(wheelHalfTrack, wheelAxisHeight, wheelBase));
  addWheel(false, new Ammo.btVector3(-wheelHalfTrack, wheelAxisHeight, -wheelBase));
  addWheel(false, new Ammo.btVector3(wheelHalfTrack, wheelAxisHeight, -wheelBase));

  const road = roadMeshes[Math.floor(Math.random() * roadMeshes.length)];

  // Получаем позицию дороги
  const roadPos = new THREE.Vector3();
  if (road) {
    road.getWorldPosition(roadPos);
  }

  // Добавим небольшое случайное смещение (в пределах тайла)
  const tileSize = 10;
  const offsetX = (Math.random() - 0.5) * tileSize * 0.5;
  const offsetZ = (Math.random() - 0.5) * tileSize * 0.5;

  const spawnX = roadPos.x + offsetX;
  const spawnZ = roadPos.z + offsetZ;

  mesh.position.set(spawnX, 1, spawnZ);

  policeCars.push({
    mesh, body, taillights, vehicle,
    smoothedDir: null,
    steeringSmoothed: 0,
    maxSpeed: 160 + Math.random() * 20, // км/ч
    enginePower: 2300 + Math.random() * 1000,
    behaviorOffset: new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      0,
      (Math.random() - 0.5) * 10
    )
  });
}



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
let roadMeshes = []

function isCarOnRoad(carPos, roadMeshes) {
  for (const tile of roadMeshes) {
    const halfX = tile.sizeX / 2;
    const halfZ = tile.sizeZ / 2;
    if (
      carPos.x > tile.x - halfX && carPos.x < tile.x + halfX &&
      carPos.z > tile.z - halfZ && carPos.z < tile.z + halfZ
    ) {
      return true;
    }
  }
  return false;
}

function applyOffroadPenaltyByTiles(carBody, roadMeshes) {
  const transform = new Ammo.btTransform();
  carBody.getMotionState().getWorldTransform(transform);
  const origin = transform.getOrigin();
  const carPos = new THREE.Vector3(origin.x(), origin.y(), origin.z());

  let isOnRoad = false;
  for (const mesh of roadMeshes) {
    const box = new THREE.Box3().setFromObject(mesh);
    const flatCarPos = carPos.clone();
    flatCarPos.y = (box.min.y + box.max.y) / 2; // flatten to match road height
    if (box.containsPoint(flatCarPos)) {
      isOnRoad = true;
      break;
    }
  }

  console.log(isOnRoad)

  console.log(isOnRoad)
  if (!isOnRoad) {
    const velocity = carBody.getLinearVelocity();
    const slowdown = 1;
    carBody.setLinearVelocity(new Ammo.btVector3(
      velocity.x() * slowdown,
      velocity.y(),
      velocity.z() * slowdown
    ));
  }
}

// Пример формата дорожного уровня на основе строкового массива
const roadMap = [
  "                                          ",
  " |wWWWWWWWWWWWWWWWWWWWWwWWWWWWWWWWWWWWWWWW",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  WWWWWWWWWWWWWWWWWWWWWwWWWWWWWWWWWWWWWWw ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  w                    w                w ",
  "  wWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "..........................................",
];

const buildingsMap = [
  "         A     A             A    A    A  ",
  " |---                --||--               ",
  " |---WWWWWWWWWWWWWWWWW||||WWWWWWWWWW  WWW ",
  " |---                -:  :-              -",
  "  w     A             :  :    A   A    A  ",
  "  w                   :  :                ",
  "  w                   :  :                ",
  "  w                   :  :    U           ",
  "  w                   :||:                ",
  "  w                   :  :                ",
  "  w                   :  :                ",
  "  w                   :  :    U           ",
  "  w                   :  :                ",
  "  w                   :  :         U      ",
  "  w                   ||||                ",
  "  WWWWWWWWWWWWWWWWWWWWW||WWWWWWWWWWWWWWWWW",
  "  w                   ||||                ",
  "  w                     ||                ",
  "  w                     ||                ",
  "  w                     --                ",
  "   WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "   WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "  w                     --     U    U     ",
];

function generateBuildingsFromMap(map, scene) {
  if (!scene) return;
  const tileSize = 10;

  for (let z = 0; z < map.length; z++) {
    const row = map[z];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const posX = (x - row.length / 2) * tileSize;
      const posZ = (z - map.length / 2) * tileSize;

      let building = null;

      switch (char) {
        case 'H':
          building = createHouse();
          break;
        case 'A':
          building = createClassicHouse();
          break;
        case 'U':
          building = createModernHighrise();
          break;
      }

      if (building) {
        building.position.set(posX, 0, posZ);
        scene.add(building);

        const width = 20;
        const height = 20;
        const depth = 20
        const shape = new Ammo.btBoxShape(new Ammo.btVector3(width / 2, height / 2, depth / 2));
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(posX, height / 2, posZ));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, new Ammo.btVector3(0, 0, 0));
        const body = new Ammo.btRigidBody(rbInfo);
        physicsWorld.addRigidBody(body);
      }
    }
  }
}

function generateRoadFromMap(map, scene) {
  const roadMeshes = [];
  const tileSize = 10;

  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const markingYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
  const markingWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const tileGeo = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
  const markingLineThinH = new THREE.BoxGeometry(tileSize * 0.9, 0.01, tileSize * 0.02);
  const markingLineThinV = new THREE.BoxGeometry(tileSize * 0.02, 0.01, tileSize * 0.9);

  // Невидимая платформа под уровнем земли — защита от проваливания
  const fallbackShape = new Ammo.btBoxShape(new Ammo.btVector3(200, 0, 200));
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
      if (isVertical || isHorizontal) {
        if (char === 'W') {
          // Четырёхполосная горизонтальная
          const wideRoad = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.1, tileSize ), roadMaterial);
          wideRoad.position.set(posX, 0.05, posZ);
          scene.add(wideRoad);
          roadMeshes.push(wideRoad);

          const whiteSpacing = tileSize * 0.475;
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
          roadMeshes.push(wideRoad);
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
          roadMeshes.push(road);
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

      if (char === 'P') {
        road = new THREE.Mesh(tileGeo, roadMaterial);
        road.position.set(posX, 0.05, posZ);
        road.add(createParkingLot(posX, posZ));
        scene.add(road);
      }

      // Разметка прерывистая вертикальная (:)
      if (char === ':') {
        const marking = new THREE.Mesh(markingLineThinV, markingWhite);
        marking.position.set(posX, 0.11, posZ);
        scene.add(marking);
      }

      // Add markings based on the character
      if (road) {
        // Add edge lines to all roads

      }
    }
  }
  return roadMeshes;
}

function init() {
  survivalTimerInterval = setInterval(() => {
    if (!gameOver) {
      survivalTime++;
    }
  }, 1000);

  const alertTimerSeconds = 20;
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffcc99);
  scene.fog = new THREE.Fog(0xffcc99, 30, 250);

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
  addMapBorders(scene, physicsWorld);


  setInterval(() => {
    if (!gameOver && alertLevel < maxAlertLevel) {
      alertLevel++;
      console.log(`ALERT LEVEL UP! Level = ${alertLevel}`);

      for (let car of policeCars) {
        car.maxSpeed += 4 * alertLevel;
        car.enginePower += 150 * alertLevel;
      }
    }
  }, alertTimerSeconds * 1000);

  setInterval(() => {
    for (let i = 0; i < alertLevel * 4; i++) {
      spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    }
  }, 10 * 1000);

  tmpTrans = new Ammo.btTransform();

  if (scene) createTrees(scene, roadMap);
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
      vec2 grid = floor(vUv * 600.0);
      float h = hash(grid);

      vec3 autumn1 = vec3(0.65, 0.45, 0.28);
      vec3 autumn2 = vec3(0.5, 0.35, 0.2);
      vec3 autumn3 = vec3(0.8, 0.65, 0.35);
      vec3 autumn4 = vec3(0.6, 0.54, 0.25);

      vec3 color;
      if (h < 0.3) color = autumn3; // yellow — 30%
      else if (h < 0.9) color = autumn1; // orange — 40%
      else if (h < 0.95) color = autumn4; // brown — 20%
      else color = autumn2; // greenish — 10%

      gl_FragColor = vec4(color, 1.0);
    }
    `
  });

  const ground = new THREE.Mesh(new THREE.BoxGeometry(450, 1, 450), groundMat);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(450, 0.5, 405));
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

  // Set better friction and damping
  carBody.setFriction(0.8);
  carBody.setDamping(0.1, 0.1); // Linear and angular damping
  carBody.setRestitution(0.1); // Lower bouncing

  physicsWorld.addRigidBody(carBody);

  const tuning = new Ammo.btVehicleTuning();
  const rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
  vehicle = new Ammo.btRaycastVehicle(tuning, carBody, rayCaster);
  vehicle.setCoordinateSystem(0, 1, 2);
  physicsWorld.addAction(vehicle);

  spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
  spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
  spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);

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

    // Improve wheel physics parameters
    wheelInfo.set_m_suspensionStiffness(30); // Increased from 20
    wheelInfo.set_m_wheelsDampingRelaxation(4.3); // Increased from 2.3
    wheelInfo.set_m_wheelsDampingCompression(4.4);
    wheelInfo.set_m_frictionSlip(1200); // Increased from 1000
    wheelInfo.set_m_rollInfluence(0.05); // Reduced from 0.1 for better stability
    wheelInfo.set_m_maxSuspensionForce(10000); // Add max suspension force
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

  roadMeshes = generateRoadFromMap(roadMap, scene);
  generateBuildingsFromMap(buildingsMap, scene);
}

function updatePoliceAI(delta) {
  for (let car of policeCars) {
    const { mesh, vehicle, body } = car;

    const playerPos = carMesh.position.clone();
    const policePos = mesh.position.clone();

    // Направление к игроку с индивидуальным смещением
    const toPlayer = new THREE.Vector3().subVectors(playerPos, policePos);
    toPlayer.add(car.behaviorOffset); // индивидуальное отклонение
    const distance = toPlayer.length();

    if (distance > 300) continue;

    // === Избежание других ===
    const avoidance = new THREE.Vector3();
    for (let other of policeCars) {
      if (other === car) continue;
      const diff = new THREE.Vector3().subVectors(policePos, other.mesh.position);
      const dist = diff.length();
      if (dist < 20 && dist > 0.01) {
        const strength = 1.5 / dist; // усилено
        avoidance.add(diff.normalize().multiplyScalar(strength));
      }
    }

    const desiredDir = toPlayer.add(avoidance.multiplyScalar(2.5)).normalize();

    // Сглаживаем направление
    if (!car.smoothedDir) car.smoothedDir = desiredDir.clone();
    else car.smoothedDir.lerp(desiredDir, 0.1);

    // Направление вперёд
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
    forward.y = 0;
    forward.normalize();

    const angle = forward.angleTo(car.smoothedDir);
    const cross = forward.clone().cross(car.smoothedDir);
    const steerSign = cross.y < 0 ? 1 : -1;

    let steering = 0;
    if (angle > 0.05) {
      steering = steerSign * Math.min(angle, 0.4);
    }

    // Получаем текущую скорость
    const vel = body.getLinearVelocity();
    const speed = vel.length() * 3.6; // в км/ч

    const maxSpeed = car.maxSpeed;
    const engineForce = speed < maxSpeed ? car.enginePower : 0;
    const brakingForce = speed > maxSpeed + 10 ? 200 : 0;

    // Steering — сглаживание
    car.steeringSmoothed += (steering - car.steeringSmoothed) * 0.2;

    // Применяем
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);
    vehicle.setBrake(brakingForce, 2);
    vehicle.setBrake(brakingForce, 3);
    vehicle.setSteeringValue(car.steeringSmoothed, 0);
    vehicle.setSteeringValue(car.steeringSmoothed, 1);

    // Синхронизация меша
    const tm = vehicle.getRigidBody().getMotionState();
    if (tm) {
      tm.getWorldTransform(tmpTrans);
      const origin = tmpTrans.getOrigin();
      const rotation = tmpTrans.getRotation();
      mesh.position.set(origin.x(), origin.y(), origin.z());

      const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      const physicsQuat = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());
      mesh.quaternion.copy(physicsQuat.multiply(flip));
    }

    const carPos = mesh.position.clone();
    let collided = false;

    // С игроком
    if (carPos.distanceTo(carMesh.position) < 4) {
      collided = true;
    }

    // С другими полицейскими
    for (let other of policeCars) {
      if (other === car) continue;
      const otherPos = other.mesh.position.clone();
      if (carPos.distanceTo(otherPos) < 4) {
        setTimeout(() => {
          explodePoliceCar(car);
          explodePoliceCar(other);
        }, 222);
        break;
      }
    }
  }
}




function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  physicsWorld.stepSimulation(delta, 10);
  applyOffroadPenaltyByTiles(carBody, roadMeshes);

  // Improved idle stabilization
  if (!keysPressed.forward && !keysPressed.backward) {
    const vel = carBody.getLinearVelocity();
    const speed = vel.length();

    // More aggressive velocity damping at very low speeds
    if (speed < 2.0) {
      // Apply linear damping based on current speed
      const dampingFactor = 0.8; // Higher value = more damping
      const newVel = new Ammo.btVector3(
        vel.x() * (1 - dampingFactor * delta),
        vel.y(),  // Don't dampen vertical velocity (gravity)
        vel.z() * (1 - dampingFactor * delta)
      );
      carBody.setLinearVelocity(newVel);

      // If extremely slow, just stop completely to avoid micro-movements
      if (speed < 0.5) {
        carBody.setLinearVelocity(new Ammo.btVector3(0, vel.y(), 0));

        // Also zero out angular velocity to prevent rotation when stopped
        const angVel = carBody.getAngularVelocity();
        if (angVel.length() < 0.5) {
          carBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
        }
      }
    }
  }

  carBody.activate();

  let engineForce = 0;
  let brakingForce = 0;
  let steering = 0;

  // Reset brake
  vehicle.setBrake(0, 0);
  vehicle.setBrake(0, 1);
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  if (!gameOver) {
    if (keysPressed.forward) {
      engineForce = 2800;
      brakingForce = 0;
    }
    if (keysPressed.backward) {
      engineForce = 0;
      brakingForce = 700;
    }
    if (keysPressed.left) steering = 0.3;
    if (keysPressed.right) steering = -0.3;
  } else {
    engineForce = 0;
    brakingForce = 1000;
  }


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

  const playerPos = carMesh.position;

  // Камера
  if (useFollowCamera) {
    const offset = new THREE.Vector3(0, 12, 15).applyQuaternion(carMesh.quaternion);
    const target = carMesh.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(carMesh.position);
  } else {
    const targetPosition = carMesh.position.clone().add(new THREE.Vector3(0, 40, -40));
    camera.position.lerp(targetPosition, 0.05);
    camera.lookAt(carMesh.position.clone());


  }

  // Обновляем стоп-сигналы
  for (let light of taillights) {
    light.material.emissive.setHex(keysPressed.backward ? 0xff0000 : 0x000000);
  }


  if (policeCars.length < 3) {
    spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
  }
  // HUD
  const linVel = carBody.getLinearVelocity();
  const speed = linVel.length() * 3.6; // m/s в km/h
  const gear = engineForce < 0 ? 'R' : 'D';
  hud.innerHTML = `Speed: ${speed < 2 ? '0' : speed.toFixed(0)} km/h Gear: ${gear}`;
  hud.innerHTML = `
  Speed: ${speed < 2 ? '0' : speed.toFixed(0)} km/h Gear: ${gear}<br>
  Survived: ${survivalTime} s<br>
  Alert Level: ${'🔥'.repeat(alertLevel)}
`;
  updatePoliceAI(delta);
  if (checkPlayerArrested()) {
    gameOver = true;
    arrestMessage.style.display = 'block';

    // Отключим движение
    vehicle.applyEngineForce(0, 2);
    vehicle.applyEngineForce(0, 3);
    vehicle.setBrake(1000, 2);
    vehicle.setBrake(1000, 3);
  }
  renderer.render(scene, camera);



}

init();
animate();


