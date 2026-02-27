console.log("Forza WebGL - v7: Visual Upgrade Edition");

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- UI ---
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

// --- SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 1, 15000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2e4f1f, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(200, 300, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun);

// --- ENVIRONMENT ---
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x3fa63f })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Road with lines
const road = new THREE.Group();

const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
);
asphalt.rotation.x = -Math.PI / 2;
asphalt.position.y = 0.05;
road.add(asphalt);

// Center dashed line
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = -10000; i < 10000; i += 80) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2, 20), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.06, i);
    road.add(line);
}
scene.add(road);

// Trees
const treeCount = 350;
const trunkGeo = new THREE.CylinderGeometry(1, 1.4, 10);
const topGeo = new THREE.ConeGeometry(5, 14, 8);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3D2B1F });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x1B4022 });

for (let i = 0; i < treeCount; i++) {
    const scale = 0.8 + Math.random() * 0.6;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (50 + Math.random() * 120);
    const z = (Math.random() - 0.5) * 15000;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 5 * scale, z);
    trunk.scale.set(scale, scale, scale);

    const top = new THREE.Mesh(topGeo, leafMat);
    top.position.set(x, 15 * scale, z);
    top.scale.set(scale, scale, scale);
    top.rotation.y = Math.random() * Math.PI;

    scene.add(trunk, top);
}

// --- CAR ---
const car = new THREE.Group();

const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 9),
    new THREE.MeshPhysicalMaterial({
        color: 0xcc0000,
        metalness: 0.6,
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0.4,
        sheenColor: new THREE.Color(0xff0000)
    })
);
body.position.y = 1.3;
car.add(body);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 1, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
const wheelPos = [[2, 0.7, 3], [-2, 0.7, 3], [2, 0.7, -3], [-2, 0.7, -3]];

wheelPos.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    car.add(w);
});

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.4,
    0.85
);
composer.addPass(bloom);

// --- CONTROLS ---
let speed = 0;
const keys = {};
window.onkeydown = e => keys[e.key.toLowerCase()] = true;
window.onkeyup = e => keys[e.key.toLowerCase()] = false;

document.getElementById('loader').style.display = 'none';

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (keys["w"]) speed += 0.5;
    if (keys["s"]) speed -= 0.8;
    speed = Math.max(0, speed * 0.98);

    if (keys["a"]) car.rotation.y += 0.03 * (speed / 20);
    if (keys["d"]) car.rotation.y -= 0.03 * (speed / 20);

    car.translateZ(speed * 0.1);

    const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(offset), 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
    camera.fov = 60 + (speed * 0.4);
    camera.updateProjectionMatrix();

    if (Math.abs(car.position.z) > 9000) car.position.z = 0;

    document.getElementById("speedVal").innerText = Math.round(speed * 4);

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
