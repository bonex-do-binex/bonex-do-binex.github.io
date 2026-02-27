console.log("Forza WebGL - Version: v2 (Ultra)");

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- SCENE & SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.0008);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 30000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambient);

// --- PROCEDURAL TEXTURES ---
function createRoadTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 1024, 1024);
    // Road wear and noise
    for(let i=0; i<5000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.05})`;
        ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }
    // Lateral Lines (Neon)
    ctx.strokeStyle = "#00f2ff";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, 1024, 1024);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 100);
    return tex;
}

// --- WORLD ELEMENTS ---
// 1. Wet Road
const roadGeo = new THREE.PlaneGeometry(60, 20000);
const roadMat = new THREE.MeshPhysicalMaterial({ 
    map: createRoadTexture(),
    roughness: 0.1, 
    metalness: 0.5,
    clearcoat: 1.0 
});
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
scene.add(road);

// 2. Instanced Buildings (Performance Boost)
const buildCount = 600;
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
const buildMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 });
const city = new THREE.InstancedMesh(buildGeo, buildMat, buildCount);
const matrix = new THREE.Matrix4();

for (let i = 0; i < buildCount; i++) {
    const h = 50 + Math.random() * 400;
    const w = 40 + Math.random() * 100;
    const side = Math.random() > 0.5 ? 1 : -1;
    matrix.makeScale(w, h, w);
    matrix.setPosition(side * (250 + Math.random() * 600), h / 2, (Math.random() - 0.5) * 20000);
    city.setMatrixAt(i, matrix);
}
scene.add(city);

// 3. Instanced Grass / Vegetation
const grassCount = 2000;
const grassGeo = new THREE.CylinderGeometry(0.1, 0.5, 4, 3);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x004411 });
const meadow = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);

for (let i = 0; i < grassCount; i++) {
    const x = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 100);
    const z = (Math.random() - 0.5) * 20000;
    matrix.makeScale(1, 0.5 + Math.random(), 1);
    matrix.setPosition(x, 1, z);
    meadow.setMatrixAt(i, matrix);
}
scene.add(meadow);

// --- CAR ---
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 9), new THREE.MeshPhysicalMaterial({ color: 0xff0033, metalness: 1, roughness: 0.1, clearcoat: 1 }));
body.position.y = 1;
car.add(body);

const headLight = new THREE.SpotLight(0xffffff, 50, 200, 0.5, 0.5);
headLight.position.set(0, 1.5, 5);
car.add(headLight, headLight.target);
headLight.target.position.set(0, 0, 50);

const tailLight = new THREE.PointLight(0xff0000, 20, 15);
tailLight.position.set(0, 1.5, -5);
car.add(tailLight);

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloom);

// --- PHYSICS & INPUT ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);

    // Dynamic FOV & Physics
    if (keys["w"]) speed += 0.5;
    if (keys["s"]) speed -= 0.8;
    speed = Math.max(0, speed * 0.98);
    
    car.translateZ(speed * 0.1);
    if (keys["a"]) car.rotation.y += 0.02;
    if (keys["d"]) car.rotation.y -= 0.02;

    // Camera follow with "Elastic" feel
    const offset = new THREE.Vector3(0, 8 + (speed * 0.05), -25 - (speed * 0.2)).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(offset), 0.1);
    camera.lookAt(car.position);
    camera.fov = 60 + (speed * 0.3);
    camera.updateProjectionMatrix();

    // Loop road and scenery for "Infinite" feel
    if (Math.abs(car.position.z) > 8000) car.position.z = 0;

    composer.render();
}
animate();

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
};
