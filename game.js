console.log("Forza WebGL - v6: Stability & Environment");

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- 1. CLEANUP & UI ---
// This clears any "Generating World" text stuck on your screen
const existingUI = document.querySelectorAll('.game-ui');
existingUI.forEach(el => el.remove());

const ui = document.createElement('div');
ui.className = 'game-ui';
ui.innerHTML = `
    <div id="loader" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;justify-content:center;align-items:center;color:white;font-family:sans-serif;z-index:100;">LOADING ENGINE...</div>
    <div style="position:fixed;bottom:30px;right:50px;color:white;font-family:Arial;text-align:right;z-index:10;">
        <span id="speedVal" style="font-size:90px;font-style:italic;font-weight:bold;text-shadow:2px 2px #000;">0</span>
        <span style="font-size:24px;font-weight:bold;">KM/H</span>
    </div>
`;
document.body.appendChild(ui);

// --- 2. CORE SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Bright Sky Blue
scene.fog = new THREE.Fog(0x87ceeb, 1, 15000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- 3. RELIABLE LIGHTING ---
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(100, 200, 100);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// --- 4. ENVIRONMENT (Grass, Pavement, Trees) ---
// Infinite Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x348C31 }) // Healthy Green
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Road System
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.05;
scene.add(road);

// Procedural Trees & Grass Blades
const treeCount = 300;
const treeTrunkGeo = new THREE.CylinderGeometry(1, 1.5, 10);
const treeTopGeo = new THREE.ConeGeometry(5, 12, 8);
const treeMat = new THREE.MeshStandardMaterial({ color: 0x1B3022 });

for (let i = 0; i < treeCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (50 + Math.random() * 100);
    const z = (Math.random() - 0.5) * 15000;
    
    const trunk = new THREE.Mesh(treeTrunkGeo, new THREE.MeshStandardMaterial({ color: 0x3D2B1F }));
    trunk.position.set(x, 5, z);
    const top = new THREE.Mesh(treeTopGeo, treeMat);
    top.position.set(x, 15, z);
    scene.add(trunk, top);
}

// --- 5. THE CAR ---
const car = new THREE.Group();
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 9),
    new THREE.MeshPhysicalMaterial({ color: 0xcc0000, metalness: 0.8, roughness: 0.1, clearcoat: 1.0 })
);
body.position.y = 1.3;
car.add(body);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 1, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
const wheelPositions = [[2, 0.7, 3], [-2, 0.7, 3], [2, 0.7, -3], [-2, 0.7, -3]];
wheelPositions.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    car.add(w);
});
scene.add(car);

// --- 6. LOOPS & LOGIC ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

// Hide loader once everything is added to scene
document.getElementById('loader').style.display = 'none';

function animate() {
    requestAnimationFrame(animate);

    // Physics
    if (keys["w"]) speed += 0.5;
    if (keys["s"]) speed -= 0.8;
    speed = Math.max(0, speed * 0.98); // Friction
    
    if (keys["a"]) car.rotation.y += 0.03 * (speed/20);
    if (keys["d"]) car.rotation.y -= 0.03 * (speed/20);
    car.translateZ(speed * 0.1);

    // Dynamic Camera
    const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(offset), 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
    camera.fov = 60 + (speed * 0.4);
    camera.updateProjectionMatrix();

    // Loop logic to keep car on road
    if (Math.abs(car.position.z) > 9000) car.position.z = 0;

    document.getElementById("speedVal").innerText = Math.round(speed * 4);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
