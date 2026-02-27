console.log("Forza WebGL - Version: v5 (Total World)");

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- 1. ENGINE & UI SETUP ---
// Create the UI via JS so it's guaranteed to exist
const ui = document.createElement('div');
ui.innerHTML = `<div style="position:fixed;bottom:20px;right:40px;color:white;font-family:Arial;text-align:right;">
    <span id="speedVal" style="font-size:80px;font-style:italic;font-weight:bold;">0</span>
    <span style="font-size:20px;">KM/H</span>
</div>`;
document.body.appendChild(ui);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.00015);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 50000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- 2. LIGHTING & ATMOSPHERE ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();
const uniforms = sky.material.uniforms;
uniforms['turbidity'].value = 10;
uniforms['rayleigh'].value = 3;
uniforms['mieCoefficient'].value = 0.005;
uniforms['mieDirectionalG'].value = 0.7;

function updateSun() {
    const phi = THREE.MathUtils.degToRad(82); // Golden hour
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);
}
updateSun();

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.copy(sun);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// --- 3. THE WORLD (Pavement, Grass, Trees) ---
// Ground Plane (Infinite Grass)
const grassGeo = new THREE.PlaneGeometry(10000, 20000);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
const ground = new THREE.Mesh(grassGeo, grassMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// Main Road + Pavement Sidewalks
const roadGroup = new THREE.Group();
const roadBase = new THREE.Mesh(new THREE.PlaneGeometry(60, 20000), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
const sidewalkL = new THREE.Mesh(new THREE.PlaneGeometry(10, 20000), new THREE.MeshStandardMaterial({ color: 0x555555 }));
const sidewalkR = sidewalkL.clone();
sidewalkL.position.set(-35, 0.01, 0);
sidewalkR.position.set(35, 0.01, 0);
roadBase.rotation.x = -Math.PI / 2;
sidewalkL.rotation.x = -Math.PI / 2;
sidewalkR.rotation.x = -Math.PI / 2;
roadGroup.add(roadBase, sidewalkL, sidewalkR);
scene.add(roadGroup);

// Instanced Nature (High Performance)
const treeCount = 400;
const trunkGeo = new THREE.CylinderGeometry(1, 1, 15);
const leaveGeo = new THREE.SphereGeometry(6);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3621 });
const leaveMat = new THREE.MeshStandardMaterial({ color: 0x004400 });

const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
const leaves = new THREE.InstancedMesh(leaveGeo, leaveMat, treeCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < treeCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (60 + Math.random() * 100);
    const z = (Math.random() - 0.5) * 18000;
    
    dummy.position.set(x, 7.5, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    
    dummy.position.set(x, 18, z);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
}
scene.add(trunks, leaves);

// --- 4. THE CAR (Full Geometry) ---
const car = new THREE.Group();

// Body
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.2, 10), 
    new THREE.MeshPhysicalMaterial({ color: 0xff0000, metalness: 0.9, roughness: 0.1, clearcoat: 1 })
);
body.position.y = 1.1;
body.castShadow = true;
car.add(body);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const wheelPos = [[2, 0.6, 3.5], [-2, 0.6, 3.5], [2, 0.6, -3.5], [-2, 0.6, -3.5]];
wheelPos.forEach(pos => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...pos);
    car.add(w);
});

// Headlights (Visually present now)
const lightGlow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
lightGlow.position.set(1.2, 1.3, 5);
car.add(lightGlow, lightGlow.clone().setX(-1.2));

scene.add(car);

// --- 5. PHYSICS & RENDER LOOP ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

function animate() {
    requestAnimationFrame(animate);

    // Movement
    if (keys["w"]) speed += 0.4;
    if (keys["s"]) speed -= 0.6;
    speed = Math.max(0, speed * 0.985);
    
    if (keys["a"]) car.rotation.y += 0.015 * (speed / 10);
    if (keys["d"]) car.rotation.y -= 0.015 * (speed / 10);
    car.translateZ(speed * 0.1);

    // Camera
    const cameraTarget = car.position.clone().add(new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion));
    camera.position.lerp(cameraTarget, 0.08);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
    
    // UI Update
    document.getElementById("speedVal").innerText = Math.round(speed * 4);

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
