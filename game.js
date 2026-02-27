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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
scene.fog = new THREE.FogExp2(0x02030a, 0.0015);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    15000
);
camera.position.set(0, 8, -20);

// --- LIGHTING & SKY ---
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms["turbidity"].value = 10;
skyUniforms["rayleigh"].value = 2;
skyUniforms["mieCoefficient"].value = 0.005;
skyUniforms["mieDirectionalG"].value = 0.8;

const sunPhi = THREE.MathUtils.degToRad(180);
const sunTheta = THREE.MathUtils.degToRad(80);
const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, sunTheta, sunPhi);
skyUniforms["sunPosition"].value.copy(sunPosition);

const moonLight = new THREE.DirectionalLight(0x99bbff, 1.2);
moonLight.position.copy(sunPosition.clone().multiplyScalar(2000));
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 5000;
moonLight.shadow.camera.left = -200;
moonLight.shadow.camera.right = 200;
moonLight.shadow.camera.top = 200;
moonLight.shadow.camera.bottom = -200;
scene.add(moonLight);

scene.add(new THREE.AmbientLight(0x101020, 0.6));

const fillLight = new THREE.HemisphereLight(0x3344ff, 0x050510, 0.4);
scene.add(fillLight);

// --- ADVANCED CAR MODEL ---
const car = new THREE.Group();

// Chassis
const chassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 1,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.1
});
const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.6, 9),
    chassisMat
);
chassis.castShadow = true;
chassis.receiveShadow = true;
chassis.position.y = 0.8;
car.add(chassis);

// Body
const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xff0033,
    metalness: 0.9,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05
});
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2, 8, 4),
    bodyMat
);
body.rotation.x = Math.PI / 2;
body.rotation.y = Math.PI / 4;
body.position.y = 1.6;
body.scale.set(1, 1, 0.5);
body.castShadow = true;
car.add(body);

// Glass / windshield
const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x222244,
    metalness: 0,
    roughness: 0.05,
    transmission: 0.9,
    transparent: true,
    opacity: 0.9,
    ior: 1.4
});
const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.8, 0.05),
    glassMat
);
windshield.position.set(0, 2.1, 1.2);
windshield.castShadow = true;
car.add(windshield);

// Neon underglow
const underlight = new THREE.PointLight(0x00f2ff, 8, 18);
underlight.position.y = 0.5;
car.add(underlight);

// Headlights
const headlightMat = new THREE.MeshStandardMaterial({
    emissive: 0x88ccff,
    emissiveIntensity: 3,
    color: 0x111111
});
const headlightGeo = new THREE.BoxGeometry(0.4, 0.3, 0.1);
const headlightPositions = [
    [0.9, 1.1, 4.4],
    [-0.9, 1.1, 4.4]
];
headlightPositions.forEach((p) => {
    const m = new THREE.Mesh(headlightGeo, headlightMat);
    m.position.set(...p);
    m.castShadow = false;
    car.add(m);

    const pl = new THREE.SpotLight(0x88ccff, 2, 60, Math.PI / 6, 0.4, 1);
    pl.position.set(p[0], p[1], p[2] + 0.2);
    pl.target.position.set(p[0], p[1] - 0.2, p[2] + 20);
    pl.castShadow = true;
    car.add(pl);
    car.add(pl.target);
});

// Taillights
const tailMat = new THREE.MeshStandardMaterial({
    emissive: 0xff0033,
    emissiveIntensity: 2,
    color: 0x111111
});
const tailGeo = new THREE.BoxGeometry(0.5, 0.3, 0.1);
[
    [0.9, 1.1, -4.4],
    [-0.9, 1.1, -4.4]
].forEach((p) => {
    const t = new THREE.Mesh(tailGeo, tailMat);
    t.position.set(...p);
    car.add(t);
});

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 24);
const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.4,
    roughness: 0.4
});
const wheelPositions = [
    [1.8, 0.7, 2.5],
    [-1.8, 0.7, 2.5],
    [1.8, 0.7, -2.5],
    [-1.8, 0.7, -2.5]
];
const wheels = wheelPositions.map((pos) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...pos);
    w.castShadow = true;
    w.receiveShadow = true;
    car.add(w);
    return w;
});

scene.add(car);

