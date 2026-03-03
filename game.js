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
        <div style="font-size:14px; letter-spacing:2px; font-weight:bold;">SPEED</div>
        <span id="speedVal" style="font-size:110px; font-style:italic; font-weight:900;">0</span>
        <span style="font-size:24px; font-weight:bold;"> KM/H</span>
        <div style="width:100%; height:8px; background:rgba(0,0,0,0.3); border-radius:4px; margin-top:5px; overflow:hidden;">
            <div id="speedBar" style="width:0%; height:100%; background:#ff4757; transition: width 0.1s;"></div>
        </div>
    </div>
`;
document.body.appendChild(ui);
const speedValEl = document.getElementById("speedVal");
const speedBarEl = document.getElementById("speedBar");

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2ff); // Sky blue
scene.fog = new THREE.FogExp2(0xa2d2ff, 0.0015); // Matches sky color for seamless horizon

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
// Bright sunlight for the green landscape
const ambient = new THREE.AmbientLight(0xffffff, 0.7); 
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(100, 200, 100);
sun.castShadow = true;
// Optimize shadows for large landscape
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
scene.add(sun);

// --- MAP GENERATION ---
// This calls your map.js which now contains the green floor, mountains, and trees
createMap(scene);

// --- CAR ---
const car = new THREE.Group();

// Main Body
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 8), 
    new THREE.MeshStandardMaterial({ color: 0xff4757, metalness: 0.6, roughness: 0.4 })
);
body.position.y = 1.0;
body.castShadow = true;
car.add(body);

// Glass Cabin
const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1, roughness: 0 })
);
cabin.position.set(0, 2.0, -0.5);
car.add(cabin);

// Wheels
const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e });
[ [2.1, 0.9, 2.5], [-2.1, 0.9, 2.5], [2.1, 0.9, -2.5], [-2.1, 0.9, -2.5] ].forEach(p => {
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
// Lower bloom for a more realistic "daylight" feel
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.85);
composer.addPass(bloom);

// --- PHYSICS & CONTROLS ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Movement Logic
    if (keys["w"]) speed += 50 * delta;
    if (keys["s"]) speed -= 70 * delta;
    
    speed *= 0.985; // Friction
    speed = Math.max(0, Math.min(150, speed)); // Top speed 150

    const turnFactor = (speed / 150) + 0.5;
    if (keys["a"]) {
        car.rotation.y += 1.8 * turnFactor * delta;
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0.1, 0.1);
    } else if (keys["d"]) {
        car.rotation.y -= 1.8 * turnFactor * delta;
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -0.1, 0.1);
    } else {
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 0.1);
    }

    car.translateZ(speed * delta);
    
    // Rotate wheels based on speed
    wheels.forEach(w => w.rotation.x -= speed * delta * 1.5);

    // Infinite World Loop (Adjust based on map size in map.js)
    if (car.position.z > 4000) car.position.z = -4000;
    if (car.position.z < -4000) car.position.z = 4000;
    if (car.position.x > 5000) car.position.x = -5000;
    if (car.position.x < -5000) car.position.x = 5000;

    // Smooth Chase Camera
    camera.fov = 60 + (speed * 0.1);
    camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(0, 7, -20).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.12);
    camera.lookAt(car.position.x, car.position.y + 1.5, car.position.z);

    // Update UI
    const kmh = Math.round(speed * 2.5);
    speedValEl.innerText = kmh;
    speedBarEl.style.width = `${(speed / 150) * 100}%`;

    composer.render();
}

// Start Game
setTimeout(() => { loaderEl.style.display = "none"; }, 1000);
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
