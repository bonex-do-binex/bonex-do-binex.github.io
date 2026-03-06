import * as THREE from "three";

export function createMap(scene) {
    const mapGroup = new THREE.Group();

    // --- 1. THE PATH LOGIC ---
    const points = [];
    for (let i = 0; i < 100; i++) {
        points.push(new THREE.Vector3(
            Math.sin(i * 0.3) * 60,  
            Math.sin(i * 0.1) * 30,  
            i * 150 - 5000           
        ));
    }
    const curve = new THREE.CatmullRomCurve3(points);

    // Compute frames once to reuse for road and line
    // This keeps the "up" vector consistent
    const extrudeFrames = curve.computeFrenetFrames(600, false);

    // --- 2. THE ROAD ---
    // Swapped coordinates so the width is on the X axis and thickness is on the Y
    const roadShape = new THREE.Shape();
    roadShape.moveTo(-25, 0);
    roadShape.lineTo(25, 0);
    roadShape.lineTo(25, -0.5); 
    roadShape.lineTo(-25, -0.5);
    roadShape.lineTo(-25, 0);

    const extrudeSettings = {
        steps: 600,
        bevelEnabled: false,
        extrudePath: curve,
        frames: extrudeFrames // Prevents the road from flipping sideways
    };

    const roadGeo = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
    const roadMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.8,
        flatShading: false 
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    mapGroup.add(roadMesh);

    // --- 3. THE CENTER LINE ---
    // Raised slightly (0.1) above the road surface to prevent Z-fighting
    const lineShape = new THREE.Shape();
    lineShape.moveTo(-0.5, 0.1);
    lineShape.lineTo(0.5, 0.1);
    lineShape.lineTo(0.5, 0.05);
    lineShape.lineTo(-0.5, 0.05);

    const lineGeo = new THREE.ExtrudeGeometry(lineShape, extrudeSettings);
    const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mapGroup.add(lineMesh);

    // --- 4. LANDSCAPE ---
    const groundGeo = new THREE.PlaneGeometry(10000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -100; // Lowered to ensure it stays below the road's lowest dip
    mapGroup.add(ground);

    // --- 5. SCENERY ---
    const mountGeo = new THREE.ConeGeometry(80, 250, 4);
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x3d405b });
    const treeTrunkGeo = new THREE.CylinderGeometry(1, 1, 5);
    const treeLeavesGeo = new THREE.ConeGeometry(6, 15, 8);

    for (let i = 0; i < 120; i++) {
        const t = Math.random();
        const pos = curve.getPoint(t);
        const side = Math.random() > 0.5 ? 1 : -1;

        if (Math.random() > 0.4) {
            const mount = new THREE.Mesh(mountGeo, mountMat);
            // Mountains placed further out
            mount.position.set(pos.x + (side * (300 + Math.random() * 200)), pos.y - 50, pos.z);
            mount.rotation.y = Math.random() * Math.PI;
            mapGroup.add(mount);
        }

        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(treeTrunkGeo, new THREE.MeshStandardMaterial({ color: 0x463f3a }));
        const leaves = new THREE.Mesh(treeLeavesGeo, new THREE.MeshStandardMaterial({ color: 0x081c15 }));
        leaves.position.y = 8;
        tree.add(trunk, leaves);
        // Trees placed closer to the road edge
        tree.position.set(pos.x + (side * (40 + Math.random() * 40)), pos.y, pos.z);
        mapGroup.add(tree);
    }

    // --- 6. TIRE SMOKE PARTICLES ---
    const smokeGroup = new THREE.Group();
    const smokeGeo = new THREE.SphereGeometry(0.5, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    
    const smokeParticles = [];
    for(let i = 0; i < 50; i++) {
        const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
        p.visible = false;
        p.userData = { life: 0 };
        smokeGroup.add(p);
        smokeParticles.push(p);
    }
    scene.add(smokeGroup);

    scene.add(mapGroup);
    
    return { mapGroup, curve, smokeParticles }; 
}
