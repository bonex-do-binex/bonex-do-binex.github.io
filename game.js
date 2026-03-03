console.log("yay");

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- UI REFERENCES ---
const loaderEl = document.getElementById("loader");

// --- THE FIX: HIDE LOADER WHEN READY ---
THREE.DefaultLoadingManager.onLoad = function() {
    console.log("Assets loaded, hiding loader...");
    loaderEl.style.display = "none";
};

// UI SPEEDOMETER
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed;bottom:30px;right:50px;color:white;font-family:Arial;text-align:right;z-index:10;pointer-events:none;">
        <span id="speedVal" style="font-size:90px;font-style:italic;font-weight:bold;text-shadow:2px 2px #000;">0</span>
        <span style="font-size:24px;font-weight:bold;">KM/H</span>
    </div>
`;
document.body.appendChild(ui);
const speedValEl = document.getElementById("speedVal");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbde0fe);
scene.fog = new THREE.Fog(0xbde0fe, 50, 15000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTS ---
scene.add(new THREE.HemisphereLight(0xfff1e6, 0x9bf6ff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 300, 150);
sun.castShadow = true;
scene.add(sun);

// --- ENVIRONMENT (ROAD & GROUND) ---
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: 0xa3d977 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 20000), new THREE.MeshStandardMaterial({ color: 0x2b2d42 }));
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
scene.add(road);

// --- CAR ---
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 7), new THREE.MeshStandardMaterial({ color: 0xff6b6b }));
body.position.y = 1.5;
body.castShadow = true;
car.add(body);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 1, 12);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42 });
[[2, 0.8, 2.5], [-2, 0.8, 2.5], [2, 0.8, -2.5], [-2, 0.8, -2.5]].forEach(p => {
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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

// --- CONTROLS & ANIMATION ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (keys["w"]) speed += 25 * delta;
    if (keys["s"]) speed -= 35 * delta;
    speed *= 0.985;
    speed = Math.max(0, Math.min(60, speed));

    const steer = speed / 60;
    if (keys["a"]) car.rotation.y += 1.5 * steer * delta;
    if (keys["d"]) car.rotation.y -= 1.5 * steer * delta;

    car.translateZ(speed * delta);
    wheels.forEach(w => w.rotation.x -= speed * delta * 3);

    const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(offset), 0.08);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    speedValEl.innerText = Math.round(speed * 3.6);
    composer.render();
}

animate();
