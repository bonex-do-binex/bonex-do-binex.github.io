import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createMap } from "./map.js";

// --- UI & LOADER ---
const loaderEl = document.getElementById("loader");
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed; bottom:40px; right:60px; color:#00f2ff; font-family:'Courier New', monospace; text-align:right; z-index:10; pointer-events:none; filter: drop-shadow(0 0 10px #00f2ff);">
        <div style="font-size:14px; letter-spacing:4px; margin-bottom:-10px; opacity:0.8;">VELOCITY</div>
        <span id="speedVal" style="font-size:110px; font-style:italic; font-weight:900;">0</span>
        <span style="font-size:24px; margin-left:-10px;"> KM/H</span>
        <div style="width:100%; height:4px; background:rgba(255,255,255,0.2); margin-top:5px;">
            <div id="speedBar" style="width:0%; height:100%; background:#00f2ff; transition: width 0.1s;"></div>
        </div>
    </div>
`;
document.body.appendChild(ui);
const speedValEl = document.getElementById("speedVal");
const speedBarEl = document.getElementById("speedBar");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.002);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0x404040, 0.6));
const moonLight = new THREE.DirectionalLight(0x5555ff, 1.0);
moonLight.position.set(50, 100, 50);
scene.add(moonLight);

// --- MAP & ENVIRONMENT ---
const mapData = createMap(scene); // This calls your map.js logic

const roadGeo = new THREE.PlaneGeometry(60, 20000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.5 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// --- CAR ---
const car = new THREE.Group();
const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 8), 
    new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.2 })
);
carBody.position.y = 0.8;
carBody.castShadow = true;
car.add(carBody);

const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x000000, opacity: 0.8, transparent: true })
);
cabin.position.set(0, 1.7, -0.5);
car.add(cabin);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.7, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
[ [2, 0.8, 2.5], [-2, 0.8, 2.5], [2, 0.8, -2.5], [-2, 0.8, -2.5] ].forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    car.add(w);
    wheels.push(w);
});

// Headlights
const headLight = new THREE.SpotLight(0xffffff, 100, 150, 0.6, 0.5);
headLight.position.set(0, 2, 4);
car.add(headLight);
car.add(headLight.target);
headLight.target.position.set(0, 0, 20);

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
composer.addPass(bloom);

// --- CONTROLS ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- GAME LOOP ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Movement Physics
    if (keys["w"]) speed += 60 * delta;
    if (keys["s"]) speed -= 90 * delta;
    speed *= 0.985; // Drag
    speed = Math.max(0, Math.min(180, speed));

    const turnFactor = (speed / 180) + 0.6;
    if (keys["a"]) {
        car.rotation.y += 2.0 * turnFactor * delta;
        carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, 0.12, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= 2.0 * turnFactor * delta;
        carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, -0.12, 0.1);
    } else {
        carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, 0, 0.1);
    }

    car.translateZ(speed * delta);
    wheels.forEach(w => w.rotation.x -= speed * delta * 2);

    // Infinite Road Logic (Teleport back if you go too far)
    if (car.position.z > 5000) car.position.z = -5000;
    if (car.position.z < -5000) car.position.z = 5000;

    // Smooth Chase Camera with FOV Effect
    camera.fov = 60 + (speed * 0.15);
    camera.updateProjectionMatrix();
    
    const camOffset = new THREE.Vector3(0, 8, -22).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);

    // Update UI
    const kmh = Math.round(speed * 2.5);
    speedValEl.innerText = kmh;
    speedBarEl.style.width = `${(speed / 180) * 100}%`;

    composer.render();
}

// Start Game
setTimeout(() => { loaderEl.style.display = "none"; }, 1000);
animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
