import * as THREE from 'three';
import * as Ammo from 'ammo.js';

function addMapBorders(scene, physicsWorld, size = 400, height = 10) {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0 });
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


export default addMapBorders;