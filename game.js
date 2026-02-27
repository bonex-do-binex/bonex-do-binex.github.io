import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050611);
scene.fog = new THREE.FogExp2(0x050611, 0.0004);

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
);

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});
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
const sunSettings = { elevation: 8, azimuth: 160 }; // Night–dawn vibe

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

function updateSkyAndReflections() {
    const phi = THREE.MathUtils.degToRad(90 - sunSettings.elevation);
    const theta = THREE.MathUtils.degToRad(sunSettings.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);

    const u = sky.material.uniforms;
    u["sunPosition"].value.copy(sun);
    u["turbidity"].value = 10;
    u["rayleigh"].value = 2;
    u["mieCoefficient"].value = 0.004;
    u["mieDirectionalG"].value = 0.8;

    scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSkyAndReflections();

// --- LIGHTING ---
const dirLight = new THREE.DirectionalLight(0x99bbff, 2.0);
dirLight.position.copy(sun).multiplyScalar(600);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(4096, 4096);
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 1500;
dirLight.shadow.camera.left = -150;
dirLight.shadow.camera.right = 150;
dirLight.shadow.camera.top = 150;
dirLight.shadow.camera.bottom = -150;
dirLight.shadow.bias = -0.0004;
scene.add(dirLight);

scene.add(new THREE.AmbientLight(0x202234, 0.6));

const hemi = new THREE.HemisphereLight(0x3344ff, 0x050510, 0.5);
scene.add(hemi);

// --- PROCEDURAL ASPHALT MATERIAL ---
function createAsphaltMaterial() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
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
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    return new THREE.MeshStandardMaterial({
        map: tex,
        roughnessMap: tex,
        roughness: 0.75,
        metalness: 0.15,
        color: 0x181818
    });
}

// --- WORLD: ROAD, LINES, GRASS ---
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 20000),
    createAsphaltMaterial()
);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Lane markings
const laneMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    emissive: 0xf5f5f5,
    emissiveIntensity: 0.6,
    roughness: 0.4
});
const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 20000),
    laneMat
);
lane.rotation.x = -Math.PI / 2;
lane.position.y = 0.001;
scene.add(lane);

// Side lines
const sideLineGeo = new THREE.PlaneGeometry(0.3, 20000);
const sideLineMat = new THREE.MeshStandardMaterial({
    color: 0xfff2c0,
    emissive: 0xfff2c0,
    emissiveIntensity: 0.4,
    roughness: 0.5
});
const leftLine = new THREE.Mesh(sideLineGeo, sideLineMat);
leftLine.rotation.x = -Math.PI / 2;
leftLine.position.set(-19.5, 0.001, 0);
scene.add(leftLine);

const rightLine = leftLine.clone();
rightLine.position.x = 19.5;
scene.add(rightLine);

// Grass
const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({
        color: 0x1f3a1b,
        roughness: 1,
        metalness: 0
    })
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.25;
grass.receiveShadow = true;
scene.add(grass);

// --- FOREST (INSTANCED TREES) ---
const treeGeo = new THREE.CylinderGeometry(0, 4, 15, 5);
const treeMat = new THREE.MeshStandardMaterial({
    color: 0x1a3311,
    roughness: 0.9
});
const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, 1200);
treeMesh.castShadow = true;
treeMesh.receiveShadow = true;

const dummy = new THREE.Object3D();
for (let i = 0; i < 1200; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    dummy.position.set(
        side * (30 + Math.random() * 200),
        7.5,
        (Math.random() - 0.5) * 10000
    );
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.7;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(treeMesh);

// --- CITY SKYLINE (BUILDINGS) ---
const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 350; i++) {
    const h = 60 + Math.random() * 260;
    const w = 30 + Math.random() * 80;
    const emissiveOn = Math.random() > 0.35;

    const mat = new THREE.MeshStandardMaterial({
        color: 0x050505,
        emissive: emissiveOn ? 0x00c8ff : 0x000000,
        emissiveIntensity: emissiveOn ? 0.3 + Math.random() * 0.8 : 0,
        metalness: 0.9,
        roughness: 0.45
    });

    const b = new THREE.Mesh(buildingGeo, mat);
    b.scale.set(w, h, w);
    const side = Math.random() > 0.5 ? 1 : -1;
    b.position.set(
        side * (260 + Math.random() * 900),
        h / 2,
        (Math.random() - 0.5) * 20000
    );
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
}

