import * as THREE from 'three';

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
  
  
  

  export  {createDefCar, createTestCar};