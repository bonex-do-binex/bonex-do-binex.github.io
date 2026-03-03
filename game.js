console.log("Forza WebGL - Low Poly Edition");

// THREE.JS IMPORTS
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 15000);

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
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x2e4f1f, 0.6));

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(200, 300, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun);

// GROUND
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x3fa63f, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ROAD
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 20000),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
scene.add(road);

// MODEL LOADER
const loader = new GLTFLoader();

// CAR
let car = null;

loader.load("/models/car.glb", gltf => {
    car = gltf.scene;
    car.scale.set(1.5, 1.5, 1.5);
    car.position.set(0, 0, 0);

    car.traverse(o => {
        o.castShadow = true;
        o.receiveShadow = true;
    });

    scene.add(car);
});

// GENERIC MODEL SPAWNER
function spawnModel(path, x, z, scale = 1) {
    loader.load(path, gltf => {
        const base = gltf.scene;

        const obj = base.clone(true);
        obj.position.set(x, 0, z);
        obj.scale.set(scale, scale, scale);

        obj.traverse(o => {
            o.castShadow = true;
            o.receiveShadow = true;
        });

        scene.add(obj);
    });
}

// TREES
loader.load("/models/tree.glb", gltf => {
    const treeBase = gltf.scene;

    for (let i = 0; i < 200; i++) {
        const clone = treeBase.clone(true);

        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (50 + Math.random() * 150);
        const z = (Math.random() - 0.5) * 15000;

        clone.position.set(x, 0, z);
        clone.scale.set(3, 3, 3);

        clone.traverse(o => {
            o.castShadow = true;
            o.receiveShadow = true;
        });

        scene.add(clone);
    }
});

// PROPS
spawnModel("/models/house.glb", -120, -500, 4);
spawnModel("/models/rock.glb", 80, 200, 2);
spawnModel("/models/sign.glb", 10, 300, 1.2);

// POST PROCESSING
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 0.85));

// CONTROLS
let speed = 0;
const maxSpeed = 80;
const keys = {};

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// LOOP
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (car) {
        if (keys["w"] || keys["arrowup"]) speed += 30 * delta;
        if (keys["s"] || keys["arrowdown"]) speed -= 40 * delta;

        speed *= 0.985;
        speed = Math.max(0, Math.min(maxSpeed, speed));

        const steering = speed / maxSpeed;

        if (keys["a"] || keys["arrowleft"]) car.rotation.y += 1.5 * steering * delta;
        if (keys["d"] || keys["arrowright"]) car.rotation.y -= 1.5 * steering * delta;

        car.translateZ(speed * delta);

        if (car.position.z > 9000) car.position.z = -9000;
        if (car.position.z < -9000) car.position.z = 9000;

        const offset = new THREE.Vector3(0, 10, -25).applyQuaternion(car.quaternion);
        const targetPos = car.position.clone().add(offset);
        camera.position.lerp(targetPos, 0.08);
        camera.lookAt(car.position.x, car.position.y + 2, car.position.z);

        camera.fov = THREE.MathUtils.clamp(60 + speed * 0.4, 60, 95);
        camera.updateProjectionMatrix();
    }

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
