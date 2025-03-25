import * as THREE from 'three';

function createTrees(scene, roadMap) {
    const tileSize = 10;
    const roadPositions = new Set();
  
    for (let z = 0; z < roadMap.length; z++) {
      const row = roadMap[z];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char !== ' ') {
          const posX = (x - row.length / 2) * tileSize;
          const posZ = (z - roadMap.length / 2) * tileSize;
          roadPositions.add(`${Math.round(posX)}_${Math.round(posZ)}`);
        }
      }
    }
  
    const leafColors = [0xdd5500, 0xff9900, 0xcc4411];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x446622 });
  
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
  
    const treeGroup = new THREE.Group();
    let treeTypeIndex = 0;
  
    for (let z = 0; z < roadMap.length; z++) {
      for (let x = 0; x < roadMap[0].length; x++) {
        const char = roadMap[z][x];
        if (char === ' ') {
          const worldX = (x - roadMap[0].length / 2) * tileSize;
          const worldZ = (z - roadMap.length / 2) * tileSize;
          const offsetX = ((x * 13 + z * 31) % 100) / 100 - 0.5; // детерминированный сдвиг [-0.5, 0.5]
          const offsetZ = ((z * 17 + x * 29) % 100) / 100 - 0.5;
          const tx = worldX + offsetX * 4;
          const tz = worldZ + offsetZ * 4;
  
          const key = `${Math.round(worldX)}_${Math.round(worldZ)}`;
          if (roadPositions.has(key)) continue;
  
          let tree;
          if (x % 3 === 0) {
            tree = new THREE.Group();
            const pineTrunk = new THREE.Mesh(trunkGeos[4], trunkMat);
            pineTrunk.position.y = 1.2;
            tree.add(pineTrunk);
  
            for (let i = 0; i < 5; i++) {
              const layer = new THREE.Mesh(
                new THREE.ConeGeometry(1.2 - i * 0.2, 0.8, 6),
                pineMat
              );
              layer.position.y = 1.2 + i * 0.6;
              tree.add(layer);
            }
          } else {
            tree = new THREE.Group();
            const type = treeTypeIndex % 4;
            treeTypeIndex++;
  
            const trunk = new THREE.Mesh(trunkGeos[type], trunkMat);
            trunk.position.y = trunk.geometry.parameters.height / 2;
            tree.add(trunk);
  
            for (let j = 0; j < 15; j++) {
              const blob = new THREE.Mesh(
                crownGeos[type].clone(),
                new THREE.MeshStandardMaterial({ color: leafColors[j % leafColors.length] })
              );
              blob.position.set(
                (j % 3 - 1) * 0.4,
                trunk.geometry.parameters.height + 0.5 + (j % 5) * 0.25,
                (Math.floor(j / 3) - 2) * 0.3
              );
              tree.add(blob);
            }
          }
  
          tree.position.set(tx, 0, tz);
          tree.scale.set(2, 2, 2);
          treeGroup.add(tree);
        }
      }
    }
  
    scene.add(treeGroup);
  }


  export { createTrees };