// --- STREETLIGHTS ---
function createStreetLight() {
    const g = new THREE.Group();

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 7, 8),
        new THREE.MeshStandardMaterial({
            color: 0xb0b0b0,
            roughness: 0.6,
            metalness: 0.4
        })
    );
    pole.position.y = 3.5;
    g.add(pole);

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.12, 0.12),
        new THREE.MeshStandardMaterial({
            color: 0xb0b0b0,
            roughness: 0.6,
            metalness: 0.4
        })
    );
    arm.position.set(0.9, 6.3, 0);
    g.add(arm);

    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            emissive: 0xfff2c0,
            emissiveIntensity: 3
        })
    );
    lamp.position.set(1.6, 6.3, 0);
    g.add(lamp);

    const light = new THREE.SpotLight(0xfff2c0, 2.2, 30, Math.PI / 4, 0.5);
    light.position.set(1.6, 6.3, 0);
    light.target.position.set(1.6, 0.1, 0);
    light.castShadow = true;
    g.add(light, light.target);

    return g;
}

for (let i = 0; i < 90; i++) {
    const z = -9000 + i * 220;
    const left = createStreetLight();
    left.position.set(-14, 0, z);
    const right = createStreetLight();
    right.position.set(14, 0, z + 110);
    scene.add(left, right);
}

// --- CAR ---
const car = new THREE.Group();

// Paint
const paintMat = new THREE.MeshPhysicalMaterial({
    color: 0x990000,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04
});

const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.9, 9.5),
    paintMat
);
body.position.y = 0.9;
body.castShadow = true;
body.receiveShadow = true;
car.add(body);

// Cabin glass
const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0.9,
    roughness: 0.02,
    transparent: true,
    opacity: 0.8
});
const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.9, 4.5),
    glassMat
);
cabin.position.set(0, 1.8, -0.5);
cabin.castShadow = true;
car.add(cabin);

// Underglow
const underglow = new THREE.PointLight(0x00f2ff, 10, 20);
underglow.position.set(0, 0.4, 0);
car.add(underglow);

// Headlights
const headMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0x88ccff,
    emissiveIntensity: 3
});
const headGeo = new THREE.BoxGeometry(0.5, 0.35, 0.15);
[[1.1, 1.0, 4.7], [-1.1, 1.0, 4.7]].forEach(p => {
    const h = new THREE.Mesh(headGeo, headMat);
    h.position.set(...p);
    car.add(h);

    const spot = new THREE.SpotLight(0x88ccff, 2.5, 70, Math.PI / 7, 0.5);
    spot.position.set(p[0], p[1], p[2] + 0.2);
    spot.target.position.set(p[0], p[1] - 0.2, p[2] + 25);
    spot.castShadow = true;
    car.add(spot, spot.target);
});

// Taillights
const tailMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xff0033,
    emissiveIntensity: 2.5
});
const tailGeo = new THREE.BoxGeometry(0.6, 0.35, 0.15);
[[1.1, 1.0, -4.7], [-1.1, 1.0, -4.7]].forEach(p => {
    const t = new THREE.Mesh(tailGeo, tailMat);
    t.position.set(...p);
    car.add(t);
});

// Wheels
const tireGeo = new THREE.TorusGeometry(0.6, 0.3, 16, 32);
const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9
});
const rimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.25
});

const wheelPositions = [
    [2.1, 0.9, 3],
    [-2.1, 0.9, 3],
    [2.1, 0.9, -3],
    [-2.1, 0.9, -3]
];
const wheels = [];

wheelPositions.forEach(pos => {
    const group = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    group.add(tire, rim);
    group.position.set(...pos);
    group.rotation.z = Math.PI / 2;
    group.castShadow = true;
    group.receiveShadow = true;
    car.add(group);
    wheels.push(group);
});

scene.add(car);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.7,
    0.85
);
composer.addPass(bloomPass);

// --- INPUT & GAME STATE ---
let speed = 0;
const keys = {};
window.addEventListener("keydown", e => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", e => (keys[e.key.toLowerCase()] = false));

const speedDisplay = document.getElementById("speedCounter");
const loadingEl = document.getElementById("loading");
if (loadingEl) loadingEl.style.opacity = 0;

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (keys["w"]) speed += 0.45;
    if (keys["s"]) speed -= 0.7;
    speed *= 0.985;

    const steerFactor = 0.003 * Math.max(0.2, 1 - speed / 220);
    if (keys["a"]) car.rotation.y += steerFactor * speed;
    if (keys["d"]) car.rotation.y -= steerFactor * speed;

    car.translateZ(speed * 0.1);
    wheels.forEach(w => (w.rotation.x -= speed * 0.05));

    const baseOffset = new THREE.Vector3(0, 6, -18);
    const speedOffset = new THREE.Vector3(0, speed * 0.02, -(speed * 0.08));
    const finalOffset = baseOffset.clone().add(speedOffset);

    finalOffset.applyQuaternion(car.quaternion);
    const targetCamPos = car.position.clone().add(finalOffset);

    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(car.position.x, car.position.y + 1.6, car.position.z);

    camera.fov = 55 + speed * 0.16;
    camera.fov = THREE.MathUtils.clamp(camera.fov, 55, 95);
    camera.updateProjectionMatrix();

    if (speedDisplay) speedDisplay.innerText = Math.abs(Math.round(speed * 3));

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
