class Boid {
    constructor(x, y, z) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize().multiplyScalar(0.5 + Math.random() * 0.5);
        this.acceleration = new THREE.Vector3();
        this.prevAcceleration = new THREE.Vector3();
        
        // Enhanced parameters for better movement
        this.maxSpeed = 1.2 + Math.random() * 0.8;
        this.minSpeed = 0.6;
        this.maxForce = 0.08;
        this.neighborDistance = 20;
        this.separationDistance = 12;
        
        // Improved wandering behavior
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderRadius = 2;
        this.wanderDistance = 6;
        this.wanderForce = 0.04;
        this.wanderChangeRate = 0.3;
        
        // Enhanced boundary avoidance
        this.avoidWallsForce = 1.2;
        this.boundaryRadius = 50;
        this.avoidDistance = 25;
        
        // Prevent getting stuck
        this.stuckDetectionTime = 0;
        this.stuckThreshold = 0.1;
        this.stuckTime = 0;
        this.lastPosition = this.position.clone();
        this.unstuckForce = 0.2;
        
        // Visual properties
        this.size = 0.5 + Math.random() * 0.5;
        this.colorVariation = Math.random() * 0.2;
        this.uniqueId = Math.random();
        
        // Behavior weights (randomized slightly for variety)
        this.separationWeight = 1.5 + Math.random() * 0.3;
        this.alignmentWeight = 1.0 + Math.random() * 0.2;
        this.cohesionWeight = 1.0 + Math.random() * 0.2;
        this.wanderWeight = 0.3 + Math.random() * 0.1;
    }

    update(boids, deltaTime = 1/60) {
        // Store previous position for stuck detection
        this.lastPosition.copy(this.position);
        
        // Apply all forces with improved weights
        let separation = this.separate(boids);
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        let wander = this.wander();
        let avoidWalls = this.avoidWalls();
        
        // Weight forces (with slight randomization for more natural movement)
        separation.multiplyScalar(this.separationWeight);
        alignment.multiplyScalar(this.alignmentWeight);
        cohesion.multiplyScalar(this.cohesionWeight);
        wander.multiplyScalar(this.wanderWeight * (1 + Math.sin(Date.now() * 0.001 + this.uniqueId) * 0.2));
        avoidWalls.multiplyScalar(this.avoidWallsForce);
        
        // Store previous acceleration for momentum
        this.prevAcceleration.copy(this.acceleration);
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Apply forces
        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(wander);
        this.acceleration.add(avoidWalls);
        
        // Add some momentum from previous acceleration (smoother movement)
        this.acceleration.add(this.prevAcceleration.multiplyScalar(0.3));
        
        // Check if stuck and apply unstuck force if needed
        this.detectAndFixStuck(deltaTime);
        
        // Update velocity with improved physics
        this.velocity.add(this.acceleration.multiplyScalar(deltaTime));
        
        // Ensure minimum speed to prevent getting stuck
        const speed = this.velocity.length();
        if (speed < this.minSpeed) {
            this.velocity.normalize().multiplyScalar(this.minSpeed);
        } else {
            this.velocity.clampLength(0, this.maxSpeed);
        }
        
        // Update position with time-based movement
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime * 60));
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
    }

    detectAndFixStuck(deltaTime) {
        // Calculate movement since last frame
        const movement = this.position.distanceTo(this.lastPosition);
        
        // If barely moving, increment stuck timer
        if (movement < this.stuckThreshold) {
            this.stuckTime += deltaTime;
            
            // If stuck for too long, apply random force to unstick
            if (this.stuckTime > 1.0) {
                const unstuckForce = new THREE.Vector3(
                    (Math.random() * 2 - 1) * this.unstuckForce,
                    (Math.random() * 2 - 1) * this.unstuckForce,
                    (Math.random() * 2 - 1) * this.unstuckForce
                );
                this.acceleration.add(unstuckForce);
                
                // Increase speed temporarily to escape stuck state
                this.velocity.multiplyScalar(1.5);
                
                // Reset stuck timer
                this.stuckTime = 0;
            }
        } else {
            // Reset stuck timer if moving properly
            this.stuckTime = Math.max(0, this.stuckTime - deltaTime * 2);
        }
    }

    attract(attractors) {
        let steer = new THREE.Vector3();
        
        attractors.forEach(attractor => {
            if (!attractor.isExpired()) {
                let force = new THREE.Vector3().subVectors(attractor.position, this.position);
                let distance = force.length();
                
                if (distance > 0 && distance < attractor.radius * 2.5) {
                    force.normalize();
                    
                    // Enhanced attraction with distance falloff
                    let strength = this.smoothStep(distance, attractor.radius * 2.5, 0, 0, attractor.strength);
                    force.multiplyScalar(strength);
                    
                    // Add slight randomization for more natural movement
                    force.x += (Math.random() * 0.1 - 0.05) * strength;
                    force.y += (Math.random() * 0.1 - 0.05) * strength;
                    force.z += (Math.random() * 0.1 - 0.05) * strength;
                    
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
                    
                    // Enhanced inverse square falloff for more natural separation
                    diff.divideScalar(Math.max(0.1, distance * distance * 0.01));
                    
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
                    // Weight by distance - closer boids have more influence
                    let weight = 1 - (distance / this.neighborDistance);
                    let weightedVelocity = other.velocity.clone().multiplyScalar(weight);
                    sum.add(weightedVelocity);
                    count += weight;
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
                    // Weight by distance - closer boids have more influence
                    let weight = 1 - (distance / this.neighborDistance);
                    let weightedPosition = other.position.clone().multiplyScalar(weight);
                    sum.add(weightedPosition);
                    count += weight;
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
        let distance = desired.length();
        
        // Variable speed based on distance
        let speed = this.maxSpeed;
        if (distance < 10) {
            speed = THREE.MathUtils.mapLinear(distance, 0, 10, this.minSpeed, this.maxSpeed);
        }
        
        desired.normalize();
        desired.multiplyScalar(speed);
        
        let steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        
        return steer;
    }

    wander() {
        // Calculate the circle position in front of the boid
        let circleCenter = this.velocity.clone().normalize().multiplyScalar(this.wanderDistance);
        
        // Calculate the displacement force
        let displacement = new THREE.Vector3(0, -1, 0);
        
        // Smoothly change the angle for more natural movement
        this.wanderAngle += (Math.random() * 2 - 1) * this.wanderChangeRate;
        
        // Calculate the new position on the circle
        displacement.x = Math.cos(this.wanderAngle);
        displacement.z = Math.sin(this.wanderAngle);
        displacement.multiplyScalar(this.wanderRadius);
        
        // Add time-based variation for more natural movement
        const timeVariation = Math.sin(Date.now() * 0.001 + this.uniqueId * 10) * 0.5;
        displacement.y += timeVariation;
        
        // Calculate the wander force
        let wanderForce = new THREE.Vector3().addVectors(circleCenter, displacement);
        wanderForce.clampLength(0, this.wanderForce);
        
        return wanderForce;
    }

    avoidWalls() {
        let steer = new THREE.Vector3();
        let distance;
        
        // Enhanced boundary avoidance with smoother transitions
        // X-axis boundaries
        if (this.position.x < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.x + this.boundaryRadius;
            steer.x = this.smoothStep(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.x > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.x;
            steer.x = this.smoothStep(distance, 0, this.avoidDistance, -1, 0);
        }
        
        // Y-axis boundaries
        if (this.position.y < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.y + this.boundaryRadius;
            steer.y = this.smoothStep(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.y > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.y;
            steer.y = this.smoothStep(distance, 0, this.avoidDistance, -1, 0);
        }
        
        // Z-axis boundaries
        if (this.position.z < -this.boundaryRadius + this.avoidDistance) {
            distance = this.position.z + this.boundaryRadius;
            steer.z = this.smoothStep(distance, -this.boundaryRadius, -this.boundaryRadius + this.avoidDistance, 1, 0);
        } else if (this.position.z > this.boundaryRadius - this.avoidDistance) {
            distance = this.boundaryRadius - this.position.z;
            steer.z = this.smoothStep(distance, 0, this.avoidDistance, -1, 0);
        }
        
        return steer;
    }

    // Improved smooth interpolation function
    smoothStep(value, min, max, outMin, outMax) {
        // Clamp value between min and max
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        
        // Smooth step function: 3x^2 - 2x^3
        const t = x * x * (3 - 2 * x);
        
        // Map to output range
        return outMin + t * (outMax - outMin);
    }
}

class Attractor {
    constructor(x, y, z, strength = 1, radius = 20, duration = 3000) {
        this.position = new THREE.Vector3(x, y, z);
        this.strength = strength;
        this.radius = radius;
        this.createdAt = Date.now();
        this.duration = duration;
        
        // Enhanced attractor properties
        this.pulseRate = 0.5 + Math.random() * 0.5;
        this.initialStrength = strength;
    }
    
    isExpired() {
        return Date.now() - this.createdAt > this.duration;
    }
    
    // Pulsating strength for more dynamic attraction
    getCurrentStrength() {
        if (this.isExpired()) return 0;
        
        // Calculate remaining lifetime percentage
        const age = Date.now() - this.createdAt;
        const lifePercent = 1 - (age / this.duration);
        
        // Add pulsating effect
        const pulse = Math.sin(age * 0.002 * this.pulseRate) * 0.3 + 0.7;
        
        // Combine lifetime fade with pulse
        return this.initialStrength * lifePercent * pulse;
    }
}

function createFishGeometry() {
    // Create a more detailed and natural-looking fish geometry
    const bodyLength = 1;
    const bodyWidth = 0.2;
    const bodyHeight = 0.4;
    const tailLength = 0.6;
    const tailWidth = 0.1;
    const finSize = 0.3;
    
    // Create a geometry group
    const geometry = new THREE.BufferGeometry();
    
    // Body vertices (elongated ellipsoid with more detail)
    const bodyVertices = [];
    const bodySegments = 12;
    const bodyRadialSegments = 12;
    
    for (let i = 0; i <= bodySegments; i++) {
        const u = i / bodySegments;
        // Enhanced body shape with tapered ends
        const bodyX = u * bodyLength - bodyLength / 2;
        const bodyRadius = bodyWidth * Math.sin(Math.PI * u) * (1 - Math.pow(Math.abs(u - 0.5) * 1.5, 2));
        
        for (let j = 0; j <= bodyRadialSegments; j++) {
            const v = j / bodyRadialSegments * Math.PI * 2;
            const bodyY = Math.cos(v) * bodyRadius * bodyHeight / bodyWidth;
            const bodyZ = Math.sin(v) * bodyRadius;
            
            bodyVertices.push(bodyX, bodyY, bodyZ);
        }
    }
    
    // Tail vertices (more detailed fin shape)
    const tailVertices = [
        -bodyLength/2, 0, 0,  // Tail connection point
        -bodyLength/2 - tailLength * 0.5, bodyHeight/3, 0,  // Top middle of tail
        -bodyLength/2 - tailLength, bodyHeight/2, 0,  // Top of tail
        -bodyLength/2 - tailLength, 0, 0,  // Middle of tail
        -bodyLength/2 - tailLength, -bodyHeight/2, 0,  // Bottom of tail
        -bodyLength/2 - tailLength * 0.5, -bodyHeight/3, 0,  // Bottom middle of tail
    ];
    
    // Dorsal fin vertices (more detailed)
    const dorsalFinVertices = [
        0, bodyHeight/2, 0,  // Base front
        -bodyLength/6, bodyHeight/2, 0,  // Base middle
        -bodyLength/3, bodyHeight/2, 0,  // Base back
        -bodyLength/6, bodyHeight/2 + finSize * 0.7, 0,  // Middle peak
        -bodyLength/4, bodyHeight/2 + finSize, 0,  // Highest peak
    ];
    
    // Pectoral fins (side fins)
    const leftFinVertices = [
        -bodyLength/4, 0, bodyWidth/2,  // Base connection
        -bodyLength/3, -bodyHeight/4, bodyWidth/2 + finSize/2,  // Outer point
        -bodyLength/2, -bodyHeight/6, bodyWidth/3,  // Back point
    ];
    
    const rightFinVertices = [
        -bodyLength/4, 0, -bodyWidth/2,  // Base connection
        -bodyLength/3, -bodyHeight/4, -bodyWidth/2 - finSize/2,  // Outer point
        -bodyLength/2, -bodyHeight/6, -bodyWidth/3,  // Back point
    ];
    
    // Combine all vertices
    const vertices = [
        ...bodyVertices, 
        ...tailVertices, 
        ...dorsalFinVertices,
        ...leftFinVertices,
        ...rightFinVertices
    ];
    
    // Create the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Calculate normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
}

// Create a more detailed fish geometry with animation capabilities
function createAnimatedFishGeometry() {
    const geometry = createFishGeometry();
    
    // Add UV coordinates for texturing
    const positions = geometry.attributes.position.array;
    const uvs = [];
    
    for (let i = 0; i < positions.length; i += 3) {
        // Simple UV mapping based on position
        const x = positions[i];
        const y = positions[i + 1];
        
        // Map x position to U coordinate (0 to 1)
        const u = (x + 1.5) / 3;
        
        // Map y position to V coordinate (0 to 1)
        const v = (y + 0.5) / 1;
        
        uvs.push(u, v);
    }
    
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    return geometry;
}

// Create fish material with enhanced visual effects
function createFishMaterial(color, wireframe = true) {
    if (wireframe) {
        return new THREE.MeshBasicMaterial({ 
            color: color, 
            wireframe: true,
            transparent: true,
            opacity: 0.8 + Math.random() * 0.2
        });
    } else {
        return new THREE.MeshPhongMaterial({
            color: color,
            specular: 0xffffff,
            shininess: 100,
            transparent: true,
            opacity: 0.8 + Math.random() * 0.2,
            side: THREE.DoubleSide
        });
    }
}
