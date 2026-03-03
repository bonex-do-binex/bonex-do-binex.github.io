import * as THREE from "three";

export function createMap(scene) {
    const mapGroup = new THREE.Group();

    // --- 1. THE PATH LOGIC (Smooth Curves + Elevation) ---
    const points = [];
    for (let i = 0; i < 100; i++) {
        points.push(new THREE.Vector3(
            Math.sin(i * 0.3) * 60,  // Smooth ZigZag X
            Math.sin(i * 0.1) * 30,  // Up and Down Y (Mountains)
            i * 150 - 5000           // Forward Z
        ));
    }
    const curve = new THREE.CatmullRomCurve3(points);

    // --- 2. THE ROAD (Extrude Geometry) ---
    const roadShape = new THREE.Shape();
    roadShape.moveTo(-25, 0);
    roadShape.lineTo(25, 0); // 50 units wide

    const extrudeSettings = {
        steps: 400,
        bevelEnabled: false,
        extrudePath: curve
    };

    const roadGeo = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    mapGroup.add(roadMesh);

    // --- 3. THE CENTER LINE ---
    const lineGeo = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0.1), new THREE.Vector2(0.5, 0.1)]), extrudeSettings);
    const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mapGroup.add(lineMesh);

    // --- 4. LANDSCAPE (Green Ground) ---
    const groundGeo = new THREE.PlaneGeometry(10000, 15000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50; // Place below the lowest valley
    mapGroup.add(ground);

    // --- 5. SCENERY (Mountains & Trees) ---
    const mountGeo = new THREE.ConeGeometry(80, 200, 4);
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x4a4e69 });

    for (let i = 0; i < 100; i++) {
        // Get a point on the curve to place things near the road
        const t = Math.random();
        const pos = curve.getPoint(t);
        const side = Math.random() > 0.5 ? 1 : -1;

        // Mountains
        const mount = new THREE.Mesh(mountGeo, mountMat);
        mount.position.set(pos.x + (side * 400), pos.y - 20, pos.z);
        mount.scale.y = 1 + Math.random() * 2;
        mapGroup.add(mount);

        // Trees
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5), new THREE.MeshStandardMaterial({ color: 0x463f3a }));
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(6, 15, 8), new THREE.MeshStandardMaterial({ color: 0x081c15 }));
        leaves.position.y = 8;
        tree.add(trunk);
        tree.add(leaves);
        
        tree.position.set(pos.x + (side * (60 + Math.random() * 50)), pos.y, pos.z + (Math.random() - 0.5) * 100);
        mapGroup.add(tree);
    }

    scene.add(mapGroup);
    return { mapGroup, curve }; // Return the curve so the car can find the floor
}
