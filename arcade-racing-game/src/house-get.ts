import * as THREE from 'three';

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

  function createVillage(scene) {
    const house1 = createHouse(20, 20);
    const house2 = createHouse(-20, 30);
    const house3 = createClassicHouse(-30, -25);
    const house4 = createClassicHouse(0, -20);

  const apt1 = createUrbanApartment(0, 50);
  scene.add(apt1);
  
    scene.add(house1);
    scene.add(house2);
    scene.add(house3);
    scene.add(house4);
  }

  function createUrbanApartment(x, z) {
    const building = new THREE.Group();
  
    const colorBase = new THREE.MeshStandardMaterial({ color: 0xf2efe5 });
    const colorAccent = new THREE.MeshStandardMaterial({ color: 0xff9999 });
    const colorGlass = new THREE.MeshStandardMaterial({ color: 0x336699, emissive: 0x99ccff, emissiveIntensity: 1 });
  
    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 14), colorBase);
    body.position.y = 10;
    building.add(body);
  
    // Accent stripes (vertical)
    const stripeGeo = new THREE.BoxGeometry(1, 20, 0.4);
    for (let i = -1; i <= 1; i += 2) {
      const stripe = new THREE.Mesh(stripeGeo, colorAccent);
      stripe.position.set(i * 6, 10, -7.2);
      building.add(stripe);
    }
  
    // Windows (rows)
    const windowGeo = new THREE.BoxGeometry(1.2, 1.2, 0.1);
    for (let row = 0; row < 7; row++) {
      for (let col = -2; col <= 2; col++) {
        const win = new THREE.Mesh(windowGeo, colorGlass);
        win.position.set(col * 2, 4 + row * 2, -7.1);
        building.add(win);
      }
    }
  
    // Roof detail (helipad)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 32), colorGlass);
    pad.position.y = 20.2;
    building.add(pad);
  
    building.position.set(x, 0, z);
    return building;
  }
  
export { createHouse, createVillage };