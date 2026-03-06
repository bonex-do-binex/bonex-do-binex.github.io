import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createMap } from "./map.js";

// --- UI ELEMENTS ---
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed; bottom:40px; right:60px; color:#ffffff; font-family:sans-serif; text-align:right; z-index:10; pointer-events:none; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">
        <div id="driftStatus" style="font-size:18px; font-weight:bold; color:#f1c40f; display:none;">DRIFTING</div>
        <div id="status" style="font-size:14px; letter-spacing:2px; font-weight:bold; color:#2ecc71;">STABLE</div>
        <span id="speedVal" style="font-size:110px; font-style:italic; font-weight:900;">0</span>
        <span style="font-size:24px; font-weight:bold;"> KM/H</span>
        <div style="width:300px; height:8px; background:rgba(0,0,0,0.3); border-radius:4px; margin-top:5px; overflow:hidden; margin-left:auto;">
            <div id="speedBar" style="width:0%; height:100%; background:#2ecc71; transition: width 0.1s;"></div>
        </div>
    </div>
`;
document.body.appendChild(ui);

const speedValEl = document.getElementById("speedVal");
const speedBarEl = document.getElementById("speedBar");
const driftStatusEl = document.getElementById("driftStatus");

// --- SCENE & RENDERER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2ff); 
scene.fog = new THREE.FogExp2(0xa2d2ff, 0.001); 

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 15000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 500, 200);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.7));

// Initialize Map and get the Curve
const { curve } = createMap(scene);

// --- CAR HIERARCHY ---
const car = new THREE.Group();
const carBodyContainer = new THREE.Group(); 
car.add(carBodyContainer);

const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 8), 
    new THREE.MeshStandardMaterial({ color: 0xff4757, metalness: 0.6, roughness: 0.4 })
);
body.position.y = 1.0;
carBodyContainer.add(body);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e });
[ [2.1, 0.9, 2.5], [-2.1, 0.9, 2.5], [2.1, 0.9, -2.5], [-2.1, 0.9, -2.5] ].forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    carBodyContainer.add(w);
    wheels.push(w);
});
scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.85);
composer.addPass(bloomPass);

// --- DRIVING STATE ---
let speed = 0;
let curveProgress = 0;
let nitroCharge = 100;
const keys = {};

window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    // delta cap prevents "teleporting" when returning to a background tab
    const delta = Math.min(clock.getDelta(), 0.1); 

    // 1. INPUTS
    const isDrifting = keys["shift"] && speed > 40 && (keys["a"] || keys["d"]);
    const isNitro = keys[" "] && nitroCharge > 0 && speed > 20;

    // 2. ACCELERATION
    let accel = 75; 
    if (isNitro) {
        accel = 240;
        nitroCharge -= 40 * delta;
    } else if (nitroCharge < 100) {
        nitroCharge += (isDrifting ? 15 : 5) * delta;
    }

    if (keys["w"]) speed += accel * delta;
    if (keys["s"]) speed -= 160 * delta;

    // 3. FRICTION
    speed *= (isDrifting ? 0.98 : 0.995); 
    speed = Math.max(0, Math.min(isNitro ? 280 : 190, speed));

    // 4. CURVE TRACKING
    const pathLength = curve.getLength();
    if (pathLength > 0) {
        curveProgress += (speed / pathLength) * delta;
        if (curveProgress > 1) curveProgress = 0; // Loop track
    }

    // 5. UPDATE POSITIONS
    const roadPoint = curve.getPointAt(curveProgress);
    car.position.copy(roadPoint);
    
    // Look-ahead for steering rotation
    const lookTarget = curve.getPointAt((curveProgress + 0.01) % 1);
    car.lookAt(lookTarget);

    // Visual Drift Lean
    const driftTilt = isDrifting ? (keys["a"] ? 0.35 : -0.35) : 0;
    carBodyContainer.rotation.y = THREE.MathUtils.lerp(carBodyContainer.rotation.y, driftTilt, 0.1);
    
    // Wheel Spin
    wheels.forEach(w => w.rotation.x -= speed * delta * 0.6);

    // 6. CAMERA FOLLOW
    camera.fov = 60 + (speed * 0.15);
    camera.updateProjectionMatrix();
    const camOffset = new THREE.Vector3(0, 10, -28).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    // 7. UI REFRESH
    speedValEl.innerText = Math.round(speed * 2.5);
    speedBarEl.style.width = `${(speed / 190) * 100}%`;
    speedBarEl.style.background = isNitro ? "#00f2ff" : (isDrifting ? "#f1c40f" : "#2ecc71");
    driftStatusEl.style.display = isDrifting ? "block" : "none";

    composer.render();
}

// --- ENGINE START ---
try {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
    animate();
} catch (err) {
    console.error("Game engine failed to initialize:", err);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(window.innerWidth, window.innerHeight);
});