// --- ENVIRONMENT: ROAD, SIDEWALKS, GRASS, TREES ---
// Road
const roadMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.3,
    metalness: 0.2
});
const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 20000), roadMat);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Sidewalks
const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.6,
    metalness: 0.1
});
const sidewalkGeo = new THREE.BoxGeometry(10, 0.4, 20000);
const sidewalkLeft = new THREE.Mesh(sidewalkGeo, sidewalkMat);
sidewalkLeft.position.set(-35, 0.2, 0);
sidewalkLeft.receiveShadow = true;
scene.add(sidewalkLeft);

const sidewalkRight = sidewalkLeft.clone();
sidewalkRight.position.x = 35;
scene.add(sidewalkRight);

// Grass
const grassMat = new THREE.MeshStandardMaterial({
    color: 0x0b3a1a,
    roughness: 0.9,
    metalness: 0
});
const grassGeo = new THREE.PlaneGeometry(2000, 20000);
const grass = new THREE.Mesh(grassGeo, grassMat);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.01;
grass.receiveShadow = true;
scene.add(grass);

// Trees
function createTree() {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4b2e16, roughness: 0.9 })
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 12, 12),
        new THREE.MeshStandardMaterial({
            color: 0x1c5f2a,
            roughness: 0.8,
            metalness: 0.1
        })
    );
    foliage.position.y = 5;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);

    return tree;
}

for (let i = 0; i < 120; i++) {
    const t1 = createTree();
    const t2 = createTree();

    const z = (Math.random() - 0.5) * 20000;
    t1.position.set(-80 - Math.random() * 40, 0, z);
    t2.position.set(80 + Math.random() * 40, 0, z + Math.random() * 40);

    scene.add(t1, t2);
}

// --- BUILDINGS & STREETLIGHTS ---
// Buildings
const buildGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 400; i++) {
    const h = 40 + Math.random() * 200;
    const w = 20 + Math.random() * 60;
    const emissiveOn = Math.random() > 0.4;
    const bMat = new THREE.MeshStandardMaterial({
        color: 0x080808,
        emissive: emissiveOn ? 0x00f2ff : 0x000000,
        emissiveIntensity: emissiveOn ? 0.3 + Math.random() * 0.7 : 0,
        metalness: 0.8,
        roughness: 0.4
    });
    const b = new THREE.Mesh(buildGeo, bMat);
    b.scale.set(w, h, w);
    const side = Math.random() > 0.5 ? 1 : -1;
    b.position.set(
        side * (120 + Math.random() * 800),
        h / 2,
        (Math.random() - 0.5) * 20000
    );
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
}

// Streetlights
function createStreetLight() {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 })
    );
    pole.position.y = 3;
    pole.castShadow = true;
    group.add(pole);

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 })
    );
    arm.position.set(0.75, 5.5, 0);
    group.add(arm);

    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({
            emissive: 0xfff2c0,
            emissiveIntensity: 3,
            color: 0x222222
        })
    );
    lamp.position.set(1.4, 5.5, 0);
    group.add(lamp);

    const light = new THREE.SpotLight(0xfff2c0, 2, 25, Math.PI / 4, 0.5, 1);
    light.position.set(1.4, 5.5, 0);
    light.target.position.set(1.4, 0.1, 0);
    light.castShadow = true;
    group.add(light);
    group.add(light.target);

    return group;
}

for (let i = 0; i < 80; i++) {
    const z = -9000 + i * 250;
    const left = createStreetLight();
    left.position.set(-15, 0, z);
    const right = createStreetLight();
    right.position.set(15, 0, z + 120);
    scene.add(left, right);
}

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4,
    0.6,
    0.0
);
composer.addPass(bloom);

// --- LOGIC ---
let speed = 0;
const keys = {};
window.onkeydown = (e) => (keys[e.key.toLowerCase()] = true);
window.onkeyup = (e) => (keys[e.key.toLowerCase()] = false);

function animate() {
    requestAnimationFrame(animate);

    if (keys["w"]) speed += 0.35;
    if (keys["s"]) speed -= 0.35;
    speed *= 0.985;

    const steerFactor = 0.0025 * speed;
    if (keys["a"]) car.rotation.y += steerFactor;
    if (keys["d"]) car.rotation.y -= steerFactor;

    car.translateZ(speed * 0.09);
    wheels.forEach((w) => (w.rotation.x += speed * 0.09));

    const goal = new THREE.Vector3(0, 10, -26);
    goal.applyQuaternion(car.quaternion);
    goal.add(car.position);
    camera.position.lerp(goal, 0.08);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    const speedEl = document.getElementById("speed");
    if (speedEl) speedEl.innerText = Math.abs(Math.round(speed * 2));

    composer.render();
}
animate();

// --- RESIZE ---
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
