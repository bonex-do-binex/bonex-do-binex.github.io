import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050611);
scene.fog = new THREE.FogExp2(0x050611, 0.0004);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000);

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- SKY & IBL ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();
const sunSettings = { elevation: 8, azimuth: 160 };
const pmremGenerator = new THREE.PMREMGenerator(renderer);

function updateSky() {
    const phi = THREE.MathUtils.degToRad(90 - sunSettings.elevation);
    const theta = THREE.MathUtils.degToRad(sunSettings.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms["sunPosition"].value.copy(sun);
    scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSky();

// --- LIGHTING (Global) ---
const dirLight = new THREE.DirectionalLight(0x99bbff, 2.0);
dirLight.position.copy(sun).multiplyScalar(600);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x202234, 0.6));

// --- WORLD ASSETS ---
function createAsphaltMaterial() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 160000; i++) {
        const v = Math.random() * 255;
        ctx.fillStyle = `rgba(${v},${v},${v},0.12)`;
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 200);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, color: 0x181818 });
}

const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 20000), createAsphaltMaterial());
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// --- FOREST & CITY ---
const treeGeo = new THREE.CylinderGeometry(0, 4, 15, 5);
const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a3311 });
const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, 1200);
const dummy = new THREE.Object3D();
for (let i = 0; i < 1200; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    dummy.position.set(side * (30 + Math.random() * 200), 7.5, (Math.random() - 0.5) * 10000);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(treeMesh);

// --- STREETLIGHTS (FIXED) ---
// We use Emissive Intensity + Bloom to simulate light instead of hundreds of SpotLights
const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 8);
const lampGeo = new THREE.SphereGeometry(0.25, 10, 10);
const lampMat = new THREE.MeshStandardMaterial({ 
    color: 0xfff2c0, 
    emissive: 0xfff2c0, 
    emissiveIntensity: 5 // This triggers the Bloom effect
});

for (let i = 0; i < 90; i++) {
    const z = -9000 + i * 220;
    [-14, 14].forEach(x => {
        const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pole.position.set(x, 3.5, x > 0 ? z + 110 : z);
        const bulb = new THREE.Mesh(lampGeo, lampMat);
        bulb.position.set(x > 0 ? x + 1.6 : x - 1.6, 6.3, x > 0 ? z + 110 : z);
        scene.add(pole, bulb);
    });
}

// --- CAR ---
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 9.5), new THREE.MeshPhysicalMaterial({ color: 0x990000, metalness: 0.8, clearcoat: 1.0 }));
body.position.y = 0.9;
car.add(body);

// Functional Car Lights (Only 2 SpotLights = No Crash)
const headL = new THREE.SpotLight(0x88ccff, 5, 80, Math.PI/6);
headL.position.set(1.5, 1, 4.5);
headL.target.position.set(1.5, 0, 30);
car.add(headL, headL.target);

const headR = headL.clone();
headR.position.x = -1.5;
headR.target.position.x = -1.5;
car.add(headR, headR.target);

const underglow = new THREE.PointLight(0x00f2ff, 10, 15);
underglow.position.y = 0.4;
car.add(underglow);

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
composer.addPass(bloom);

// --- ANIMATION ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const speedCounter = document.getElementById("speedCounter");
const loading = document.getElementById("loading");
if(loading) loading.style.display = 'none';

function animate() {
    requestAnimationFrame(animate);
    if (keys["w"]) speed += 0.4;
    if (keys["s"]) speed -= 0.6;
    speed *= 0.98;

    if (keys["a"]) car.rotation.y += 0.002 * speed;
    if (keys["d"]) car.rotation.y -= 0.002 * speed;

    car.translateZ(speed * 0.1);

    const camTarget = car.position.clone().add(new THREE.Vector3(0, 6, -18).applyQuaternion(car.quaternion));
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1.5, car.position.z);

    if (speedCounter) speedCounter.innerText = Math.abs(Math.round(speed * 3));
    composer.render();
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
