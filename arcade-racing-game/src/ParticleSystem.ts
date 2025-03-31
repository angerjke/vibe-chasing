import * as THREE from 'three';

export class ParticleEmitter {
  geometry = new THREE.BufferGeometry();
  material: THREE.PointsMaterial;
  points: THREE.Points;
  maxParticles = 200;
  active = true;
  aliveCount = 0;
  inactiveTime=0

  positions = new Float32Array(this.maxParticles * 3);
  velocities: THREE.Vector3[] = [];
  ages: number[] = [];
  lifetimes: number[] = [];

  constructor(public origin: THREE.Vector3, public color = 0x333333) {
    this.material = new THREE.PointsMaterial({
      color,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(this.geometry, this.material);

    for (let i = 0; i < this.maxParticles; i++) {
      this.velocities.push(new THREE.Vector3());
      this.ages.push(Infinity); // неактивный
      this.lifetimes.push(0);
    }
  }

  spawnParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.ages[i] >= this.lifetimes[i]) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          0,
          (Math.random() - 0.5) * 1.5
        );
        const pos = this.origin.clone().add(offset);

        this.positions[i * 3 + 0] = pos.x;
        this.positions[i * 3 + 1] = pos.y;
        this.positions[i * 3 + 2] = pos.z;

        this.velocities[i].set(
          (Math.random() - 0.5) * 0.5,
          1 + Math.random(),
          (Math.random() - 0.5) * 0.5
        );

        this.ages[i] = 0;
        this.lifetimes[i] = 1.5 + Math.random() * 1;
        break;
      }
    }
  }

  update(delta: number) {
    
    if (!this.active) {
        this.inactiveTime += delta;
      }
    for (let i = 0; i < this.maxParticles; i++) {
        this.velocities[i].y -= 0.1 * delta; 
      if (this.ages[i] < this.lifetimes[i]) {
        this.ages[i] += delta;
        const t = this.ages[i] / this.lifetimes[i];

        // Обновляем позицию
        const vx = this.velocities[i].x * delta;
        const vy = this.velocities[i].y * delta;
        const vz = this.velocities[i].z * delta;

        this.positions[i * 3 + 0] += vx;
        this.positions[i * 3 + 1] += vy;
        this.positions[i * 3 + 2] += vz;

        // Затухание
        const baseOpacity = 0.6;
        this.material.opacity = baseOpacity * (1 - t);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  isDead() {
    return (!this.active && this.ages.every((age, i) => age >= this.lifetimes[i])) || 
           this.inactiveTime > 2; // Force cleanup after 5 seconds of inactivity
  }

  stop() {
    this.active = false;
  }
}

export class ParticleSystem {
  emitters: ParticleEmitter[] = [];

  addEmitter(e: ParticleEmitter, scene: THREE.Scene) {
    this.emitters.push(e);
    scene.add(e.points);
  }

  update(delta: number, scene: THREE.Scene) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (e.active) {
        for (let j = 0; j < 5; j++) e.spawnParticle(); // спавним пачку
      }

      e.update(delta);

      if (e.isDead()) {
        e.geometry.dispose();
        e.material.dispose();
        
        // Remove from parent before removing from scene
        if (e.points.parent) {
          e.points.parent.remove(e.points);
        }
        
        // Explicitly remove from scene
        scene.remove(e.points);
        
        // Null out references
        e.points = null;
        
        // Remove from emitters array
        this.emitters.splice(i, 1);
        
        console.log('Emitter removed, count:', this.emitters.length);
      }
    }
  }
}
