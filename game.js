import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createMap } from "./map.js";

// --- UI SETUP ---
const loaderEl = document.getElementById("loader");
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed; bottom:40px; right:60px; color:#ffffff; font-family:'Arial', sans-serif; text-align:right; z-index:10; pointer-events:none; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">
        <div id="driftStatus" style="font-size:18px; font-weight:bold; color:#f1c40f; display:none;">DRIFTING</div>
        <div id="nitroStatus" style="font-size:14px; font-weight:bold; color:#00f2ff; display:none;">NITRO READY (SPACE)</div>
        <div id="status" style="font-size:14px; letter-spacing:2px; font-weight:bold; color:#2ecc71;">STABLE</div>
        <span id="speedVal" style="font-size:110px; font-style:italic; font-weight:900;">0</span>
        <span style="font-size:24px; font-weight:bold;"> KM/H</span>
        <div style="width:100%; height:8px; background:rgba(0,0,0,0.3); border-radius:4px; margin-top:5px; overflow:hidden;">
            <div id="speedBar" style="width:0%; height:100%; background:#2ecc71; transition: width 0.1s;"></div>
        </div>
    </div>
`;
document.body.appendChild(ui);
const speedValEl = document.getElementById("speedVal");
const speedBarEl = document.getElementById("speedBar");
const statusEl = document.getElementById("status");
const driftStatusEl = document.getElementById("driftStatus");
const nitroStatusEl = document.getElementById("nitroStatus");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2ff); 
scene.fog = new THREE.FogExp2(0xa2d2ff, 0.0012); 

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 15000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 500, 200);
scene.add(sun);

// Fetching the map and the mathematical curve
const { mapGroup, curve } = createMap(scene);

// --- SPEED LINES VFX ---
const speedLinesCount = 60;
const speedLinesGeo = new THREE.BufferGeometry();
const speedLinePos = new Float32Array(speedLinesCount * 6);
speedLinesGeo.setAttribute('position', new THREE.BufferAttribute(speedLinePos, 3));
const speedLinesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
const speedLines = new THREE.LineSegments(speedLinesGeo, speedLinesMat);
scene.add(speedLines);

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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85));

// --- GAME STATE ---
let speed = 0;
let driftAngle = 0;
let nitroCharge = 100;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Map Z to Curve Progress (0 to 1)
    const progress = (car.position.z + 5000) / 15000;
    let isOnRoad = true;

    if (progress >= 0 && progress <= 1) {
        const roadPoint = curve.getPointAt(progress);
        const tangent = curve.getTangentAt(progress);
        
        // ROAD BOUNDARY CHECK
        if (Math.abs(car.position.x - roadPoint.x) > 28) isOnRoad = false;

        // ELEVATION SNAPPING
        car.position.y = THREE.MathUtils.lerp(car.position.y, roadPoint.y, 0.15);
        
        // PITCH (Uphill/Downhill tilt)
        const slopeAngle = -Math.atan2(tangent.y, tangent.z);
        car.rotation.x = THREE.MathUtils.lerp(car.rotation.x, slopeAngle, 0.1);
    }

    // --- PHYSICS & NITRO ---
    const isDrifting = keys["shift"] && speed > 40 && (keys["a"] || keys["d"]);
    const isNitro = keys[" "] && nitroCharge > 0 && speed > 20;
    
    driftStatusEl.style.display = isDrifting ? "block" : "none";
    nitroStatusEl.style.display = (nitroCharge > 10) ? "block" : "none";

    let accel = isOnRoad ? 60 : 20;
    if (isNitro) {
        accel = 180;
        nitroCharge -= 40 * delta;
    } else if (nitroCharge < 100) {
        nitroCharge += (isDrifting ? 15 : 5) * delta; // Faster recharge while drifting
    }

    let friction = isDrifting ? 0.975 : (isOnRoad ? 0.992 : 0.94);
    if (keys["w"]) speed += accel * delta;
    if (keys["s"]) speed -= 120 * delta;
    
    speed *= friction;
    speed = Math.max(0, Math.min(isNitro ? 240 : 180, speed));

    // --- STEERING ---
    const steerPower = isDrifting ? 3.8 : 2.2;
    if (keys["a"]) {
        car.rotation.y += steerPower * delta;
        driftAngle = THREE.MathUtils.lerp(driftAngle, isDrifting ? 0.45 : 0.1, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= steerPower * delta;
        driftAngle = THREE.MathUtils.lerp(driftAngle, isDrifting ? -0.45 : -0.1, 0.1);
    } else {
        driftAngle = THREE.MathUtils.lerp(driftAngle, 0, 0.1);
    }
    
    carBodyContainer.rotation.y = driftAngle;
    carBodyContainer.rotation.z = -driftAngle * 0.4; // Visual roll

    car.translateZ(speed * delta);
    wheels.forEach(w => w.rotation.x -= speed * delta * 2.5);

    // --- VFX: SPEED LINES ---
    if (speed > 100) {
        speedLinesMat.opacity = THREE.MathUtils.mapLinear(speed, 100, 240, 0, 0.6);
        for(let i=0; i<speedLinesCount; i++) {
            const idx = i * 6;
            if (speedLinePos[idx+2] > 60) {
                const rx = (Math.random() - 0.5) * 50;
                const ry = (Math.random() - 0.5) * 30;
                const rz = -60 - Math.random() * 60;
                speedLinePos[idx] = speedLinePos[idx+3] = rx;
                speedLinePos[idx+1] = speedLinePos[idx+4] = ry;
                speedLinePos[idx+2] = rz;
                speedLinePos[idx+5] = rz - 15;
            }
            speedLinePos[idx+2] += speed * delta * 2.5;
            speedLinePos[idx+5] += speed * delta * 2.5;
        }
        speedLines.position.copy(car.position);
        speedLines.quaternion.copy(car.quaternion);
        speedLinesGeo.attributes.position.needsUpdate = true;
    } else {
        speedLinesMat.opacity = 0;
    }

    // --- CAMERA & SCREEN SHAKE ---
    camera.fov = 60 + (speed * 0.18);
    camera.updateProjectionMatrix();

    const camTargetPos = new THREE.Vector3(0, 9, -24).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camTargetPos, 0.08); // Lower = smoother follow

    if ((!isOnRoad || isNitro) && speed > 20) {
        const intensity = isNitro ? 0.08 : (speed * 0.008);
        camera.position.x += (Math.random() - 0.5) * intensity;
        camera.position.y += (Math.random() - 0.5) * intensity;
        statusEl.innerText = isNitro ? "NITRO BOOST" : "OFF-ROAD";
        statusEl.style.color = isNitro ? "#00f2ff" : "#e74c3c";
    } else {
        statusEl.innerText = "STABLE";
        statusEl.style.color = "#2ecc71";
    }

    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
    
    // UI UPDATES
    const kmh = Math.round(speed * 2.5);
    speedValEl.innerText = kmh;
    speedBarEl.style.width = `${(speed / 180) * 100}%`;
    speedBarEl.style.background = isNitro ? "#00f2ff" : (isDrifting ? "#f1c40f" : (isOnRoad ? "#2ecc71" : "#e74c3c"));

    if (car.position.z > 9500) car.position.z = -4800;
    composer.render();
}

setTimeout(() => { loaderEl.style.display = "none"; }, 1000);
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(window.innerWidth, window.innerHeight);
});
