import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- HIGH-END RENDERER SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- REALISTIC SKY & REFLECTIONS (IBL) ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();
const sunSettings = { elevation: 25, azimuth: 140 }; // Golden hour lighting

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

function updateSkyAndReflections() {
    const phi = THREE.MathUtils.degToRad(90 - sunSettings.elevation);
    const theta = THREE.MathUtils.degToRad(sunSettings.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    sky.material.uniforms['turbidity'].value = 8;
    sky.material.uniforms['rayleigh'].value = 1.5;

    // This makes the sky reflect off the car paint!
    scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSkyAndReflections();

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.copy(sun).multiplyScalar(500);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(4096, 4096); // Ultra-high res shadows
directionalLight.shadow.camera.near = 10;
directionalLight.shadow.camera.far = 1000;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// --- ADVANCED PROCEDURAL TEXTURES ---
function createAsphaltMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 1024, 1024);
    
    // Noise for bump map
    for (let i = 0; i < 150000; i++) {
        const val = Math.random() * 255;
        ctx.fillStyle = `rgba(${val},${val},${val},0.1)`;
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 200);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Crisper textures at angles

    return new THREE.MeshStandardMaterial({
        map: tex,
        roughnessMap: tex, // Uses the noise to make reflections scatter accurately
        roughness: 0.7,
        metalness: 0.1
    });
}

// --- WORLD GENERATION ---
const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 20000), createAsphaltMaterial());
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Scenery (Dense Forest using Instancing for massive performance)
const treeGeo = new THREE.CylinderGeometry(0, 4, 15, 5);
const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a3311, roughness: 0.9 });
const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, 1000);
treeMesh.castShadow = true;
treeMesh.receiveShadow = true;

const dummy = new THREE.Object3D();
for (let i = 0; i < 1000; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    dummy.position.set(
        side * (25 + Math.random() * 150), 
        7.5, 
        (Math.random() - 0.5) * 10000
    );
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.setScalar(0.8 + Math.random() * 0.5);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(treeMesh);

// Grass Plane
const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x24381b, roughness: 1 })
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.2;
grass.receiveShadow = true;
scene.add(grass);

// --- NEXT-GEN CAR MODEL ---
const car = new THREE.Group();

// Car Paint: Deep metallic red with a glossy clearcoat
const paintMat = new THREE.MeshPhysicalMaterial({ 
    color: 0x990000, 
    metalness: 0.8, 
    roughness: 0.2, 
    clearcoat: 1.0, 
    clearcoatRoughness: 0.05 
});

const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 9.5), paintMat);
body.position.y = 0.9;
body.castShadow = true;
car.add(body);

// Tinted Glass with real reflections
const glassMat = new THREE.MeshPhysicalMaterial({ 
    color: 0x000000, metalness: 0.9, roughness: 0.0, transparent: true, opacity: 0.8 
});
const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 4.5), glassMat);
cabin.position.set(0, 1.8, -0.5);
car.add(cabin);

// High-detail Wheels
const tireGeo = new THREE.TorusGeometry(0.6, 0.3, 16, 32);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const rimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
const rimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 });

const wheelPositions = [[2.1, 0.9, 3], [-2.1, 0.9, 3], [2.1, 0.9, -3], [-2.1, 0.9, -3]];
const wheels = [];

wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();
    
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    
    wheelGroup.add(tire, rim);
    wheelGroup.position.set(...pos);
    wheelGroup.rotation.z = Math.PI / 2;
    wheelGroup.castShadow = true;
    
    car.add(wheelGroup);
    wheels.push(wheelGroup);
});

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
// Subtle bloom for sun glare off the car paint
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.5, 0.9);
composer.addPass(bloomPass);

// --- PHYSICS & CAMERA LOGIC ---
let speed = 0;
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const speedDisplay = document.getElementById('speedCounter');
document.getElementById('loading').style.opacity = 0; // Hide loading text

function animate() {
    requestAnimationFrame(animate);

    // Acceleration & Friction
    if (keys['w']) speed += 0.4;
    if (keys['s']) speed -= 0.6; // Stronger brakes
    speed *= 0.985; 

    // Steering (less sensitive at high speeds for realism)
    const turnRadius = 0.003 * Math.max(0.2, 1 - (speed / 200));
    if (keys['a']) car.rotation.y += turnRadius * speed;
    if (keys['d']) car.rotation.y -= turnRadius * speed;

    car.translateZ(speed * 0.1);

    // Spin wheels
    wheels.forEach(w => w.rotation.x -= speed * 0.05);

    // --- DYNAMIC CHASE CAMERA ---
    // Camera pulls back and FOV stretches when going fast (Sense of speed)
    const baseOffset = new THREE.Vector3(0, 6, -18);
    const speedOffset = new THREE.Vector3(0, speed * 0.02, -(speed * 0.08)); 
    const finalOffset = baseOffset.clone().add(speedOffset);
    
    finalOffset.applyQuaternion(car.quaternion);
    const targetCamPos = car.position.clone().add(finalOffset);
    
    // Smooth follow
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1.5, car.position.z);
    
    // Dynamic FOV
    camera.fov = 55 + (speed * 0.15);
    camera.updateProjectionMatrix();

    if (speedDisplay) speedDisplay.innerText = Math.abs(Math.round(speed * 3));

    composer.render();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
