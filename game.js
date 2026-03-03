console.log("Forza WebGL – Cartoon Low‑Poly Edition");

// IMPORTS
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// UI
const ui = document.createElement("div");
ui.innerHTML = `
    <div id="loader" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;justify-content:center;align-items:center;color:white;font-family:sans-serif;z-index:100;">LOADING...</div>
    <div style="position:fixed;bottom:30px;right:50px;color:white;font-family:Arial;text-align:right;z-index:10;pointer-events:none;">
        <span id="speedVal" style="font-size:90px;font-style:italic;font-weight:bold;text-shadow:2px 2px #000;">0</span>
        <span style="font-size:24px;font-weight:bold;">KM/H</span>
    </div>
`;
document.body.appendChild(ui);

const loaderEl = document.getElementById("loader");
const speedValEl = document.getElementById("speedVal");

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbde0fe);
scene.fog = new THREE.Fog(0xbde0fe, 50, 15000);

// CAMERA
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// LIGHTS
scene.add(new THREE.HemisphereLight(0xfff1e6, 0x9bf6ff, 0.8));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 300, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun);

// GROUND
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0xa3d977, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ROAD
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.4 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
scene.add(road);

// DASHED LINE
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = -10000; i < 10000; i += 80) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2, 20), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.03, i);
    scene.add(line);
}

// CARTOON TREES
function createTree() {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.5, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x8d5524 })
    );
    trunk.position.y = 4;
    trunk.castShadow = true;

    const top = new THREE.Mesh(
        new THREE.SphereGeometry(5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x70c36d })
    );
    top.position.y = 10;
    top.castShadow = true;

    tree.add(trunk, top);
    return tree;
}

for (let i = 0; i < 200; i++) {
    const t = createTree();
    const side = Math.random() > 0.5 ? 1 : -1;
    t.position.set(side * (50 + Math.random() * 150), 0, (Math.random() - 0.5) * 15000);
    t.scale.set(1.2, 1.2, 1.2);
    scene.add(t);
}

// CARTOON HOUSES
function createHouse() {
    const house = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(12, 8, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd6a5 })
    );
    base.position.y = 4;

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(10, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffb5e8 })
    );
    roof.position.y = 10;
    roof.rotation.y = Math.PI / 4;

    house.add(base, roof);
    return house;
}

for (let i = 0; i < 20; i++) {
    const h = createHouse();
    h.position.set((Math.random() - 0.5) * 2000, 0, (Math.random() - 0.5) * 15000);
    h.scale.set(1.5, 1.5, 1.5);
    scene.add(h);
}

// CARTOON ROCKS
function createRock() {
    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(4),
        new THREE.MeshStandardMaterial({ color: 0xcdb4db })
    );
    rock.castShadow = true;
    return rock;
}

for (let i = 0; i < 40; i++) {
    const r = createRock();
    r.position.set((Math.random() - 0.5) * 2000, 0, (Math.random() - 0.5) * 15000);
    scene.add(r);
}

// CARTOON CAR
const car = new THREE.Group();

// Body
const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.5, 7),
    new THREE.MeshStandardMaterial({ color: 0xff6b6b })
);
body.position.y = 1.5;
body.castShadow = true;
car.add(body);

// Roof
const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.2, 3),
    new THREE.MeshStandardMaterial({ color: 0xffd6a5 })
);
roof.position.y = 2.6;
roof.castShadow = true;
car.add(roof);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 1, 12);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42 });

const wheelPos = [
    [2, 0.8, 2.5],
    [-2, 0.8, 2.5],
    [2, 0.8, -2.5],
    [-2, 0.8, -2.5]
];

const wheels = [];

wheelPos.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    w.castShadow = true;
    car.add(w);
    wheels.push(w);
});

scene.add(car);

// POST PROCESSING
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

// CONTROLS
let speed = 0;
const maxSpeed = 60;
const keys = {};

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// LOOP
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (keys["w"]) speed += 25 * delta;
    if (keys["s"]) speed -= 35 * delta;

    speed *= 0.985;
    speed = Math.max(0, Math.min(maxSpeed, speed));

    const steer = speed / maxSpeed;

    if (keys["a"]) car.rotation.y += 1.5 * steer * delta;
    if (keys["d"]) car.rotation.y -= 1.5 * steer * delta;

    car.translateZ(speed * delta);

    wheels.forEach(w => w.rotation.x -= speed * delta * 3);

    if (car.position.z > 9000) car.position.z = -9000;
    if (car.position.z < -9000) car.position.z = 9000;

    const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
    camera.position.lerp(car.position.clone().add(offset), 0.08);
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

    camera.fov = THREE.MathUtils.clamp(60 + speed * 0.4, 60, 90);
    camera.updateProjectionMatrix();

    speedValEl.innerText = Math.round(speed * 3.6);

    composer.render();
}

animate();

// RESIZE
window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
});
