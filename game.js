import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- ENGINE SETUP ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 15000);

// --- LIGHTING & SKY ---
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);
sky.material.uniforms['sunPosition'].value.set(0, -1, -1); // Night-time vibe

const sun = new THREE.DirectionalLight(0x5555ff, 1.5);
sun.position.set(50, 100, 50);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x111122, 0.5));

// --- ADVANCED CAR MODEL ---
const car = new THREE.Group();

// Lower Chassis
const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.6, 9),
    new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 1, roughness: 0.2 })
);
chassis.position.y = 0.8;
car.add(chassis);

// Body Shell (Sleek Shape)
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2, 8, 4),
    new THREE.MeshPhysicalMaterial({ color: 0xff0033, metalness: 0.8, roughness: 0.1, clearcoat: 1 })
);
body.rotation.x = Math.PI / 2;
body.rotation.y = Math.PI / 4;
body.position.y = 1.5;
body.scale.set(1, 1, 0.5);
car.add(body);

// Neon Underglow
const underlight = new THREE.PointLight(0x00f2ff, 5, 15);
underlight.position.y = 0.5;
car.add(underlight);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
const wheelPositions = [[1.8, 0.7, 2.5], [-1.8, 0.7, 2.5], [1.8, 0.7, -2.5], [-1.8, 0.7, -2.5]];
const wheels = wheelPositions.map(pos => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...pos);
    car.add(w);
    return w;
});

scene.add(car);

// --- ENVIRONMENT: CITY & ROAD ---
// Detailed Road
const roadTex = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.1, metalness: 0.5 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 20000), roadTex);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Procedural Buildings
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 300; i++) {
    const h = 20 + Math.random() * 150;
    const w = 20 + Math.random() * 30;
    const bMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        emissive: 0x00f2ff, 
        emissiveIntensity: Math.random() > 0.8 ? 0.5 : 0 
    });
    const b = new THREE.Mesh(buildGeo, bMat);
    b.scale.set(w, h, w);
    b.position.set(
        (Math.random() - 0.5) * 2000 + (Math.sign(Math.random() - 0.5) * 150),
        h / 2,
        (Math.random() - 0.5) * 10000
    );
    scene.add(b);
}

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.1);
composer.addPass(bloom);

// --- LOGIC ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function animate() {
    requestAnimationFrame(animate);

    // Physics
    if (keys['w']) speed += 0.4;
    if (keys['s']) speed -= 0.4;
    speed *= 0.97; // Drag

    if (keys['a']) car.rotation.y += 0.003 * speed;
    if (keys['d']) car.rotation.y -= 0.003 * speed;

    car.translateZ(speed * 0.1);
    wheels.forEach(w => w.rotation.x += speed * 0.1);

    // Camera follow (Smooth Lerp)
    const goal = new THREE.Vector3(0, 10, -25);
    goal.applyQuaternion(car.quaternion);
    goal.add(car.position);
    camera.position.lerp(goal, 0.1);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    document.getElementById('speed').innerText = Math.abs(Math.round(speed * 2));

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
