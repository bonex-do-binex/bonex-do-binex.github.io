import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createMap } from "./map.js";

// --- UI SETUP ---
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed; bottom:40px; right:60px; color:#ffffff; font-family:sans-serif; text-align:right; z-index:10; pointer-events:none;">
        <div id="driftStatus" style="font-size:18px; font-weight:bold; color:#f1c40f; display:none;">DRIFTING</div>
        <div id="nitroStatus" style="font-size:14px; font-weight:bold; color:#00f2ff; display:none;">NITRO READY</div>
        <div id="status" style="font-size:14px; letter-spacing:2px; font-weight:bold; color:#2ecc71;">STABLE</div>
        <span id="speedVal" style="font-size:110px; font-style:italic; font-weight:900;">0</span>
        <span style="font-size:24px; font-weight:bold;"> KM/H</span>
        <div style="width:100%; height:8px; background:rgba(0,0,0,0.3); border-radius:4px; margin-top:5px; overflow:hidden;">
            <div id="speedBar" style="width:0%; height:100%; background:#2ecc71;"></div>
        </div>
    </div>
`;
document.body.appendChild(ui);

const speedValEl = document.getElementById("speedVal");
const speedBarEl = document.getElementById("speedBar");
const driftStatusEl = document.getElementById("driftStatus");
const nitroStatusEl = document.getElementById("nitroStatus");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2ff); 
scene.fog = new THREE.FogExp2(0xa2d2ff, 0.001); 

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 15000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 500, 200);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.7));

const { curve } = createMap(scene);

// --- CAR SETUP ---
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

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.85));

// --- STATE & CONTROLS ---
let speed = 0;
let curveProgress = 0;
let nitroCharge = 100;
let lateralOffset = 0; // Allows moving left/right on road
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 1. INPUT LOGIC
    const isDrifting = keys["shift"] && speed > 40 && (keys["a"] || keys["d"]);
    const isNitro = keys[" "] && nitroCharge > 0 && speed > 20;

    let accel = 70; 
    if (isNitro) {
        accel = 200;
        nitroCharge -= 35 * delta;
    } else if (nitroCharge < 100) {
        nitroCharge += (isDrifting ? 15 : 5) * delta;
    }

    if (keys["w"]) speed += accel * delta;
    if (keys["s"]) speed -= 150 * delta;

    // 2. PHYSICS (Friction & Limits)
    speed *= isDrifting ? 0.985 : 0.996; // Balanced friction
    speed = Math.max(0, Math.min(isNitro ? 260 : 180, speed));

    // 3. CURVE PROGRESSION
    const pathLength = curve.getLength();
    curveProgress += (speed / pathLength) * delta;
    if (curveProgress > 1) curveProgress = 0;

    // 4. POSITIONING
    const roadPoint = curve.getPointAt(curveProgress);
    const tangent = curve.getTangentAt(curveProgress);
    
    car.position.copy(roadPoint);
    
    // Steering / Lateral Movement
    if (keys["a"]) lateralOffset += 40 * delta;
    if (keys["d"]) lateralOffset -= 40 * delta;
    lateralOffset = Math.max(-20, Math.min(20, lateralOffset)); // Road bounds

    // Apply lateral offset based on curve normal
    const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
    car.position.addScaledVector(normal, lateralOffset);

    // 5. ROTATION
    const lookAtTarget = curve.getPointAt((curveProgress + 0.01) % 1);
    car.lookAt(lookAtTarget);

    // Visual Drift Tilt
    const targetDriftAngle = isDrifting ? (keys["a"] ? 0.4 : -0.4) : 0;
    carBodyContainer.rotation.y = THREE.MathUtils.lerp(carBodyContainer.rotation.y, targetDriftAngle, 0.1);
    wheels.forEach(w => w.rotation.x -= speed * delta * 0.5);

    // 6. CAMERA
    camera.fov = 60 + (speed * 0.15);
    camera.updateProjectionMatrix();
    const camTarget = new THREE.Vector3(0, 10, -28).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(car.position.x, car.position.y + 3, car.position.z);

    // 7. UI
    speedValEl.innerText = Math.round(speed * 2.5);
    speedBarEl.style.width = `${(speed / 180) * 100}%`;
    speedBarEl.style.background = isNitro ? "#00f2ff" : (isDrifting ? "#f1c40f" : "#2ecc71");
    driftStatusEl.style.display = isDrifting ? "block" : "none";

    composer.render();
}

animate();
