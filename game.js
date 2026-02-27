console.log("Forza WebGL - Version: v1");

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x050611, 0.0005);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000);

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- FRUSTUM FOR OCCLUSION ---
const frustum = new THREE.Frustum();
const cameraViewProjectionMatrix = new THREE.Matrix4();

// --- SKY ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);
const sun = new THREE.Vector3();
const pmremGenerator = new THREE.PMREMGenerator(renderer);

function updateSky() {
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(88), THREE.MathUtils.degToRad(165));
    sky.material.uniforms["sunPosition"].value.copy(sun);
    scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSky();

// --- ULTRA ASPHALT (v1) ---
function createUltraAsphalt() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048; canvas.height = 2048;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, 2048, 2048);
    // Add grain and noise for grit
    for (let i = 0; i < 400000; i++) {
        const v = Math.random() * 40;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * 2048, Math.random() * 2048, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 400);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    return new THREE.MeshPhysicalMaterial({
        map: tex,
        roughness: 0.15,
        metalness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0
    });
}

const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 20000), createUltraAsphalt());
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// --- DYNAMIC SCENERY CONTAINER ---
const buildings = [];
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
const buildMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1 });

for (let i = 0; i < 400; i++) {
    const h = 60 + Math.random() * 300;
    const w = 30 + Math.random() * 80;
    const b = new THREE.Mesh(buildGeo, buildMat);
    b.scale.set(w, h, w);
    const side = Math.random() > 0.5 ? 1 : -1;
    b.position.set(side * (300 + Math.random() * 800), h / 2, (Math.random() - 0.5) * 20000);
    scene.add(b);
    buildings.push(b);
}

// --- CAR (v1 ENHANCED) ---
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 9.5), new THREE.MeshPhysicalMaterial({ 
    color: 0xcc0000, metalness: 1.0, roughness: 0.1, clearcoat: 1.0 
}));
body.position.y = 0.9;
body.castShadow = true;
car.add(body);

const headL = new THREE.SpotLight(0xffffff, 15, 120, Math.PI / 6, 0.4);
headL.position.set(1.5, 1, 4.5);
headL.target.position.set(1.5, 0, 50);
car.add(headL, headL.target);
const headR = headL.clone();
headR.position.x = -1.5;
headR.target.position.x = -1.5;
car.add(headR, headR.target);

const underglow = new THREE.PointLight(0x00f2ff, 15, 20);
underglow.position.y = 0.4;
car.add(underglow);
scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.8);
composer.addPass(bloom);

// --- INPUTS ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Physics
    if (keys["w"]) speed += 0.4;
    if (keys["s"]) speed -= 0.7;
    speed = Math.max(0, speed * 0.985);
    if (keys["a"]) car.rotation.y += 0.002 * speed;
    if (keys["d"]) car.rotation.y -= 0.002 * speed;
    car.translateZ(speed * 0.1);

    // RENDERING LOGIC: Loading stuff only in front (Occlusion/Frustum)
    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    buildings.forEach(b => {
        // Only show if in front of camera frustum
        b.visible = frustum.intersectsObject(b);
    });

    // Camera Dynamics
    const camTarget = car.position.clone().add(new THREE.Vector3(0, 6 + (speed * 0.02), -20 - (speed * 0.15)).applyQuaternion(car.quaternion));
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
    camera.fov = 55 + (speed * 0.25);
    camera.updateProjectionMatrix();

    document.getElementById("speedCounter").innerText = Math.round(speed * 4);
    composer.render();
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
