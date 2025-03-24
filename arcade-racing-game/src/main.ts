// Pako-style minimal level — refactored for Ammo.js physics integration
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import * as Ammo from 'ammo.js';

let scene, camera, renderer, clock, vehicle;
let physicsWorld;
let carBody, carMesh;
let tmpTrans;

const keysPressed = { forward: false, backward: false, left: false, right: false, camToggle: false };
let useFollowCamera = true;

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

  // Add road
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.1, 120),
    new THREE.MeshStandardMaterial({ color: 0x2f2f2f })
  );
  road.position.set(0, 0.05, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Add trees
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
  clock = new THREE.Clock();

  // Lights
  const light = new THREE.DirectionalLight(0xffeedd, 1.5);
  light.position.set(0, 10, -120);
  light.castShadow = true;
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  // Ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200), groundMat);
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

    // Car visual
const carColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);
carMesh = new THREE.Group();

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
  new THREE.MeshStandardMaterial({ color: carColor })
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

  carMesh.position.set(0, 2, -55);
  carMesh.rotateY(0); // flip the visual model 180° to face forward

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

  addWall(0, -wallSize, wallSize * 2, wallThickness); // far back
  addWall(0, wallSize, wallSize * 2, wallThickness);  // front
  addWall(-wallSize, 0, wallThickness, wallSize * 2); // left
  addWall(wallSize, 0, wallThickness, wallSize * 2);  // right

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

  // Horizon light effect (sun)
  const sunGeo = new THREE.RingGeometry(15, 18, 64);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.rotation.x = -Math.PI / 2;
  sunMesh.position.set(0, 0.1, -120);
  scene.add(sunMesh);

  const haloGeo = new THREE.RingGeometry(19, 22, 64);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffddaa, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.rotation.x = -Math.PI / 2;
  haloMesh.position.set(0, 0.09, -120);
  scene.add(haloMesh);

  const flareTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
  const lensflare = new Lensflare();
  lensflare.addElement(new LensflareElement(flareTexture, 512, 0));
  lensflare.position.set(0, 10, -120);
  scene.add(lensflare);

  // HUD (basic)
  const hud = document.createElement('div');
  hud.style.position = 'absolute';
  hud.style.left = '20px';
  hud.style.bottom = '20px';
  hud.style.padding = '10px 15px';
  hud.style.borderRadius = '10px';
  hud.style.background = 'rgba(0, 0, 0, 0.6)';
  hud.style.color = '#ffffff';
  hud.style.fontFamily = 'monospace';
  hud.style.fontSize = '18px';
  hud.style.pointerEvents = 'none';
  hud.innerHTML = 'Speed: 0 km/h\nGear: D';
  document.body.appendChild(hud);

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

  for (let x of [-10, 10]) {
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

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  physicsWorld.stepSimulation(delta, 10);

  carBody.activate();

  let engineForce = 0;
  let brakingForce = 0;
  let steering = 0;

  // Reset brake force
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  if (keysPressed.forward) {
    engineForce =   1000;
    brakingForce = 0;
  }
  if (keysPressed.backward) {
    engineForce = 0;
    brakingForce = 200;
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
  renderer.render(scene, camera);
}

init();
animate();
