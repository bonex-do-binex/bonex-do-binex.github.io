import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- UI & LOADER ---
const loaderEl = document.getElementById("loader");
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed;bottom:30px;right:50px;color:white;font-family:Arial;text-align:right;z-index:10;pointer-events:none;">
        <span id="speedVal" style="font-size:90px;font-style:italic;font-weight:bold;text-shadow:3px 3px #000;">0</span>
        <span style="font-size:24px;font-weight:bold;">KM/H</span>
    </div>
`;
document.body.appendChild(ui);
const speedValEl = document.getElementById("speedVal");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 50, 1000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTS ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(100, 200, 50);
sun.castShadow = true;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

// --- ENVIRONMENT ---
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000), 
    new THREE.MeshStandardMaterial({ color: 0x3d5a80 }) 
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10000), 
    new THREE.MeshStandardMaterial({ color: 0x222222 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.05;
road.receiveShadow = true;
scene.add(road);

// Add simple road markers
for(let i = -5000; i < 5000; i += 100) {
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 20), new THREE.MeshStandardMaterial({color: 0xffffff}));
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(0, 0.07, i);
    scene.add(marker);
}

// --- CAR ---
const car = new THREE.Group();
const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 8), 
    new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.2 })
);
carBody.position.y = 1.2;
carBody.castShadow = true;
car.add(carBody);

const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
);
cabin.position.set(0, 2.2, -0.5);
car.add(cabin);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const wheelPos = [[2, 0.8, 2.5], [-2, 0.8, 2.5], [2, 0.8, -2.5], [-2, 0.8, -2.5]];

wheelPos.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    car.add(w);
    wheels.push(w);
});
scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.85);
composer.addPass(bloom);

// --- CONTROLS & PHYSICS ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// RESIZE HANDLER
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// INITIALIZE: Hide loader after setup
setTimeout(() => { loaderEl.style.display = "none"; }, 500);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Physics
    if (keys["w"]) speed += 40 * delta;
    if (keys["s"]) speed -= 60 * delta;
    
    speed *= 0.98; // Friction
    speed = Math.max(-20, Math.min(120, speed)); // Max speed 120

    const turnSpeed = (speed / 100) + 0.5; 
    if (keys["a"]) car.rotation.y += 2 * turnSpeed * delta;
    if (keys["d"]) car.rotation.y -= 2 * turnSpeed * delta;

    car.translateZ(speed * delta);
    
    // Animate wheels
    wheels.forEach(w => w.rotation.x -= speed * delta * 2);

    // Smooth Chase Camera
    const relativeCameraOffset = new THREE.Vector3(0, 6, -18);
    const cameraOffset = relativeCameraOffset.applyMatrix4(car.matrixWorld);
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    // UI
    speedValEl.innerText = Math.abs(Math.round(speed * 2.5));

    composer.render();
}

animate();
