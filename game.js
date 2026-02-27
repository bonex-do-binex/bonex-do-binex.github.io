import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ======================================================
// ENGINE SETUP
// ======================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
scene.fog = new THREE.FogExp2(0x02030a, 0.0014);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
);
camera.position.set(0, 8, -20);

// ======================================================
// SKY + LIGHTING
// ======================================================
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyU = sky.material.uniforms;
skyU["turbidity"].value = 12;
skyU["rayleigh"].value = 2;
skyU["mieCoefficient"].value = 0.005;
skyU["mieDirectionalG"].value = 0.8;

const sunPos = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(80),
    THREE.MathUtils.degToRad(180)
);
skyU["sunPosition"].value.copy(sunPos);

const moonLight = new THREE.DirectionalLight(0x99bbff, 1.3);
moonLight.position.copy(sunPos.clone().multiplyScalar(2000));
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 5000;
moonLight.shadow.camera.left = -200;
moonLight.shadow.camera.right = 200;
moonLight.shadow.camera.top = 200;
moonLight.shadow.camera.bottom = -200;
scene.add(moonLight);

scene.add(new THREE.AmbientLight(0x101020, 0.7));
scene.add(new THREE.HemisphereLight(0x3344ff, 0x050510, 0.4));

// ======================================================
// CAR (PROCEDURAL)
// ======================================================
const car = new THREE.Group();

// Chassis
const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.6, 9),
    new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 1,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.1
    })
);
chassis.position.y = 0.8;
chassis.castShadow = true;
car.add(chassis);

// Body
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2, 8, 4),
    new THREE.MeshPhysicalMaterial({
        color: 0xff0033,
        metalness: 0.9,
        roughness: 0.08,
        clearcoat: 1
    })
);
body.rotation.x = Math.PI / 2;
body.rotation.y = Math.PI / 4;
body.position.y = 1.6;
body.scale.set(1, 1, 0.5);
body.castShadow = true;
car.add(body);

// Glass
const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.8, 0.05),
    new THREE.MeshPhysicalMaterial({
        color: 0x222244,
        transmission: 0.9,
        roughness: 0.05,
        transparent: true
    })
);
windshield.position.set(0, 2.1, 1.2);
car.add(windshield);

// Underglow
const underglow = new THREE.PointLight(0x00f2ff, 8, 18);
underglow.position.y = 0.5;
car.add(underglow);

// Headlights
const headlightMat = new THREE.MeshStandardMaterial({
    emissive: 0x88ccff,
    emissiveIntensity: 3
});
[[0.9, 1.1, 4.4], [-0.9, 1.1, 4.4]].forEach(p => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.1), headlightMat);
    h.position.set(...p);
    car.add(h);

    const spot = new THREE.SpotLight(0x88ccff, 2, 60, Math.PI / 6, 0.4);
    spot.position.set(p[0], p[1], p[2] + 0.2);
    spot.target.position.set(p[0], p[1], p[2] + 20);
    car.add(spot, spot.target);
});

// Taillights
const tailMat = new THREE.MeshStandardMaterial({
    emissive: 0xff0033,
    emissiveIntensity: 2
});
[[0.9, 1.1, -4.4], [-0.9, 1.1, -4.4]].forEach(p => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), tailMat);
    t.position.set(...p);
    car.add(t);
});

// Wheels
const wheels = [];
[[1.8, 0.7, 2.5], [-1.8, 0.7, 2.5], [1.8, 0.7, -2.5], [-1.8, 0.7, -2.5]].forEach(pos => {
    const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.6, 24),
        new THREE.MeshStandardMaterial({ color: 0x050505 })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(...pos);
    w.castShadow = true;
    wheels.push(w);
    car.add(w);
});

scene.add(car);

// ======================================================
// ENVIRONMENT: ROAD + SIDEWALKS + GRASS
// ======================================================
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const sidewalkGeo = new THREE.BoxGeometry(10, 0.4, 20000);

const leftWalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
leftWalk.position.set(-35, 0.2, 0);
scene.add(leftWalk);

const rightWalk = leftWalk.clone();
rightWalk.position.x = 35;
scene.add(rightWalk);

// Grass
const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x0b3a1a, roughness: 0.9 })
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.01;
scene.add(grass);

// ======================================================
// TREES (PROCEDURAL)
// ======================================================
function makeTree() {
    const g = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4b2e16 })
    );
    trunk.position.y = 2;
    g.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1c5f2a })
    );
    leaves.position.y = 5;
    g.add(leaves);

    return g;
}

for (let i = 0; i < 150; i++) {
    const t1 = makeTree();
    const t2 = makeTree();
    const z = (Math.random() - 0.5) * 20000;

    t1.position.set(-80 - Math.random() * 40, 0, z);
    t2.position.set(80 + Math.random() * 40, 0, z + Math.random() * 40);

    scene.add(t1, t2);
}

// ======================================================
// BUILDINGS (PROCEDURAL)
// ======================================================
const buildingGeo = new THREE.BoxGeometry(1, 1, 1);

for (let i = 0; i < 450; i++) {
    const h = 40 + Math.random() * 200;
    const w = 20 + Math.random() * 60;
    const emissive = Math.random() > 0.4;

    const b = new THREE.Mesh(
        buildingGeo,
        new THREE.MeshStandardMaterial({
            color: 0x080808,
            emissive: emissive ? 0x00f2ff : 0x000000,
            emissiveIntensity: emissive ? 0.3 + Math.random() * 0.7 : 0
        })
    );

    b.scale.set(w, h, w);
    const side = Math.random() > 0.5 ? 1 : -1;
    b.position.set(
        side * (120 + Math.random() * 800),
        h / 2,
        (Math.random() - 0.5) * 20000
    );

    b.castShadow = true;
    scene.add(b);
}

// ======================================================
// STREETLIGHTS
// ======================================================
function makeLamp() {
    const g = new THREE.Group();

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    pole.position.y = 3;
    g.add(pole);

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    arm.position.set(0.75, 5.5, 0);
    g.add(arm);

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({
            emissive: 0xfff2c0,
            emissiveIntensity: 3
        })
    );
    bulb.position.set(1.4, 5.5, 0);
    g.add(bulb);

    const light = new THREE.SpotLight(0xfff2c0, 2, 25, Math.PI / 4, 0.5);
    light.position.set(1.4, 5.5, 0);
    light.target.position.set(1.4, 0.1, 0);
    g.add(light, light.target);

    return g;
}

for (let i = 0; i < 100; i++) {
    const z = -9000 + i * 200;
    const L = makeLamp();
    L.position.set(-15, 0, z);
    const R = makeLamp();
    R.position.set(15, 0, z + 120);
    scene.add(L, R);
}

// ======================================================
// POST PROCESSING
// ======================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
    new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.4,
        0.6,
        0.0
    )
);

// ======================================================
// GAME LOGIC
// ======================================================
let speed = 0;
const keys = {};
window.onkeydown = e => (keys[e.key.toLowerCase()] = true);
window.onkeyup = e => (keys[e.key.toLowerCase()] = false);

function animate() {
    requestAnimationFrame(animate);

    if (keys["w"]) speed += 0.35;
    if (keys["s"]) speed -= 0.35;
    speed *= 0.985;

    const steer = 0.0025 * speed;
    if (keys["a"]) car.rotation.y += steer;
    if (keys["d"]) car.rotation.y -= steer;

    car.translateZ(speed * 0.09);
    wheels.forEach(w => (w.rotation.x += speed * 0.09));

    const camGoal = new THREE.Vector3(0, 10, -26);
    camGoal.applyQuaternion(car.quaternion);
    camGoal.add(car.position);
    camera.position.lerp(camGoal, 0.08);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    composer.render();
}
animate();

// ======================================================
// RESIZE
// ======================================================
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
