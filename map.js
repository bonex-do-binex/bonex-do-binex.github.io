import * as THREE from "three";

export function createMap(scene) {
    const mapGroup = new THREE.Group();

    // --- PROCEDURAL BUILDINGS ---
    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    
    for (let i = 0; i < 100; i++) {
        // Randomize dimensions
        const w = 10 + Math.random() * 20;
        const h = 20 + Math.random() * 100;
        const d = 10 + Math.random() * 20;

        // Alternating neon colors
        const color = Math.random() > 0.5 ? 0x00f2ff : 0x7000ff;
        const buildMat = new THREE.MeshStandardMaterial({ 
            color: 0x050505,
            emissive: color,
            emissiveIntensity: Math.random() * 0.5
        });

        const building = new THREE.Mesh(buildGeo, buildMat);
        
        // Position buildings on the sides of the road
        const side = Math.random() > 0.5 ? 1 : -1;
        building.position.set(
            side * (40 + Math.random() * 100), 
            h / 2, 
            (Math.random() - 0.5) * 5000
        );
        
        building.scale.set(w, h, d);
        mapGroup.add(building);
    }

    // --- NEON ARCHES (The "Gates") ---
    const archGeo = new THREE.TorusGeometry(30, 0.5, 16, 4);
    const archMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
    
    for (let i = 0; i < 20; i++) {
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 0, i * 250 - 2500);
        arch.rotation.z = Math.PI / 4; // Diamond shape
        mapGroup.add(arch);
    }

    // --- FLYING "STARS" ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const posArray = new Float32Array(starCount * 3);
    
    for(let i = 0; i < starCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 3000;
    }
    
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
    const stars = new THREE.Points(starGeo, starMat);
    mapGroup.add(stars);

    scene.add(mapGroup);
    return mapGroup;
}
