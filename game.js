import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// --- UI UPGRADE ---
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

// --- SCENE & COSMETICS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); // Deep space blue/black
scene.fog = new THREE.FogExp2(0x020205, 0.002);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTING (Neon/Night Style) ---
const ambient = new THREE.AmbientLight(0x404040, 0.5); 
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0x5555ff, 0.8);
moonLight.position.set(50, 100, 50);
scene.add(moonLight);

// --- ENVIRONMENT ---
// Ground with Grid
const grid = new THREE.GridHelper(10000, 200, 0x00f2ff, 0x222222);
grid.position.y = 0.01;
scene.add(grid);

const roadGeo = new THREE.PlaneGeometry(50, 10000);
const roadMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    roughness: 0.1, 
    metalness: 0.5 
});
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Neon Road Edges
const edgeGeo = new THREE.BoxGeometry(1, 0.5, 10000);
const edgeMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 2 });
const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
leftEdge.position.set(-25, 0.25, 0);
scene.add(leftEdge);

const rightEdge = leftEdge.clone();
rightEdge.position.set(25, 0.25, 0);
scene.add(rightEdge);

// --- CAR UPGRADE ---
const car = new THREE.Group();

// Car Base (Sleek Red)
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 8), 
    new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.2 })
);
body.position.y = 0.8;
body.castShadow = true;
car.add(body);

// Cabin (Glass-like)
const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: 0, opacity: 0.7, transparent: true })
);
cabin.position.set(0, 1.7, -0.5);
car.add(cabin);

// Headlights (The "Forza" Look)
const lightGeo = new THREE.PlaneGeometry(1.2, 0.5);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const leftLight = new THREE.Mesh(lightGeo, lightMat);
leftLight.position.set(1.4, 0.8, 4.01);
car.add(leftLight);

const rightLight = leftLight.clone();
rightLight.position.x = -1.4;
car.add(rightLight);

// Spotlights (Actual light beams)
const headLamp = new THREE.SpotLight(0xffffff, 50, 100, 0.5, 0.5);
headLamp.position.set(0, 1, 4);
headLamp.target = new THREE.Object3D();
car.add(headLamp);
car.add(headLamp.target);
headLamp.target.position.set(0, 0, 10);

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// High Bloom for Neon Effect
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

// --- CONTROLS ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Initialization
setTimeout(() => { loaderEl.style.display = "none"; }, 800);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Smoother Acceleration
    if (keys["w"]) speed += 55 * delta;
    if (keys["s"]) speed -= 80 * delta;
    speed *= 0.99; 
    speed = Math.max(0, Math.min(160, speed));

    // Steering with "Body Roll"
    const steerLimit = (speed / 160) + 0.5;
    if (keys["a"]) {
        car.rotation.y += 1.8 * steerLimit * delta;
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0.1, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= 1.8 * steerLimit * delta;
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -0.1, 0.1);
    } else {
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 0.1);
    }

    car.translateZ(speed * delta);

    // Dynamic Camera (FOV stretches at high speed)
    camera.fov = 60 + (speed * 0.15);
    camera.updateProjectionMatrix();

    const cameraOffset = new THREE.Vector3(0, 7, -20).applyMatrix4(car.matrixWorld);
    camera.position.lerp(cameraOffset, 0.12);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);

    // UI Updates
    const displaySpeed = Math.round(speed * 2.2);
    speedValEl.innerText = displaySpeed;
    speedBarEl.style.width = `${(speed / 160) * 100}%`;

    composer.render();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
