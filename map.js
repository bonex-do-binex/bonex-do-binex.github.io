import * as THREE from "three";

export function createMap(scene) {
    const mapGroup = new THREE.Group();

    // --- GREEN FLOOR ---
    const groundGeo = new THREE.PlaneGeometry(10000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x2d6a4f, // Deep forest green
        roughness: 0.8 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // --- MOUNTAINS ---
    const mountGeo = new THREE.ConeGeometry(40, 100, 4); // Pyramidal mountains
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x4a4e69 });

    for (let i = 0; i < 80; i++) {
        const mount = new THREE.Mesh(mountGeo, mountMat);
        const side = Math.random() > 0.5 ? 1 : -1;
        mount.position.set(
            side * (150 + Math.random() * 300), 
            40, 
            (Math.random() - 0.5) * 10000
        );
        mount.scale.set(2, 1 + Math.random() * 2, 2);
        mount.castShadow = true;
        mapGroup.add(mount);
    }

    // --- TREES ---
    const trunkGeo = new THREE.CylinderGeometry(1, 1, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x463f3a });
    const leavesGeo = new THREE.ConeGeometry(5, 12, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x081c15 });

    for (let i = 0; i < 300; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        
        leaves.position.y = 7;
        tree.add(trunk);
        tree.add(leaves);

        const side = Math.random() > 0.5 ? 1 : -1;
        tree.position.set(
            side * (50 + Math.random() * 100), 
            2.5, 
            (Math.random() - 0.5) * 10000
        );
        mapGroup.add(tree);
    }

    // --- ZIGZAG ROAD LOGIC ---
    // Instead of one long road, we create segments that shift
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const segmentWidth = 50;
    const segmentLength = 200;

    for (let i = 0; i < 50; i++) {
        const roadSeg = new THREE.Mesh(new THREE.PlaneGeometry(segmentWidth, segmentLength + 2), roadMat);
        roadSeg.rotation.x = -Math.PI / 2;
        
        // This creates a zigzag offset based on the segment index
        const zPos = (i * segmentLength) - 5000;
        const xOffset = Math.sin(i * 0.5) * 40; // The ZigZag math
        
        roadSeg.position.set(xOffset, 0.05, zPos);
        mapGroup.add(roadSeg);
        
        // Add white center lines
        const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 20), new THREE.MeshBasicMaterial({color: 0xffffff}));
        line.rotation.x = -Math.PI / 2;
        line.position.set(xOffset, 0.07, zPos);
        mapGroup.add(line);
    }

    scene.add(mapGroup);
    return mapGroup;
}
