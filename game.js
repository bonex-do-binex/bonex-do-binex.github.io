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

const { mapGroup, curve } = createMap(scene);

// --- SPEED LINES VFX ---
const speedLinesCount = 40;
const speedLinesGeo = new THREE.BufferGeometry();
const speedLinePos = new Float32Array(speedLinesCount * 6); // 2 points per line
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

// --- PHYSICS VARIABLES ---
let speed = 0;
let driftAngle = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    const progress = (car.position.z + 5000) / 15000;
    let isOnRoad = true;
    let roadCenter = new THREE.Vector3(0,0,0);

    if (progress >= 0 && progress <= 1) {
        roadCenter = curve.getPointAt(progress);
        if (Math.abs(car.position.x - roadCenter.x) > 25) isOnRoad = false;

        // Elevation & Slope
        const targetPos = curve.getPointAt(progress);
        const tangent = curve.getTangentAt(progress);
        car.position.y = THREE.MathUtils.lerp(car.position.y, targetPos.y, 0.2);
        car.rotation.x = THREE.MathUtils.lerp(car.rotation.x, -Math.atan2(tangent.y, tangent.z), 0.1);
    }

    // --- DRIFT LOGIC ---
    const isDrifting = keys["shift"] && speed > 40 && (keys["a"] || keys["d"]);
    driftStatusEl.style.display = isDrifting ? "block" : "none";

    let accel = isOnRoad ? 60 : 20;
    let friction = isDrifting ? 0.97 : (isOnRoad ? 0.99 : 0.94);

    if (keys["w"]) speed += accel * delta;
    if (keys["s"]) speed -= 100 * delta;
    speed *= friction;
    speed = Math.max(0, Math.min(180, speed));

    // Steering
    const steerPower = isDrifting ? 3.5 : 2.0;
    if (keys["a"]) {
        car.rotation.y += steerPower * delta;
        driftAngle = THREE.MathUtils.lerp(driftAngle, isDrifting ? 0.4 : 0.1, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= steerPower * delta;
        driftAngle = THREE.MathUtils.lerp(driftAngle, isDrifting ? -0.4 : -0.1, 0.1);
    } else {
        driftAngle = THREE.MathUtils.lerp(driftAngle, 0, 0.1);
    }
    
    // Apply visual drift lean and swing
    carBodyContainer.rotation.y = driftAngle;
    carBodyContainer.rotation.z = -driftAngle * 0.5;

    car.translateZ(speed * delta);
    wheels.forEach(w => w.rotation.x -= speed * delta * 2);

    // --- SPEED LINES VFX ---
    if (speed > 80) {
        speedLinesMat.opacity = THREE.MathUtils.mapLinear(speed, 80, 180, 0, 0.5);
        for(let i=0; i<speedLinesCount; i++) {
            const idx = i * 6;
            if (speedLinePos[idx+2] > 50) { // Reset line when it goes past
                const rx = (Math.random() - 0.5) * 40;
                const ry = (Math.random() - 0.5) * 20;
                const rz = -50 - Math.random() * 50;
                speedLinePos[idx] = speedLinePos[idx+3] = rx;
                speedLinePos[idx+1] = speedLinePos[idx+4] = ry;
                speedLinePos[idx+2] = rz;
                speedLinePos[idx+5] = rz - 10;
            }
            speedLinePos[idx+2] += speed * delta * 2;
            speedLinePos[idx+5] += speed * delta * 2;
        }
        speedLines.position.copy(car.position);
        speedLines.quaternion.copy(car.quaternion);
        speedLinesGeo.attributes.position.needsUpdate = true;
    } else {
        speedLinesMat.opacity = 0;
    }

    // --- COLLISION/SHAKE LOGIC ---
    camera.fov = 60 + (speed * 0.15);
    camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(0, 8, -22).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.1);

    if (!isOnRoad && speed > 20) {
        const shake = (speed * 0.006);
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        statusEl.innerText = "OFF-ROAD";
        statusEl.style.color = "#e74c3c";
    } else {
        statusEl.innerText = "STABLE";
        statusEl.style.color = "#2ecc71";
    }

    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
    
    // Update UI
    speedValEl.innerText = Math.round(speed * 2.5);
    speedBarEl.style.width = `${(speed / 180) * 100}%`;
    speedBarEl.style.background = isDrifting ? "#f1c40f" : (isOnRoad ? "#2ecc71" : "#e74c3c");

    if (car.position.z > 9500) car.position.z = -4800;
    composer.render();
}

setTimeout(() => { loaderEl.style.display = "none"; }, 1000);
animate();
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
