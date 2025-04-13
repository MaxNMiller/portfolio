document.addEventListener('DOMContentLoaded', () => {
    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('fishCanvas'), 
        alpha: true,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    camera.position.z = 30;
    
    // Create fish geometry
    const fishGeometry = createFishGeometry();
    
    // Create materials with different colors
    const fishMaterials = [
        new THREE.MeshBasicMaterial({ color: 0x3498db, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0xe74c3c, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0xf1c40f, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0x9b59b6, wireframe: true }),
    ];
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Track mouse position for attraction
    const mouse = new THREE.Vector3();
    const mouseAttractors = [];
    
    window.addEventListener('mousemove', (event) => {
        // Convert mouse position to normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Project mouse position to 3D space
        mouse.unproject(camera);
        const dir = mouse.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        
        // Create a new attractor at the mouse position
        if (Math.random() < 0.05) { // Only create an attractor occasionally
            mouseAttractors.push(new Attractor(pos.x, pos.y, pos.z, 0.8, 15, 2000));
        }
    });
    
    // Update function for boids
    function update() {
        // Update boids
        for (let i = 0; i < boids.length; i++) {
            boids[i].update(boids);
            
            // Apply attraction to mouse
            if (mouseAttractors.length > 0) {
                const attraction = boids[i].attract(mouseAttractors);
                attraction.multiplyScalar(0.5);
                boids[i].acceleration.add(attraction);
            }
            
            // Update mesh position and rotation
            meshes[i].position.copy(boids[i].position);
            
            // Calculate rotation based on velocity
            if (boids[i].velocity.length() > 0) {
                meshes[i].lookAt(meshes[i].position.clone().add(boids[i].velocity));
            }
        }
        
        // Remove expired attractors
        for (let i = mouseAttractors.length - 1; i >= 0; i--) {
            if (mouseAttractors[i].isExpired()) {
                mouseAttractors.splice(i, 1);
            }
        }
    }
    
    // Create boids
    const numBoids = 200;
    const boids = [];
    const meshes = [];
    
    for (let i = 0; i < numBoids; i++) {
        // Random position within a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 40 * Math.cbrt(Math.random());
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        // Create boid
        const boid = new Boid(x, y, z);
        boids.push(boid);
        
        // Create mesh
        const material = fishMaterials[Math.floor(Math.random() * fishMaterials.length)];
        const mesh = new THREE.Mesh(fishGeometry, material);
        mesh.scale.set(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5);
        scene.add(mesh);
        meshes.push(mesh);
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        update();
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Panel functionality
    const projectsPanel = document.getElementById('projectsPanel');
    const aboutPanel = document.getElementById('aboutPanel');
    const contactPanel = document.getElementById('contactPanel');
    const navButtons = document.querySelectorAll('.nav-button');
    const closePanelButtons = document.querySelectorAll('.close-panel');
    
    function showPanel(panel) {
        // Fade out the fish animation
        document.getElementById('fishCanvas').classList.add('fadeout');
        
        // Hide any open panels first
        hideAllPanels();
        
        // Show the requested panel
        setTimeout(() => {
            panel.classList.add('active');
        }, 300);
    }
    
    function hideAllPanels() {
        projectsPanel.classList.remove('active');
        aboutPanel.classList.remove('active');
        contactPanel.classList.remove('active');
        
        // Fade the fish animation back in
        document.getElementById('fishCanvas').classList.remove('fadeout');
    }
    
    // Add event listeners to navigation buttons
    navButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            if (index === 0) showPanel(projectsPanel);
            else if (index === 1) showPanel(aboutPanel);
            else if (index === 2) showPanel(contactPanel);
        });
    });
    
    // Add event listeners to close buttons
    closePanelButtons.forEach(button => {
        button.addEventListener('click', hideAllPanels);
    });
    
    // Handle form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            // Here you would normally send the data to a server
            console.log('Form submitted:', { name, email, message });
            
            // Show success message
            alert('Thank you for your message! I will get back to you soon.');
            
            // Reset form
            contactForm.reset();
            
            // Close the panel
            hideAllPanels();
        });
    }
});
