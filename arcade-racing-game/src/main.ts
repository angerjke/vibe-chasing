// ----- Pako-style minimal level + Tile-based Road Generator + Ammo.js -----

import * as THREE from 'three';
import * as Ammo from 'ammo.js';
import { initLevelEditor } from './edit';

function createRoadSegment(config) {
  const {
    type = 'straight',
    position = [0, 0],
    rotation = 0,
    width = 6,
    length = 20,
    marking = 'none',
    withCurbs = true,
    curbSide = 'both' // <=== вот это новое
  } = config;

  const group = new THREE.Group();
  group.position.set(position[0], 0.05, position[1]);
  group.rotation.y = rotation;

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const markingMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const markingMatYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x999999 });

  const markingHeight = 0.02;
  const markingOffsetY = 0.06;

  // ==== Дорога ====
  const roadGeo = new THREE.BoxGeometry(width, 0.1, length);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.receiveShadow = true;
  group.add(road);

  // ==== Бордюры ====
  if (withCurbs) {
    const curbWidth = 0.2;
    const curbHeight = 0.15;

    const sides = [];
    if (curbSide === 'both') sides.push(-1, 1);
    else if (curbSide === 'left') sides.push(-1);
    else if (curbSide === 'right') sides.push(1);

    for (let side of sides) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(curbWidth, curbHeight, length),
        curbMat
      );
      curb.position.set((width / 2 + curbWidth / 2) * side, curbHeight / 2 + 0.05, 0);
      group.add(curb);
    }
  }

  // ==== Разметка ====
  if (marking === 'dashed-center') {
    for (let z = -length / 2; z <= length / 2 - 1.5; z += 3) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, markingHeight, 1.5),
        markingMatWhite
      );
      line.position.set(0, markingOffsetY, z + 0.75); // центр линии
      group.add(line);
    }
  }

  else if (marking === 'double-yellow') {
    for (let offset of [-0.1, 0.1]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, markingHeight, length),
        markingMatYellow
      );
      line.position.set(offset, markingOffsetY, 0);
      group.add(line);
    }
  }

  else if (marking === 'crosswalk') {
    for (let x = -width / 2 + 0.5; x < width / 2; x += 1.2) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, markingHeight, 2),
        markingMatWhite
      );
      stripe.position.set(x, markingOffsetY, 0);
      group.add(stripe);
    }
  }

  else if (marking === 'two-lane-both-sides') {
    // Центр — двойная жёлтая
    for (let offset of [-0.1, 0.1]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, markingHeight, length),
        markingMatYellow
      );
      line.position.set(offset, markingOffsetY, 0);
      group.add(line);
    }

    // Боковые пунктирные
    for (let z = -length / 2; z <= length / 2 - 1.5; z += 3) {
      for (let side of [-4.7, 4.7]) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, markingHeight, 1.5),
          markingMatWhite
        );
        line.position.set(side, markingOffsetY, z + 0.75);
        group.add(line);
      }
    }
  }

  return group;
}

function createTree(type = 0, scale = 4, rotation = 0) {
  const trunkGeos = [
    new THREE.CylinderGeometry(0.15, 0.2, 2.4, 6),
    new THREE.CylinderGeometry(0.12, 0.18, 2.8, 5),
    new THREE.CylinderGeometry(0.18, 0.25, 2.0, 8),
    new THREE.CylinderGeometry(0.14, 0.2, 2.6, 7),
    new THREE.CylinderGeometry(0.1, 0.12, 2.4, 6) // ёлка
  ];

  const crownGeos = [
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.DodecahedronGeometry(0.45, 0),
    new THREE.SphereGeometry(0.48, 6, 5),
    new THREE.OctahedronGeometry(0.52, 1)
  ];

  const leafColors = [0xdd5500, 0xff9900, 0xcc4411];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x446622 });

  const group = new THREE.Group();

  if (type === 4) {
    const trunk = new THREE.Mesh(trunkGeos[4], trunkMat);
    trunk.position.y = 1.2;
    group.add(trunk);

    for (let i = 0; i < 5; i++) {
      const layer = new THREE.Mesh(
        new THREE.ConeGeometry(1.2 - i * 0.2, 0.8, 6),
        pineMat
      );
      layer.position.y = 1.2 + i * 0.6;
      group.add(layer);
    }
  } else {
    const trunk = new THREE.Mesh(trunkGeos[type % 4], trunkMat);
    trunk.position.y = trunk.geometry.parameters.height / 2;
    group.add(trunk);

    for (let j = 0; j < 10; j++) {
      const blob = new THREE.Mesh(
        crownGeos[type % 4].clone(),
        new THREE.MeshStandardMaterial({ color: leafColors[j % leafColors.length] })
      );
      blob.position.set(
        (j % 3 - 1) * 0.4,
        trunk.geometry.parameters.height + 0.5 + (j % 5) * 0.25,
        (Math.floor(j / 3) - 2) * 0.3
      );
      group.add(blob);
    }
  }

  group.scale.set(scale, scale, scale);
  group.rotation.y = rotation;

  return group;
}



