import * as THREE from "three";

export function createMap(scene) {
    const mapGroup = new THREE.Group();

    // 1. PATH DEFINITION
    const points = [];
    for (let i = 0; i < 100; i++) {
        points.push(new THREE.Vector3(
            Math.sin(i * 0.3) * 60,  
            Math.sin(i * 0.1) * 30,  
            i * 150 - 5000           
        ));
    }
    const curve = new THREE.CatmullRomCurve3(points);

    // Generate Frenet Frames to keep the road surface "Up"
    const extrudeFrames = curve.computeFrenetFrames(600, false);

    // 2. ROAD GEOMETRY
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
        frames: extrudeFrames 
    };

    const roadGeo = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    mapGroup.add(roadMesh);

    // 3. CENTER LINE
    const lineShape = new THREE.Shape();
    lineShape.moveTo(-0.5, 0.1);
    lineShape.lineTo(0.5, 0.1);
    lineShape.lineTo(0.5, 0.05);
    lineShape.lineTo(-0.5, 0.05);

    const lineGeo = new THREE.ExtrudeGeometry(lineShape, extrudeSettings);
    const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mapGroup.add(lineMesh);

    // 4. ENVIRONMENT
    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -100;
    mapGroup.add(ground);

    scene.add(mapGroup);
    return { mapGroup, curve }; 
}
