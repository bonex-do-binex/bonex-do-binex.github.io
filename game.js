console.log("Forza WebGL - Version: v3 (Lumen Update)");

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- SCENE & ENGINE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.001); // Thicker fog for depth

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping; // Better for high-intensity lights
renderer.toneMappingExposure = 2.0; 
document.body.appendChild(renderer.domElement);

// --- LIGHTING (The Fix) ---
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(100, 100, 100);
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0x4433aa, 0x111122, 1); // Blueish night tint
scene.add(hemiLight);

// --- PROCEDURAL WET ROAD ---
const roadGeo = new THREE.PlaneGeometry(80, 20000);
const roadMat = new THREE.MeshPhysicalMaterial({ 
    color: 0x080808,
    roughness: 0.1, 
    metalness: 0.7,
    clearcoat: 1.0,
    reflectivity: 1.0
});
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
scene.add(road);

// --- BUILDINGS WITH GLOWING WINDOWS ---
const buildCount = 400;
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
const instancedCity = new THREE.InstancedMesh(buildGeo, new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    emissive: 0x00f2ff, // Neon blue window glow
    emissiveIntensity: 0.2, 
    metalness: 0.9,
    roughness: 0.1
}), buildCount);

const matrix = new THREE.Matrix4();
for (let i = 0; i < buildCount; i++) {
    const h = 100 + Math.random() * 500;
    const w = 50 + Math.random() * 100;
    const side = Math.random() > 0.5 ? 1 : -1;
    matrix.makeScale(w, h, w);
    matrix.setPosition(side * (350 + Math.random() * 500), h / 2, (Math.random() - 0.5) * 15000);
    instancedCity.setMatrixAt(i, matrix);
}
scene.add(instancedCity);

// --- IMPROVED CAR MODEL ---
const car = new THREE.Group();
const bodyMat = new THREE.MeshPhysicalMaterial({ 
    color: 0xff0000, 
    metalness: 1.0, 
    roughness: 0.05, 
    clearcoat: 1.0, 
    clearcoatRoughness: 0.02 
});

const carBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 8), bodyMat);
carBody.position.y = 1;
car.add(carBody);

// Cabin/Windows
const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 3), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0 }));
cabin.position.set(0, 1.8, -0.5);
car.add(cabin);

// Headlights (High Intensity)
const headLightGeo = new THREE.BoxGeometry(1.2, 0.3, 0.2);
const headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5 });
const hLeft = new THREE.Mesh(headLightGeo, headLightMat);
hLeft.position.set(1.2, 1.2, 4);
car.add(hLeft);

const hSpot = new THREE.SpotLight(0xffffff, 100, 300, 0.4, 0.5);
hSpot.position.set(0, 1.2, 4);
car.add(hSpot, hSpot.target);
hSpot.target.position.set(0, 0, 100);

scene.add(car);

// --- BLOOM (THE "FORZA" GLOW) ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.8);
composer.addPass(bloom);

// --- MOVEMENT ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);

    if (keys["w"]) speed += 0.6;
    if (keys["s"]) speed -= 0.8;
    speed = Math.max(0, speed * 0.98);
    
    car.translateZ(speed * 0.1);
    if (keys["a"]) car.rotation.y += 0.02 * (speed > 5 ? 1 : speed/5);
    if (keys["d"]) car.rotation.y -= 0.02 * (speed > 5 ? 1 : speed/5);

    // Camera Physics
    const camOffset = new THREE.Vector3(0, 7, -20 - (speed * 0.2)).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(camOffset), 0.1);
    camera.lookAt(car.position.clone().add(new THREE.Vector3(0, 2, 0)));
    
    // Dynamic FOV
    camera.fov = 60 + (speed * 0.4);
    camera.updateProjectionMatrix();

    composer.render();
}
animate();
