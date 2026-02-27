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

// --- SKY & SUN ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);
const sun = new THREE.Vector3();
const pmremGenerator = new THREE.PMREMGenerator(renderer);

function updateSky() {
    const phi = THREE.MathUtils.degToRad(88); // Deep twilight
    const theta = THREE.MathUtils.degToRad(165);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms["sunPosition"].value.copy(sun);
    sky.material.uniforms["turbidity"].value = 20;
    sky.material.uniforms["rayleigh"].value = 3;
    scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSky();

// --- LIGHTING ---
const moonLight = new THREE.DirectionalLight(0x5566ff, 1.2);
moonLight.position.copy(sun).multiplyScalar(500);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x101020, 0.3));

// --- ENHANCED ROAD (WET LOOK) ---
function createEnhancedAsphalt() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 200000; i++) {
        const v = Math.random() * 50;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 400);

    return new THREE.MeshPhysicalMaterial({
        map: tex,
        color: 0x111111,
        roughness: 0.2, // Low roughness = high reflections
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
    });
}

const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 20000), createEnhancedAsphalt());
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// --- SCENERY ---
const treeGeo = new THREE.CylinderGeometry(0, 5, 20, 6);
const treeMat = new THREE.MeshStandardMaterial({ color: 0x051a05 });
const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, 1000);
const dummy = new THREE.Object3D();
for (let i = 0; i < 1000; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    dummy.position.set(side * (45 + Math.random() * 150), 10, (Math.random() - 0.5) * 15000);
    dummy.scale.setScalar(0.8 + Math.random());
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(treeMesh);

// --- STREETLIGHTS (VOLUMETRIC GLOW) ---
const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 8, 8);
const lampMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 15 });

for (let i = 0; i < 80; i++) {
    const z = -8000 + i * 250;
    [-16, 16].forEach(x => {
        const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        pole.position.set(x, 4, x > 0 ? z + 125 : z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), lampMat);
        bulb.position.set(x > 0 ? x - 1.5 : x + 1.5, 7.8, x > 0 ? z + 125 : z);
        scene.add(pole, bulb);
    });
}

// --- CAR ---
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 10), new THREE.MeshPhysicalMaterial({ 
    color: 0xaa0000, metalness: 0.9, roughness: 0.1, clearcoat: 1.0 
}));
body.position.y = 1;
body.castShadow = true;
car.add(body);

// Functional Lights
const headL = new THREE.SpotLight(0xffffff, 10, 150, Math.PI / 6, 0.3);
headL.position.set(1.5, 1, 5);
headL.target.position.set(1.5, 0, 50);
car.add(headL, headL.target);

const headR = headL.clone();
headR.position.x = -1.5;
headR.target.position.x = -1.5;
car.add(headR, headR.target);

const underglow = new THREE.PointLight(0x00ffff, 15, 20);
underglow.position.y = 0.5;
car.add(underglow);

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloom);

// --- ANIMATION ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function animate() {
    requestAnimationFrame(animate);
    if (keys["w"]) speed += 0.5;
    if (keys["s"]) speed -= 0.8;
    speed = Math.max(0, speed * 0.985);

    if (keys["a"]) car.rotation.y += 0.001 * speed;
    if (keys["d"]) car.rotation.y -= 0.001 * speed;

    car.translateZ(speed * 0.1);

    // Speed-based Camera Effects
    const shake = (Math.random() - 0.5) * (speed * 0.01); 
    const camTarget = car.position.clone().add(new THREE.Vector3(shake, 6 + (speed * 0.02), -20 - (speed * 0.1)).applyQuaternion(car.quaternion));
    
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
    camera.fov = 55 + (speed * 0.2); 
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
