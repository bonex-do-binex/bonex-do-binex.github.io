console.log("Forza WebGL - v7: Visual Upgrade Edition");

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- UI ---
const existingUI = document.querySelectorAll(".game-ui");
existingUI.forEach(el => el.remove());

const ui = document.createElement("div");
ui.className = "game-ui";
ui.innerHTML = `
    <div id="loader" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;justify-content:center;align-items:center;color:white;font-family:sans-serif;z-index:100;">LOADING ENGINE...</div>
    <div style="position:fixed;bottom:30px;right:50px;color:white;font-family:Arial;text-align:right;z-index:10;pointer-events:none;">
        <span id="speedVal" style="font-size:90px;font-style:italic;font-weight:bold;text-shadow:2px 2px #000;">0</span>
        <span style="font-size:24px;font-weight:bold;">KM/H</span>
    </div>
`;
document.body.appendChild(ui);

const loaderEl = document.getElementById("loader");
const speedValEl = document.getElementById("speedVal");

// --- SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 15000);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
);

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2e4f1f, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(200, 300, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.camera.near = 50;
sun.shadow.camera.far = 1000;
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
scene.add(sun);

// --- ENVIRONMENT ---
// Ground
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3fa63f,
    roughness: 0.9,
    metalness: 0.0
});
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    groundMat
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Road
const road = new THREE.Group();

const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.1
    })
);
asphalt.rotation.x = -Math.PI / 2;
asphalt.position.y = 0.05;
asphalt.receiveShadow = true;
road.add(asphalt);

// Center dashed line
const lineGeo = new THREE.PlaneGeometry(2, 20);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = -10000; i < 10000; i += 80) {
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.06, i);
    road.add(line);
}
scene.add(road);

// --- TREES ---
const treeCount = 350;
const trunkGeo = new THREE.CylinderGeometry(1, 1.4, 10);
const topGeo = new THREE.ConeGeometry(5, 14, 8);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b4022 });

for (let i = 0; i < treeCount; i++) {
    const scale = 0.8 + Math.random() * 0.6;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (50 + Math.random() * 120);
    const z = (Math.random() - 0.5) * 15000;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 5 * scale, z);
    trunk.scale.set(scale, scale, scale);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const top = new THREE.Mesh(topGeo, leafMat);
    top.position.set(x, 15 * scale, z);
    top.scale.set(scale, scale, scale);
    top.rotation.y = Math.random() * Math.PI;
    top.castShadow = true;

    scene.add(trunk, top);
}

// --- CAR ---
const car = new THREE.Group();

// Car body
const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc0000,
    metalness: 0.7,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xff0000)
});
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 9),
    bodyMat
);
body.position.y = 1.3;
body.castShadow = true;
body.receiveShadow = true;
car.add(body);

// Simple windshield
const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.8, 1.5),
    new THREE.MeshPhysicalMaterial({
        color: 0x88cfff,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.0
    })
);
windshield.position.set(0, 1.8, 0.8);
car.add(windshield);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 1, 20);
const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.3,
    roughness: 0.5
});
const wheelPos = [
    [2, 0.7, 3],
    [-2, 0.7, 3],
    [2, 0.7, -3],
    [-2, 0.7, -3]
];

const wheels = [];
wheelPos.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    w.castShadow = true;
    car.add(w);
    wheels.push(w);
});

car.position.set(0, 0, 0);
scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.7,
    0.4,
    0.85
);
composer.addPass(bloom);

// --- CONTROLS ---
let speed = 0;
const maxSpeed = 80;
const keys = {};

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

// Hide loader once everything is set
if (loaderEl) loaderEl.style.display = "none";

// --- LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Acceleration / braking
    if (keys["w"] || keys["arrowup"]) speed += 30 * delta;
    if (keys["s"] || keys["arrowdown"]) speed -= 40 * delta;

    // Friction
    speed *= 0.985;
    speed = Math.max(0, Math.min(maxSpeed, speed));

    // Steering
    const steeringFactor = speed / maxSpeed;
    if (keys["a"] || keys["arrowleft"]) {
        car.rotation.y += 1.5 * steeringFactor * delta;
    }
    if (keys["d"] || keys["arrowright"]) {
        car.rotation.y -= 1.5 * steeringFactor * delta;
    }

    // Move car forward
    car.translateZ(speed * delta);

    // Loop road in Z
    if (car.position.z > 9000) car.position.z = -9000;
    if (car.position.z < -9000) car.position.z = 9000;

    // Wheel rotation
    const wheelRotation = speed * delta * 3;
    wheels.forEach(w => {
        w.rotation.x -= wheelRotation;
    });

    // Camera follow
    const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
    const targetPos = car.position.clone().add(offset);
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(
        car.position.x,
        car.position.y + 2,
        car.position.z
    );

    // Dynamic FOV (clamped)
    const baseFov = 60;
    const fov = baseFov + speed * 0.4;
    camera.fov = THREE.MathUtils.clamp(fov, 60, 95);
    camera.updateProjectionMatrix();

    // Update speed UI
    if (speedValEl) {
        speedValEl.innerText = Math.round(speed * 3.6).toString(); // ~km/h feel
    }

    composer.render();
}

animate();

// --- RESIZE ---
window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloom.setSize(width, height);
});
