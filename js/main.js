document.addEventListener('DOMContentLoaded', () => {
    // Setup Three.js scene with improved rendering
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.008); // Add fog for depth
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('fishCanvas'), 
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    
    // Position camera for better view
    camera.position.z = 30;
    
    // Create enhanced fish geometry
    const fishGeometry = createAnimatedFishGeometry();
    
    // Create materials with improved colors and effects
    const fishMaterials = [
        createFishMaterial(0x3498db),
        createFishMaterial(0x2ecc71),
        createFishMaterial(0xe74c3c),
        createFishMaterial(0xf1c40f),
        createFishMaterial(0x9b59b6),
        createFishMaterial(0x1abc9c),
        createFishMaterial(0xe67e22)
    ];
    
    // Add enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0x3498db, 0.5, 50);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xe74c3c, 0.5, 50);
    pointLight2.position.set(-20, -20, 20);
    scene.add(pointLight2);
    
    // Track mouse position for attraction with improved interaction
    const mouse = new THREE.Vector3();
    const mouseAttractors = [];
    let lastAttractorTime = 0;
    const attractorCooldown = 50; // ms between attractors
    
    // Add raycaster for better mouse interaction
    const raycaster = new THREE.Raycaster();
    const mousePos = new THREE.Vector2();
    
    window.addEventListener('mousemove', (event) => {
        // Update normalized mouse position for raycaster
        mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Convert mouse position to normalized device coordinates (-1 to +1)
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        
        // Project mouse position to 3D space
        raycaster.setFromCamera(mousePos, camera);
        const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const pos = new THREE.Vector3();
        raycaster.ray.intersectPlane(intersectPlane, pos);
        
        // Create a new attractor at the mouse position with cooldown
        const now = Date.now();
        if (now - lastAttractorTime > attractorCooldown) {
            mouseAttractors.push(new Attractor(
                pos.x, pos.y, pos.z, 
                0.8 + Math.random() * 0.4, // Randomized strength
                15 + Math.random() * 10,   // Randomized radius
                2000 + Math.random() * 1000 // Randomized duration
            ));
            lastAttractorTime = now;
        }
    });
    
    // Add click event for stronger attraction
    window.addEventListener('click', (event) => {
        // Update normalized mouse position
        mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Project mouse position to 3D space
        raycaster.setFromCamera(mousePos, camera);
        const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const pos = new THREE.Vector3();
        raycaster.ray.intersectPlane(intersectPlane, pos);
        
        // Create a stronger attractor on click
        mouseAttractors.push(new Attractor(pos.x, pos.y, pos.z, 2.0, 25, 3000));
    });
    
    // Time tracking for smooth animation
    let lastTime = performance.now();
    
    // Update function for boids with time-based animation
    function update() {
        // Calculate delta time for smooth animation
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 0.1 seconds
        lastTime = currentTime;
        
        // Update boids with time-based movement
        for (let i = 0; i < boids.length; i++) {
            boids[i].update(boids, deltaTime);
            
            // Apply attraction to mouse
            if (mouseAttractors.length > 0) {
                const attraction = boids[i].attract(mouseAttractors);
                attraction.multiplyScalar(0.6);
                boids[i].acceleration.add(attraction);
            }
            
            // Update mesh position and rotation
            meshes[i].position.copy(boids[i].position);
            
            // Calculate rotation based on velocity
            if (boids[i].velocity.length() > 0) {
                meshes[i].lookAt(meshes[i].position.clone().add(boids[i].velocity));
                
                // Add subtle wobble based on velocity
                const speed = boids[i].velocity.length() / boids[i].maxSpeed;
                meshes[i].rotation.z = Math.sin(currentTime * 0.01 * speed + i * 0.1) * 0.2 * speed;
            }
            
            // Subtle size pulsing for more life-like appearance
            const pulseFactor = 1 + Math.sin(currentTime * 0.003 + i * 0.5) * 0.05;
            meshes[i].scale.set(
                boids[i].size * pulseFactor,
                boids[i].size * pulseFactor,
                boids[i].size * pulseFactor
            );
        }
        
        // Update point lights for dynamic lighting
        pointLight1.position.x = Math.sin(currentTime * 0.0005) * 30;
        pointLight1.position.y = Math.cos(currentTime * 0.0005) * 30;
        pointLight2.position.x = Math.sin(currentTime * 0.0005 + Math.PI) * 30;
        pointLight2.position.y = Math.cos(currentTime * 0.0005 + Math.PI) * 30;
        
        // Remove expired attractors
        for (let i = mouseAttractors.length - 1; i >= 0; i--) {
            if (mouseAttractors[i].isExpired()) {
                mouseAttractors.splice(i, 1);
            }
        }
    }
    
    // Create boids with improved distribution
    const numBoids = 150; // Reduced for better performance
    const boids = [];
    const meshes = [];
    
    for (let i = 0; i < numBoids; i++) {
        // Improved distribution within a sphere using fibonacci sphere
        const phi = Math.acos(1 - 2 * (i + 0.5) / numBoids);
        const theta = Math.PI * 2 * i * (1 + Math.sqrt(5));
        const radius = 40 * Math.pow(Math.random(), 1/3); // Cube root for uniform volume distribution
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        // Create boid
        const boid = new Boid(x, y, z);
        boids.push(boid);
        
        // Create mesh with improved materials
        const material = fishMaterials[Math.floor(Math.random() * fishMaterials.length)];
        const mesh = new THREE.Mesh(fishGeometry, material);
        
        // Randomize size for more natural look
        const size = 0.5 + Math.random() * 0.5;
        boid.size = size;
        mesh.scale.set(size, size, size);
        
        scene.add(mesh);
        meshes.push(mesh);
    }
    
    // Animation loop with performance optimization
    let frameCount = 0;
    function animate() {
        requestAnimationFrame(animate);
        
        // Update scene
        update();
        
        // Render scene
        renderer.render(scene, camera);
        
        // Performance optimization - adaptive quality
        frameCount++;
        if (frameCount === 60) {
            const fps = 60 / (performance.now() - lastTime) * 1000;
            // If FPS is low, reduce quality
            if (fps < 30 && numBoids > 100) {
                for (let i = 0; i < 10; i++) {
                    if (boids.length > 100) {
                        const lastBoid = boids.pop();
                        const lastMesh = meshes.pop();
                        scene.remove(lastMesh);
                    }
                }
            }
            frameCount = 0;
        }
    }
    
    animate();
    
    // Handle window resize with improved responsiveness
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
    
    // Project detail functionality
    const projectCards = document.querySelectorAll('.project-card');
    const projectDetails = document.querySelectorAll('.project-detail');
    const closeDetailButtons = document.querySelectorAll('.close-detail');
    
    // Function to load and render markdown content
    async function loadMarkdownContent(element) {
        const markdownFile = element.getAttribute('data-markdown-file');
        if (!markdownFile) return;
        
        try {
            const response = await fetch(markdownFile);
            if (!response.ok) {
                throw new Error(`Failed to load markdown file: ${markdownFile}`);
            }
            
            const markdownText = await response.text();
            // Use the marked library to convert markdown to HTML
            element.innerHTML = marked.parse(markdownText);
        } catch (error) {
            console.error('Error loading markdown:', error);
            element.innerHTML = `<p>Error loading content. Please try again later.</p>`;
        }
    }
    
    // Function to show project detail
    function showProjectDetail(projectId) {
        const detailElement = document.getElementById(`${projectId}-detail`);
        if (detailElement) {
            // Load markdown content if it hasn't been loaded yet
            const descriptionElement = detailElement.querySelector('.project-description');
            if (descriptionElement && descriptionElement.innerHTML.trim() === '<!-- Markdown content will be loaded here -->') {
                loadMarkdownContent(descriptionElement);
            }
            
            detailElement.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling behind the detail page
        }
    }
    
    // Function to hide all project details
    function hideAllProjectDetails() {
        projectDetails.forEach(detail => {
            detail.classList.remove('active');
        });
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Add click event listeners to project cards
    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            const projectId = card.getAttribute('data-project');
            showProjectDetail(projectId);
        });
    });
    
    // Add click event listeners to close buttons
    closeDetailButtons.forEach(button => {
        button.addEventListener('click', hideAllProjectDetails);
    });
    
    // Close project detail when clicking escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAllProjectDetails();
        }
    });
});
