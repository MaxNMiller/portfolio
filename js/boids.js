class Boid {
    constructor(x, y, z) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize().multiplyScalar(0.5 + Math.random() * 0.5);
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 1.5 + Math.random() * 0.5;
        this.maxForce = 0.05;
        this.neighborDistance = 15;
        this.separationDistance = 10;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderRadius = 1;
        this.wanderDistance = 5;
        this.wanderForce = 0.05;
        this.avoidWallsForce = 0.5;
        this.boundaryRadius = 50;
        this.avoidDistance = 20;
    }

    update(boids) {
        // Apply all forces
        let separation = this.separate(boids);
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        
        // Weight forces
        separation.multiplyScalar(1.5);
        alignment.multiplyScalar(1.0);
        cohesion.multiplyScalar(1.0);
        
        // Apply forces
        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        
        // Add some random movement
        let wander = this.wander();
        wander.multiplyScalar(0.3);
        this.acceleration.add(wander);
        
        // Avoid walls
        let avoidWalls = this.avoidWalls();
        avoidWalls.multiplyScalar(this.avoidWallsForce);
        this.acceleration.add(avoidWalls);
        
        // Update velocity and position
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
    }

    attract(attractors) {
        let steer = new THREE.Vector3();
        
        attractors.forEach(attractor => {
            if (!attractor.isExpired()) {
                let force = new THREE.Vector3().subVectors(attractor.position, this.position);
                let distance = force.length();
                
                if (distance > 0 && distance < attractor.radius * 2) {
                    force.normalize();
                    // Stronger attraction the closer we are
                    let strength = THREE.MathUtils.mapLinear(distance, 0, attractor.radius * 2, attractor.strength, 0);
                    force.multiplyScalar(strength);
                    steer.add(force);
                }
            }
        });
        
        return steer;
    }

    separate(boids) {
        let steer = new THREE.Vector3();
        let count = 0;
        
        for (let other of boids) {
            if (other !== this) {
                let distance = this.position.distanceTo(other.position);
                
                if (distance > 0 && distance < this.separationDistance) {
                    let diff = new THREE.Vector3().subVectors(this.position, other.position);
                    diff.normalize();
                    diff.divideScalar(distance); // Weight by distance
                    steer.add(diff);
                    count++;
                }
            }
        }
        
        if (count > 0) {
            steer.divideScalar(count);
        }
        
        if (steer.length() > 0) {
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        
        return steer;
    }

    align(boids) {
        let sum = new THREE.Vector3();
        let count = 0;
        
        for (let other of boids) {
            if (other !== this) {
                let distance = this.position.distanceTo(other.position);
                
                if (distance > 0 && distance < this.neighborDistance) {
                    sum.add(other.velocity);
                    count++;
                }
            }
        }
        
        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(this.maxSpeed);
            
            let steer = new THREE.Vector3().subVectors(sum, this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer;
        }
        
        return new THREE.Vector3();
    }

    cohesion(boids) {
        let sum = new THREE.Vector3();
        let count = 0;
        
        for (let other of boids) {
            if (other !== this) {
                let distance = this.position.distanceTo(other.position);
                
                if (distance > 0 && distance < this.neighborDistance) {
                    sum.add(other.position);
                    count++;
                }
            }
        }
        
        if (count > 0) {
            sum.divideScalar(count);
            return this.seek(sum);
        }
        
        return new THREE.Vector3();
    }

    seek(target) {
        let desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        
        let steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        
        return steer;
    }

    wander() {
        // Calculate the circle position in front of the boid
        let circleCenter = this.velocity.clone().normalize().multiplyScalar(this.wanderDistance);
        
        // Calculate the displacement force
        let displacement = new THREE.Vector3(0, -1, 0);
        
        // Randomly change the angle
        this.wanderAngle += (Math.random() * 0.5 - 0.25);
        
        // Calculate the new position on the circle
        displacement.x = Math.cos(this.wanderAngle);
        displacement.z = Math.sin(this.wanderAngle);
        displacement.multiplyScalar(this.wanderRadius);
        
        // Calculate the wander force
        let wanderForce = new THREE.Vector3().addVectors(circleCenter, displacement);
        wanderForce.clampLength(0, this.wanderForce);
        
        return wanderForce;
    }

    avoidWalls() {
        let steer = new THREE.Vector3();
        let distance;
        
        // Check distance to boundaries
        if (this.position.x < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.x + this.boundaryRadius;
            steer.x = this.map(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.x > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.x;
            steer.x = this.map(distance, 0, this.avoidDistance, -1, 0);
        }
        
        if (this.position.y < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.y + this.boundaryRadius;
            steer.y = this.map(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.y > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.y;
            steer.y = this.map(distance, 0, this.avoidDistance, -1, 0);
        }
        
        if (this.position.z < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.z + this.boundaryRadius;
            steer.z = this.map(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.z > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.z;
            steer.z = this.map(distance, 0, this.avoidDistance, -1, 0);
        }
        
        return steer;
    }

    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }
}

class Attractor {
    constructor(x, y, z, strength = 1, radius = 20, duration = 3000) {
        this.position = new THREE.Vector3(x, y, z);
        this.strength = strength;
        this.radius = radius;
        this.createdAt = Date.now();
        this.duration = duration;
    }
    
    isExpired() {
        return Date.now() - this.createdAt > this.duration;
    }
}

function createFishGeometry() {
    const bodyLength = 1;
    const bodyWidth = 0.2;
    const bodyHeight = 0.4;
    const tailLength = 0.6;
    const tailWidth = 0.1;
    const finSize = 0.3;
    
    // Create a geometry group
    const geometry = new THREE.BufferGeometry();
    
    // Body vertices (elongated ellipsoid)
    const bodyVertices = [];
    const bodySegments = 8;
    const bodyRadialSegments = 8;
    
    for (let i = 0; i <= bodySegments; i++) {
        const u = i / bodySegments;
        const bodyX = u * bodyLength - bodyLength / 2;
        const bodyRadius = bodyWidth * Math.sin(Math.PI * u);
        
        for (let j = 0; j <= bodyRadialSegments; j++) {
            const v = j / bodyRadialSegments * Math.PI * 2;
            const bodyY = Math.cos(v) * bodyRadius * bodyHeight / bodyWidth;
            const bodyZ = Math.sin(v) * bodyRadius;
            
            bodyVertices.push(bodyX, bodyY, bodyZ);
        }
    }
    
    // Tail vertices (triangular fin)
    const tailVertices = [
        -bodyLength/2, 0, 0,  // Tail connection point
        -bodyLength/2 - tailLength, bodyHeight/2, 0,  // Top of tail
        -bodyLength/2 - tailLength, -bodyHeight/2, 0,  // Bottom of tail
    ];
    
    // Dorsal fin vertices
    const dorsalFinVertices = [
        0, bodyHeight/2, 0,  // Base front
        -bodyLength/4, bodyHeight/2, 0,  // Base back
        -bodyLength/8, bodyHeight/2 + finSize, 0,  // Tip
    ];
    
    // Combine all vertices
    const vertices = [...bodyVertices, ...tailVertices, ...dorsalFinVertices];
    
    // Create the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Calculate normals
    geometry.computeVertexNormals();
    
    return geometry;
}
