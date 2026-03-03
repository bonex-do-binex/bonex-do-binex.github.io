import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createMap } from "./map.js";

// --- UI & LOADER ---
const loaderEl = document.getElementById("loader");
const ui = document.createElement("div");
ui.innerHTML = `
    <div style="position:fixed; bottom:40px; right:60px; color:#ffffff; font-family:'Arial', sans-serif; text-align:right; z-index:10; pointer-events:none; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">
        <div style="font-size:14px; letter-spacing:2px; font-weight:bold;">MOUNTAIN PASS</div>
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

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2ff); 
scene.fog = new THREE.FogExp2(0xa2d2ff, 0.0012); 

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 15000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 500, 200);
sun.castShadow = true;
sun.shadow.camera.left = -500;
sun.shadow.camera.right = 500;
sun.shadow.camera.top = 500;
sun.shadow.camera.bottom = -500;
scene.add(sun);

// --- MAP & PATH DATA ---
// We destructure 'curve' so we can sample height data in the loop
const { mapGroup, curve } = createMap(scene);

// --- CAR ---
const car = new THREE.Group();
const carBodyContainer = new THREE.Group(); // Sub-group for tilt/roll
car.add(carBodyContainer);

const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 8), 
    new THREE.MeshStandardMaterial({ color: 0xff4757, metalness: 0.6, roughness: 0.4 })
);
body.position.y = 1.0;
body.castShadow = true;
carBodyContainer.add(body);

const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
);
cabin.position.set(0, 2.0, -0.5);
carBodyContainer.add(cabin);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e });
[ [2.1, 0.9, 2.5], [-2.1, 0.9, 2.5], [2.1, 0.9, -2.5], [-2.1, 0.9, -2.5] ].forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    carBodyContainer.add(w); // Wheels tilt with the body
    wheels.push(w);
});

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
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

    // Physics
    if (keys["w"]) speed += 55 * delta;
    if (keys["s"]) speed -= 80 * delta;
    speed *= 0.988; // Slightly less friction for mountain coasting
    speed = Math.max(0, Math.min(160, speed));

    const turnFactor = (speed / 160) + 0.6;
    if (keys["a"]) {
        car.rotation.y += 2.0 * turnFactor * delta;
        carBodyContainer.rotation.z = THREE.MathUtils.lerp(carBodyContainer.rotation.z, 0.15, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= 2.0 * turnFactor * delta;
        carBodyContainer.rotation.z = THREE.MathUtils.lerp(carBodyContainer.rotation.z, -0.15, 0.1);
    } else {
        carBodyContainer.rotation.z = THREE.MathUtils.lerp(carBodyContainer.rotation.z, 0, 0.1);
    }

    car.translateZ(speed * delta);
    wheels.forEach(w => w.rotation.x -= speed * delta * 2);

    // --- HEIGHT & SLOPE TRACKING ---
    // Maps Z position (-5000 to 10000) to curve progress (0.0 to 1.0)
    const progress = (car.position.z + 5000) / 15000;
    
    if (progress >= 0 && progress <= 1) {
        const targetPos = curve.getPointAt(progress);
        const tangent = curve.getTangentAt(progress);

        // Smoothly adjust car height to match road
        car.position.y = THREE.MathUtils.lerp(car.position.y, targetPos.y, 0.2);

        // Adjust Pitch (X rotation) to face up/down hills
        const slopeAngle = -Math.atan2(tangent.y, tangent.z);
        car.rotation.x = THREE.MathUtils.lerp(car.rotation.x, slopeAngle, 0.1);
    }

    // World Loop
    if (car.position.z > 9500) car.position.z = -4800;
    if (car.position.z < -4900) car.position.z = 9400;

    // Smooth Camera
    camera.fov = 60 + (speed * 0.12);
    camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(0, 8, -22).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    // Update UI
    const kmh = Math.round(speed * 2.5);
    speedValEl.innerText = kmh;
    speedBarEl.style.width = `${(speed / 160) * 100}%`;

    composer.render();
}

// Start
setTimeout(() => { loaderEl.style.display = "none"; }, 1000);
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