function generateLevelFromObjects(objects, scene, physicsWorld) {
  for (const obj of objects) {
    let mesh = null;

    if (obj.type === 'road') {
      mesh = createRoadSegment({
        type: 'straight',
        position: obj.position,
        rotation: obj.rotation ?? 0,
        width: obj.width ?? 6,
        length: obj.length ?? 20,
        marking: obj.marking ?? 'none',
        withCurbs: obj.withCurbs ?? true,
        physicsWorld
      });
    }

    else if (obj.type === 'tree') {
      const tree = createTree(obj.treeType ?? 0, obj.scale ?? 4, obj.rotation ?? 0);
      tree.position.set(obj.position[0], 0, obj.position[1]);
      scene.add(tree);
    
      // (по желанию) коллайдер:
      if (physicsWorld) {
        const shape = new Ammo.btCylinderShape(new Ammo.btVector3(0.3, 2, 0.3));
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(obj.position[0], 1, obj.position[1]));
        const motion = new Ammo.btDefaultMotionState(transform);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
        const body = new Ammo.btRigidBody(rbInfo);
        physicsWorld.addRigidBody(body);
      }
    }

    else if (['house', 'classicHouse', 'highrise'].includes(obj.type)) {
      mesh = createBuilding({
        type: obj.type,
        position: obj.position,
        rotation: obj.rotation ?? 0,
        scale: obj.scale ?? 1,
        physicsWorld
      });
    }

    if (mesh) scene.add(mesh);
  }
}


function createBuilding(config) {
  const {
    type = 'house',
    position = [0, 0],
    rotation = 0,
    scale = 1,
    physicsWorld = null
  } = config;

  let building;

  switch (type) {
    case 'classicHouse':
      building = createClassicHouse(0, 0); break;
    case 'highrise':
      building = createModernHighrise(0, 0); break;
    case 'house':
    default:
      building = createHouse(0, 0); break;
  }

  // Сброс позиции, т.к. функции создают дом со смещением
  building.position.set(0, 0, 0);
  building.rotation.y = rotation;
  building.scale.set(scale, scale, scale);

  // Оборачиваем в контейнер с нужной позицией
  const container = new THREE.Group();
  container.add(building);
  container.position.set(position[0], 0, position[1]);

  return container;
}



const levelObjects = []



function createModernHighrise(x, z) {
  const building = new THREE.Group();

  const colorWall = new THREE.MeshStandardMaterial({ color: 0xffbb77 });
  const colorGlass = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x99ccff, emissiveIntensity: 1 });

  const width = 12;
  const height = 25;
  const depth = 12;
  const floorCount = 8;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    colorWall
  );
  body.position.y = height / 2;
  building.add(body);

  const windowGeoH = new THREE.PlaneGeometry(1.2, 1.2);
  windowGeoH.translate(0, 0, 0.06);

  for (let f = 0; f < floorCount; f++) {
    const y = 2 + f * 2.5;
    for (let i = -2; i <= 2; i++) {
      const offset = i * 2.5;

      // Front
      const winFront = new THREE.Mesh(windowGeoH, colorGlass);
      winFront.position.set(offset, y, -depth / 2 - 0.01);
      winFront.rotation.y = 0;
      building.add(winFront);

      // Back
      const winBack = new THREE.Mesh(windowGeoH, colorGlass);
      winBack.position.set(offset, y, depth / 2 + 0.01);
      winBack.rotation.y = Math.PI;
      building.add(winBack);

      // Left
      const winLeft = new THREE.Mesh(windowGeoH, colorGlass);
      winLeft.position.set(-width / 2 - 0.01, y, offset);
      winLeft.rotation.y = -Math.PI / 2;
      building.add(winLeft);

      // Right
      const winRight = new THREE.Mesh(windowGeoH, colorGlass);
      winRight.position.set(width / 2 + 0.01, y, offset);
      winRight.rotation.y = Math.PI / 2;
      building.add(winRight);
    }
  }

  building.position.set(x, 0, z);
  building.rotation.set(0, Math.PI/2, 0);
  return building;
}

