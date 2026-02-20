import * as THREE from "three";

const redMaterial = new THREE.MeshLambertMaterial({ color: 0xc41e3a });

export function createWoodenBookshelf(width, height, rows) {
    const group = new THREE.Group();
    const shelfWood = new THREE.MeshLambertMaterial({ color: 0xe8d4b8 });
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.02), shelfWood);
    backPanel.position.set(0, height / 2, 0);
    group.add(backPanel);

    const shelfSpacing = height / (rows + 1);

    // Cache geometries and materials to avoid memory leaks
    const sharedShelfGeo = new THREE.BoxGeometry(width, 0.02, 0.15);
    const sharedBookGeo = new THREE.BoxGeometry(0.15, 0.2, 0.02);
    const bookColors = [0x4ecdc4, 0xff6b6b, 0xffd93d, 0x45b7d1, 0x96ceb4, 0xa29bfe, 0xe17055, 0x00b894];
    const sharedBookMats = bookColors.map(color => new THREE.MeshLambertMaterial({ color }));

    for (let i = 1; i <= rows; i++) {
        const shelf = new THREE.Mesh(sharedShelfGeo, shelfWood);
        shelf.position.set(0, i * shelfSpacing, 0.08);
        group.add(shelf);
        const bookCount = Math.floor(width / 0.2);
        for (let j = 0; j < bookCount; j++) {
            const book = new THREE.Mesh(sharedBookGeo, sharedBookMats[j % sharedBookMats.length]);
            book.position.set(-width / 2 + 0.1 + j * 0.18, i * shelfSpacing + 0.12, 0.14);
            group.add(book);
        }
    }
    return group;
}

export function createPottedPlant() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.2, 12), new THREE.MeshLambertMaterial({ color: 0xc4713d }));
    pot.position.set(0, 0.1, 0);
    group.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0x4a3728 }));
    soil.position.set(0, 0.2, 0);
    group.add(soil);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 8, 8), leafMat);
        leaf.position.set((Math.random() - 0.5) * 0.15, 0.35 + Math.random() * 0.15, (Math.random() - 0.5) * 0.15);
        leaf.scale.set(1, 0.6, 1);
        group.add(leaf);
    }
    return group;
}

export function createRedBookDisplay() {
    const group = new THREE.Group();
    const bodyWidth = 0.7, bodyHeight = 0.9, bodyDepth = 0.5;

    // Cache
    const sharedBackPanelGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, 0.03);
    const sharedShelfGeo = new THREE.BoxGeometry(bodyWidth - 0.05, 0.02, bodyDepth * 0.6);
    const sharedBookGeo = new THREE.BoxGeometry(0.08, 0.15, 0.01);
    const bookColors = [0xffffff, 0x4ecdc4, 0xff6b6b, 0xffd93d, 0x95e1d3];
    const sharedBookMats = bookColors.map(color => new THREE.MeshLambertMaterial({ color }));
    const sharedSideGeo = new THREE.BoxGeometry(0.03, bodyHeight, bodyDepth);

    const backPanel = new THREE.Mesh(sharedBackPanelGeo, redMaterial);
    backPanel.position.set(0, bodyHeight / 2, -bodyDepth / 2);
    group.add(backPanel);
    for (let i = 0; i < 4; i++) {
        const shelf = new THREE.Mesh(sharedShelfGeo, redMaterial);
        shelf.position.set(0, 0.15 + i * 0.2, -0.1);
        shelf.rotation.x = -0.2;
        group.add(shelf);
        for (let j = 0; j < 5; j++) {
            const book = new THREE.Mesh(sharedBookGeo, sharedBookMats[j]);
            book.position.set(-0.25 + j * 0.12, 0.25 + i * 0.2, 0);
            book.rotation.x = -0.3;
            group.add(book);
        }
    }
    const sideL = new THREE.Mesh(sharedSideGeo, redMaterial);
    sideL.position.set(-bodyWidth / 2, bodyHeight / 2, 0);
    group.add(sideL);
    const sideR = new THREE.Mesh(sharedSideGeo, redMaterial);
    sideR.position.set(bodyWidth / 2, bodyHeight / 2, 0);
    group.add(sideR);
    return group;
}

export function createPosterWall(width, height) {
    const group = new THREE.Group();
    const baseWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshLambertMaterial({ color: 0xf5f0e8 }));
    group.add(baseWall);

    // Cache
    const posterColors = [0xff6b6b, 0xffd93d, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xdfe6e9, 0xfd79a8, 0x00b894, 0xe17055, 0x74b9ff, 0xa29bfe, 0x55efc4, 0xfdcb6e, 0xe84393];
    const posterMats = posterColors.map(color => new THREE.MeshLambertMaterial({ color }));
    const posterGeos = [];
    for (let i = 0; i < 10; i++) {
        const posterW = 0.15 + Math.random() * 0.3;
        const posterH = 0.2 + Math.random() * 0.35;
        posterGeos.push({ geo: new THREE.PlaneGeometry(posterW, posterH), w: posterW, h: posterH });
    }

    for (let i = 0; i < 60; i++) {
        const randomGeo = posterGeos[Math.floor(Math.random() * posterGeos.length)];
        const poster = new THREE.Mesh(randomGeo.geo, posterMats[Math.floor(Math.random() * posterMats.length)]);
        poster.position.set((Math.random() - 0.5) * (width - randomGeo.w), (Math.random() - 0.5) * (height - randomGeo.h), 0.005 + i * 0.001);
        poster.rotation.z = (Math.random() - 0.5) * 0.1;
        group.add(poster);
    }
    return group;
}

export function createFloorCushion(color, size = 0.6) {
    const group = new THREE.Group();
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(size / 2, 16, 12), new THREE.MeshLambertMaterial({ color }));
    cushion.scale.set(1, 0.5, 1);
    cushion.position.set(0, size * 0.25, 0);
    group.add(cushion);
    return group;
}

