import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- ENGINE SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x00050a, 0.0012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 15000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0x4040ff, 0.3);
scene.add(ambient);

const moon = new THREE.DirectionalLight(0xffffff, 2);
moon.position.set(100, 200, 100);
scene.add(moon);

// --- CAR MODEL ---
const car = new THREE.Group();
const chassisMat = new THREE.MeshPhysicalMaterial({ 
    color: 0xff0055, metalness: 0.9, roughness: 0.1, clearcoat: 1.0 
});

const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 10), chassisMat);
base.position.y = 0.8;
car.add(base);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1, 4.5), new THREE.MeshStandardMaterial({ color: 0x050505 }));
cabin.position.set(0, 1.6, -0.5);
car.add(cabin);

const headLight = new THREE.PointLight(0xffffff, 10, 20);
headLight.position.set(0, 1, 5);
car.add(headLight);

scene.add(car);

// --- WORLD ---
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 20000), 
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 })
);
road.rotation.x = -Math.PI / 2;
scene.add(road);

// Buildings
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 400; i++) {
    const h = 40 + Math.random() * 300;
    const w = 20 + Math.random() * 40;
    const bMat = new THREE.MeshStandardMaterial({ 
        color: 0x050505, 
        emissive: 0x00ffff,
        emissiveIntensity: Math.random() > 0.8 ? 1 : 0 
    });
    const b = new THREE.Mesh(buildGeo, bMat);
    b.scale.set(w, h, w);
    b.position.set((Math.random()-0.5)*4000, h/2, (Math.random()-0.5)*12000);
    scene.add(b);
}

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloom);

// --- PHYSICS & LOOP ---
let speed = 0;
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Pre-fetch the element once to save performance and check for existence
const speedDisplay = document.getElementById('speedCounter');

function animate() {
    requestAnimationFrame(animate);

    if (keys['w']) speed += 0.5;
    if (keys['s']) speed -= 0.5;
    speed *= 0.97;

    if (keys['a']) car.rotation.y += 0.003 * speed;
    if (keys['d']) car.rotation.y -= 0.003 * speed;

    car.translateZ(speed * 0.1);

    const cameraOffset = new THREE.Vector3(0, 8, -22);
    cameraOffset.applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(cameraOffset), 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    // FIX: Only try to set text if the element actually exists
    if (speedDisplay) {
        speedDisplay.innerText = Math.abs(Math.round(speed * 2));
    }

    composer.render();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