function createClassicHouse(x, z) {
  const house = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xffeedd })
  );
  base.position.y = 2;
  house.add(base);

  const secondFloor = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 3, 5.5),
    new THREE.MeshStandardMaterial({ color: 0xffeedd })
  );
  secondFloor.position.y = 5.5;
  house.add(secondFloor);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(6, 2.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xaa3333 })
  );
  roof.position.y = 8;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  const roofOverhang = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 3),
    new THREE.MeshStandardMaterial({ color: 0xaa3333 })
  );
  roofOverhang.position.set(0, 4.5, 3);
  house.add(roofOverhang);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x663300 })
  );
  door.position.set(0, 1, 3.05);
  house.add(door);

  const windowMat = new THREE.MeshStandardMaterial({ color: 0x99ccff, emissive: 0xffffaa, emissiveIntensity: 1 });
  const windowGeo = new THREE.BoxGeometry(1, 1, 0.1);

  const windows = [
    { x: -2, y: 2, z: -3.05 }, { x: 2, y: 2, z: -3.05 },
    { x: -2, y: 6, z: -2.75 }, { x: 2, y: 6, z: -2.75 },
    { x: 0, y: 6, z: 2.75 },
  ];
  for (const pos of windows) {
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(pos.x, pos.y, pos.z);
    house.add(win);
  }

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  chimney.position.set(-2, 9, -2);
  house.add(chimney);

  house.position.set(x, 0, z);
  house.scale.set(2,2,2);
  return house;
}


function createHouse(x, z) {
  const house = new THREE.Group();

  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xdcc7a1 })
  );
  base.position.y = 2;
  house.add(base);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(6, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0x996633 })
  );
  roof.position.y = 5;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  // Windows
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x99ccff, emissive: 0xffffaa, emissiveIntensity: 1 });
  const windowGeo = new THREE.BoxGeometry(1, 1, 0.1);
  const windowOffsets = [
    { x: -2.5, y: 2, z: -3.05 },
    { x: 2.5, y: 2, z: -3.05 },
    { x: -2.5, y: 2, z: 3.05 },
    { x: 2.5, y: 2, z: 3.05 },
    { x: -4.05, y: 2, z: -1.5, rotY: Math.PI / 2 },
    { x: -4.05, y: 2, z: 1.5, rotY: Math.PI / 2 },
    { x: 4.05, y: 2, z: -1.5, rotY: -Math.PI / 2 },
    { x: 4.05, y: 2, z: 1.5, rotY: -Math.PI / 2 },
  ];
  for (const offset of windowOffsets) {
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(offset.x, offset.y, offset.z);
    if (offset.rotY) win.rotation.y = offset.rotY;
    house.add(win);
  }

  // Door (front side)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x663300 })
  );
  door.position.set(0, 1, 3.05);
  house.add(door);

  // Fence (simplified)
  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const fenceGeoH = new THREE.BoxGeometry(0.5, 1, 0.1); // Horizontal post
  const fenceGeoV = new THREE.BoxGeometry(0.1, 1, 0.5); // Vertical post
  const fenceGroup = new THREE.Group();

  for (let i = -6; i <= 6; i++) {
    const post1 = new THREE.Mesh(fenceGeoH, fenceMaterial);
    post1.position.set(i * 0.8, 0.5, -4);
    fenceGroup.add(post1);

    const post2 = new THREE.Mesh(fenceGeoH, fenceMaterial);
    post2.position.set(i * 0.8, 0.5, 4);
    fenceGroup.add(post2);
  }
  for (let i = -5; i <= 5; i++) {
    const post1 = new THREE.Mesh(fenceGeoV, fenceMaterial);
    post1.position.set(-5.5, 0.5, i * 0.8);
    fenceGroup.add(post1);

    const post2 = new THREE.Mesh(fenceGeoV, fenceMaterial);
    post2.position.set(5.5, 0.5, i * 0.8);
    fenceGroup.add(post2);
  }
  house.add(fenceGroup);

  house.position.set(x, 0, z);
  house.scale.set(2,2,2);
  
  return house;
}

function addMapBorders(scene, physicsWorld, size = 1400, height = 14) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcacaca, transparent: true, opacity: 0 });
  const wallGeo = new THREE.BoxGeometry(size, height, 1);

  const positions = [
    { x: 0, y: height / 2, z: -size / 2 },
    { x: 0, y: height / 2, z: size / 2 },
    { x: -size / 2, y: height / 2, z: 0, rotY: Math.PI / 2 },
    { x: size / 2, y: height / 2, z: 0, rotY: Math.PI / 2 },
  ];

  for (const pos of positions) {
    const mesh = new THREE.Mesh(wallGeo, wallMat);
    mesh.position.set(pos.x, pos.y, pos.z);
    if (pos.rotY) mesh.rotation.y = pos.rotY;
    scene.add(mesh);

    const shape = new Ammo.btBoxShape(new Ammo.btVector3(size / 2, height / 2, 0.5));
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    if (pos.rotY) {
      const quat = new Ammo.btQuaternion();
      const halfAngle = pos.rotY / 2;
      quat.setValue(0, Math.sin(halfAngle), 0, Math.cos(halfAngle));
      transform.setRotation(quat);
    }
    const motion = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0, 0, 0));
    const body = new Ammo.btRigidBody(rbInfo);
    physicsWorld.addRigidBody(body);
  }
}


function createDefCar(carColor, taillights) {
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



function createTestCar(carColor, taillights) {
  const car = new THREE.Group();

  const mainColor = carColor;
  const glassColor = 0x22ccff;
  const baseColor = 0xcccccc;
  const wheelColor = 0x222222;
  const rimColor = 0xffffff;
  const headlightColor = 0xffdd88;

  // База
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

  // Кабина (трапец)
  const cabin = createTrapezoidCabin(0x66ccff);
  car.add(cabin);

  // Крыша
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 0.1, 1.89),
    new THREE.MeshStandardMaterial({ color: mainColor })
  );
  roof.position.set(0, 0.76, 0);
  cabin.add(roof);

  // Полоски на капоте
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

  // Задние фары
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000 });
  for (let x of [-0.6, 0.6]) {
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), brakeMat.clone());
    brake.position.set(x, 0.45, 2.15);
    car.add(brake);
    taillights.push(brake);
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

  group.position.y = 0.95;

  return group;
}

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

function spawnPoliceCar(scene, physicsWorld, playerMesh, roadMeshes = []) {
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
    //road.getWorldPosition(roadPos);
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
  for (const tile of roadMeshes ??[]) {
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
  for (const mesh of roadMeshes ?? []) {
    const box = new THREE.Box3().setFromObject(mesh);
    const flatCarPos = carPos.clone();
    flatCarPos.y = (box.min.y + box.max.y) / 2; // flatten to match road height
    if (box.containsPoint(flatCarPos)) {
      isOnRoad = true;
      break;
    }
  }

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





function generateBuildingsFromMap(map, scene) {
  if (!scene) return;
  const tileSize = 20;

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
      }
    }
  }
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
  generateLevelFromObjects(levelObjects, scene, physicsWorld);


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
      //spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    }
  }, 10 * 1000);

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

  const ground = new THREE.Mesh(new THREE.BoxGeometry(650, 1, 650), groundMat);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(650, 1, 655));
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

    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);

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
  initLevelEditor({
    scene,
    camera,
    ground,
    physicsWorld,
    createRoadSegment,
    createTree,
    createHouse,
    createClassicHouse,
    createModernHighrise,
    generateLevelFromObjects,
  });

  // roadMeshes = generateRoadFromMap(roadMap, scene);
  // generateBuildingsFromMap(buildingsMap, scene);
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

  window.updateEditorCamera()
  const delta = clock.getDelta();
  physicsWorld.stepSimulation(delta, 10);
  //applyOffroadPenaltyByTiles(carBody, roadMeshes);

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
      engineForce = 5800;
      brakingForce = 0;
    }
    if (keysPressed.backward) {
      engineForce = 0;
      brakingForce = 700;
    }
    if (keysPressed.left) steering = 0.5;
    if (keysPressed.right) steering = -0.5;
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
    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
    // spawnPoliceCar(scene, physicsWorld, carMesh, roadMeshes);
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


