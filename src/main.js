import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
// ============ INDEXEDDB FOR 3D MODEL STORAGE ============
const DB_NAME = 'PanafricanLibrary3D';
const DB_VERSION = 1;
const MODELS_STORE = 'custom_models';
const IMAGES_STORE = 'moodboard_images';

let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Store for 3D models
            if (!database.objectStoreNames.contains(MODELS_STORE)) {
                const modelsStore = database.createObjectStore(MODELS_STORE, { keyPath: 'id', autoIncrement: true });
                modelsStore.createIndex('name', 'name', { unique: false });
                modelsStore.createIndex('type', 'type', { unique: false });
            }

            // Store for mood board images
            if (!database.objectStoreNames.contains(IMAGES_STORE)) {
                const imagesStore = database.createObjectStore(IMAGES_STORE, { keyPath: 'id', autoIncrement: true });
                imagesStore.createIndex('category', 'category', { unique: false });
            }
        };
    });
}

// Save 3D model to IndexedDB
async function saveModelToDB(modelData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.add(modelData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all models from IndexedDB
async function getAllModelsFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readonly');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete model from IndexedDB
async function deleteModelFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Save image to IndexedDB
async function saveImageToDB(imageData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.add(imageData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all images from IndexedDB
async function getAllImagesFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete image from IndexedDB
async function deleteImageFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Initialize DB on load
initDB().then(() => {
    console.log('IndexedDB initialized for 3D models and images');
    loadUploadedModels();
    loadUploadedImages();
}).catch(err => {
    console.error('Failed to initialize IndexedDB:', err);
});

// ============ 3D MODEL UPLOAD HANDLING ============
let uploadedModels = [];
let gltfLoader = null;
let objLoader = null;

// Global Loading Manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    const progress = (itemsLoaded / itemsTotal) * 100;
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    if (bar) bar.style.width = progress + '%';
    if (text) text.textContent = `INITIALIZING ${Math.round(progress)}%`;
};
loadingManager.onLoad = function () {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => screen.style.display = 'none', 500);
    }
    console.log('All initial assets loaded');
};

// Initialize loaders after Three.js is ready
function initLoaders() {
    gltfLoader = new GLTFLoader(loadingManager);
    objLoader = new OBJLoader(loadingManager);
}

// Handle 3D model file upload (supports multiple files)
window.handleModelUpload = async function (event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const dropZone = document.getElementById('model-drop-zone');
    const nameInput = document.getElementById('model-name-input');
    let successCount = 0;

    dropZone.classList.add('has-file');
    dropZone.querySelector('.drop-text').textContent = `Processing ${files.length} file(s)...`;

    for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['glb', 'gltf', 'obj'].includes(ext)) {
            console.warn('Skipping unsupported file:', file.name);
            continue;
        }

        const customName = (files.length === 1 && nameInput.value.trim())
            ? nameInput.value.trim()
            : file.name.replace(/\.[^/.]+$/, '');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const modelData = {
                name: customName,
                fileName: file.name,
                type: ext,
                size: file.size,
                data: arrayBuffer,
                createdAt: new Date().toISOString()
            };

            const id = await saveModelToDB(modelData);
            modelData.id = id;
            uploadedModels.push(modelData);
            successCount++;
        } catch (err) {
            console.error('Error uploading model:', file.name, err);
        }
    }

    nameInput.value = '';
    dropZone.classList.remove('has-file');
    dropZone.querySelector('.drop-text').textContent = 'Drop 3D model files here or click to browse';
    renderUploadedModelsList();

    if (successCount > 0) {
        alert(`${successCount} model(s) uploaded successfully!`);
    }
    event.target.value = '';
};

// Load models from IndexedDB on startup
async function loadUploadedModels() {
    if (!db) return;
    try {
        uploadedModels = await getAllModelsFromDB();
        renderUploadedModelsList();
    } catch (err) {
        console.error('Error loading models:', err);
    }
}

// Render the uploaded models list
function renderUploadedModelsList() {
    const container = document.getElementById('uploaded-models-list');
    const grid = document.getElementById('custom-models-grid');

    if (!container) return;

    if (uploadedModels.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:11px; text-align:center; padding:10px;">No custom models yet</div>';
        if (grid) grid.innerHTML = '';
        return;
    }

    // List view
    container.innerHTML = uploadedModels.map(model => `
                <div class="uploaded-model-item" onclick="selectCustomModel(${model.id})">
                    <div class="uploaded-model-info">
                        <div class="uploaded-model-name">📦 ${model.name}</div>
                        <div class="uploaded-model-meta">${model.type.toUpperCase()} • ${formatFileSize(model.size)}</div>
                    </div>
                    <div class="uploaded-model-actions">
                        <button class="model-action-btn place" onclick="event.stopPropagation(); placeCustomModel(${model.id})" title="Place in scene">+</button>
                        <button class="model-action-btn delete" onclick="event.stopPropagation(); deleteCustomModel(${model.id})" title="Delete">✕</button>
                    </div>
                </div>
            `).join('');

    // Grid view (item cards)
    if (grid) {
        grid.innerHTML = uploadedModels.map(model => `
                    <div class="item-card" onclick="selectCustomModel(${model.id})">
                        <div class="item-preview">📦</div>
                        <div class="item-name">${model.name}</div>
                    </div>
                `).join('');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Select a custom model for placement
window.selectCustomModel = function (id) {
    const model = uploadedModels.find(m => m.id === id);
    if (model) {
        selectedFurnitureType = `custom-model-${id}`;
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.uploaded-model-item').forEach(c => c.classList.remove('selected'));
        event.target.closest('.item-card, .uploaded-model-item')?.classList.add('selected');
        updateSelectedInfo();
    }
};

// Place custom model in scene
window.placeCustomModel = async function (id) {
    const model = uploadedModels.find(m => m.id === id);
    if (!model) return;

    initLoaders();

    try {
        const blob = new Blob([model.data]);
        const url = URL.createObjectURL(blob);

        let object = null;

        if (model.type === 'glb' || model.type === 'gltf') {
            if (!gltfLoader) {
                alert('GLTF Loader not available');
                return;
            }
            object = await new Promise((resolve, reject) => {
                gltfLoader.load(url, (gltf) => {
                    resolve(gltf.scene);
                }, undefined, reject);
            });
        } else if (model.type === 'obj') {
            if (!objLoader) {
                alert('OBJ Loader not available');
                return;
            }
            object = await new Promise((resolve, reject) => {
                objLoader.load(url, resolve, undefined, reject);
            });
        }

        URL.revokeObjectURL(url);

        if (object) {
            // Auto-scale to reasonable size
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
                const scale = 1.5 / maxDim;
                object.scale.multiplyScalar(scale);
            }

            // Center on floor
            const newBox = new THREE.Box3().setFromObject(object);
            object.position.y = -newBox.min.y;

            // Place at room center
            object.position.x = 0;
            object.position.z = 0;

            // Mark as placed item
            object.userData.isPlacedItem = true;
            object.userData.itemType = `custom-model-${id}`;
            object.userData.customModelId = id;
            object.userData.customModelName = model.name;

            scene.add(object);
            placedItems.push(object);

            alert(`Model "${model.name}" placed in scene!`);
        }

    } catch (err) {
        console.error('Error loading model:', err);
        alert('Failed to load model: ' + err.message);
    }
};

// Delete custom model
window.deleteCustomModel = async function (id) {
    const model = uploadedModels.find(m => m.id === id);
    if (!model) return;

    if (!confirm(`Delete model "${model.name}"? This cannot be undone.`)) return;

    try {
        await deleteModelFromDB(id);
        uploadedModels = uploadedModels.filter(m => m.id !== id);
        renderUploadedModelsList();
    } catch (err) {
        console.error('Error deleting model:', err);
        alert('Failed to delete model: ' + err.message);
    }
};

// ============ CUSTOM POSTER UPLOAD ============
let uploadedPosters = JSON.parse(localStorage.getItem('uploadedPosters') || '[]');

window.handlePosterUpload = async function (event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const dropZone = document.getElementById('poster-drop-zone');
    dropZone.querySelector('.drop-text').textContent = `Processing ${files.length} image(s)...`;
    let successCount = 0;

    for (const file of files) {
        if (!file.type.startsWith('image/')) { continue; }

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Get image dimensions for aspect ratio
            const dims = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.width, h: img.height });
                img.onerror = () => resolve({ w: 1, h: 1 });
                img.src = dataUrl;
            });

            const posterData = {
                id: Date.now() + successCount,
                name: file.name.replace(/\.[^/.]+$/, ''),
                dataUrl: dataUrl,
                width: dims.w,
                height: dims.h,
                createdAt: new Date().toISOString()
            };

            uploadedPosters.push(posterData);
            successCount++;
        } catch (err) {
            console.error('Error processing poster image:', file.name, err);
        }
    }

    if (successCount > 0) {
        try {
            localStorage.setItem('uploadedPosters', JSON.stringify(uploadedPosters));
        } catch (e) {
            console.warn('localStorage full, posters kept in memory only');
        }
        renderPosterGrid();
    }

    dropZone.querySelector('.drop-text').textContent = 'Drop images here to create wall posters';
    event.target.value = '';
};

function renderPosterGrid() {
    const grid = document.getElementById('custom-posters-grid');
    if (!grid) return;

    if (uploadedPosters.length === 0) {
        grid.innerHTML = '<div style="color:#666; font-size:11px; text-align:center; padding:10px;">No custom posters yet</div>';
        return;
    }

    grid.innerHTML = uploadedPosters.map(p => `
                <div class="item-card" style="position:relative;" onclick="selectPosterForPlacement(${p.id})">
                    <div class="item-preview" style="padding:2px;">
                        <img src="${p.dataUrl}" style="max-width:100%; max-height:48px; object-fit:contain; border-radius:2px;">
                    </div>
                    <div class="item-name">${p.name}</div>
                    <button class="model-action-btn delete" onclick="event.stopPropagation(); deletePoster(${p.id})" style="position:absolute; top:2px; right:2px; font-size:8px; width:14px; height:14px; padding:0; line-height:14px;">✕</button>
                </div>
            `).join('');
}

window.selectPosterForPlacement = function (id) {
    selectedFurnitureType = `custom-poster-${id}`;
    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
    event.target.closest('.item-card')?.classList.add('selected');
};

window.deletePoster = function (id) {
    if (!confirm('Delete this poster?')) return;
    uploadedPosters = uploadedPosters.filter(p => p.id !== id);
    try { localStorage.setItem('uploadedPosters', JSON.stringify(uploadedPosters)); } catch (e) { }
    renderPosterGrid();
};

// Create a 3D poster object from image data
function createPosterObject(posterData, heightCm) {
    const aspect = posterData.width / posterData.height;
    // Use provided height or read from input or default 80cm
    const hCm = heightCm || parseFloat(document.getElementById('poster-height-cm')?.value) || 80;
    const posterHeight = hCm / 100; // Convert cm to meters
    const posterWidth = posterHeight * aspect;
    const frameThickness = 0.02;

    const group = new THREE.Group();

    // Frame (slightly larger than poster)
    const frameGeo = new THREE.BoxGeometry(posterWidth + frameThickness * 2, posterHeight + frameThickness * 2, 0.02);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    // Poster face with image texture
    const texture = new THREE.TextureLoader(loadingManager).load(posterData.dataUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    const posterGeo = new THREE.PlaneGeometry(posterWidth, posterHeight);
    const posterMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
    const posterMesh = new THREE.Mesh(posterGeo, posterMat);
    posterMesh.position.z = 0.011;
    group.add(posterMesh);

    // Default position on wall: eye level
    group.position.y = 1.6;

    group.userData.isPlacedItem = true;
    group.userData.itemType = `custom-poster-${posterData.id}`;
    group.userData.customPosterId = posterData.id;
    group.userData.customPosterName = posterData.name;
    group.userData.isPoster = true;
    group.userData.posterHeightCm = hCm;
    group.userData.posterWidthCm = Math.round(hCm * aspect);

    return group;
}

// Resize a placed poster by changing its height in cm
window.resizePlacedPoster = function () {
    if (!selectedPlacedItem || !selectedPlacedItem.userData.isPoster) return;
    const newH = parseFloat(document.getElementById('placed-poster-h').value) || 80;
    if (newH < 10 || newH > 300) return;

    const before = captureItemState(selectedPlacedItem);
    const posterId = selectedPlacedItem.userData.customPosterId;
    const posterData = uploadedPosters.find(p => p.id === posterId);
    if (!posterData) return;

    const aspect = posterData.width / posterData.height;
    const posterHeight = newH / 100;
    const posterWidth = posterHeight * aspect;
    const frameThickness = 0.02;

    // Rebuild frame and poster meshes
    // Remove old children
    while (selectedPlacedItem.children.length > 0) {
        const child = selectedPlacedItem.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
        }
        selectedPlacedItem.remove(child);
    }

    // Rebuild frame
    const frameGeo = new THREE.BoxGeometry(posterWidth + frameThickness * 2, posterHeight + frameThickness * 2, 0.02);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    selectedPlacedItem.add(new THREE.Mesh(frameGeo, frameMat));

    // Rebuild poster face
    const texture = new THREE.TextureLoader(loadingManager).load(posterData.dataUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    const posterGeo = new THREE.PlaneGeometry(posterWidth, posterHeight);
    const posterMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
    const posterMesh = new THREE.Mesh(posterGeo, posterMat);
    posterMesh.position.z = 0.011;
    selectedPlacedItem.add(posterMesh);

    selectedPlacedItem.userData.posterHeightCm = newH;
    selectedPlacedItem.userData.posterWidthCm = Math.round(newH * aspect);

    document.getElementById('placed-poster-w').textContent = selectedPlacedItem.userData.posterWidthCm;
    pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
};

// Initialize poster grid on load
setTimeout(() => renderPosterGrid(), 500);

// Setup drag-drop for model upload
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('model-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                const input = document.getElementById('model-file-input');
                const dt = new DataTransfer();
                Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                input.files = dt.files;
                handleModelUpload({ target: input });
            }
        });
    }

    // Setup drag-drop for poster upload
    const posterDrop = document.getElementById('poster-drop-zone');
    if (posterDrop) {
        posterDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            posterDrop.classList.add('dragover');
        });
        posterDrop.addEventListener('dragleave', () => {
            posterDrop.classList.remove('dragover');
        });
        posterDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            posterDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                const input = document.getElementById('poster-file-input');
                const dt = new DataTransfer();
                Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                input.files = dt.files;
                handlePosterUpload({ target: input });
            }
        });
    }
});

// ============ MOOD BOARD IMAGE UPLOAD TO INDEXEDDB ============
let uploadedImages = [];

async function loadUploadedImages() {
    if (!db) return;
    try {
        uploadedImages = await getAllImagesFromDB();
        // Merge with localStorage moodboard images
        mergeUploadedImagesWithMoodboard();
    } catch (err) {
        console.error('Error loading images:', err);
    }
}

function mergeUploadedImagesWithMoodboard() {
    // Add uploaded images to moodboard if they exist
    uploadedImages.forEach(img => {
        const exists = moodboardImages.find(m => m.dbId === img.id);
        if (!exists && img.dataUrl) {
            moodboardImages.push({
                src: img.dataUrl,
                title: img.name,
                category: img.category || 'inspiration',
                dbId: img.id,
                isUploaded: true
            });
        }
    });
}

// Enhanced image upload with IndexedDB storage
window.handleMoodboardImageUpload = async function (file) {
    if (!file || !file.type.startsWith('image/')) return null;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;

            // Save to IndexedDB for persistence
            const imageData = {
                name: file.name.replace(/\.[^/.]+$/, ''),
                fileName: file.name,
                dataUrl: dataUrl,
                size: file.size,
                category: document.getElementById('new-image-category')?.value || 'inspiration',
                createdAt: new Date().toISOString()
            };

            try {
                const id = await saveImageToDB(imageData);
                imageData.id = id;
                uploadedImages.push(imageData);
                resolve(dataUrl);
            } catch (err) {
                console.error('Error saving image:', err);
                // Still return dataUrl even if DB save fails
                resolve(dataUrl);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const container = document.getElementById('canvas-container');
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Camera orbit blocking flag - declared early for TransformControls use
let isCameraOrbitBlocked = false;

// TransformControls for visual move/rotate gizmos
let transformControls = null;
function initTransformControls() {
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSize(0.75);
    scene.add(transformControls);

    // STRICT: Snap to floor and enforce room boundaries
    let lastValidPosition = null;
    transformControls.addEventListener('objectChange', () => {
        if (selectedPlacedItem) {
            // Snap to floor (unless wall art)
            if (!selectedPlacedItem.userData.isWallArt) {
                selectedPlacedItem.position.y = 0;
            }

            // STRICT: Check if new position is valid
            const constrained = constrainToRoom(selectedPlacedItem.position);
            if (constrained) {
                // Valid position - update and save
                selectedPlacedItem.position.x = constrained.x;
                selectedPlacedItem.position.z = constrained.z;
                lastValidPosition = selectedPlacedItem.position.clone();
            } else if (lastValidPosition) {
                // INVALID - snap back to last valid position
                selectedPlacedItem.position.copy(lastValidPosition);
            }
        }
    });

    // Save valid position when starting drag
    transformControls.addEventListener('mouseDown', () => {
        if (selectedPlacedItem) {
            lastValidPosition = selectedPlacedItem.position.clone();
        }
    });

    // Disable camera orbit while transforming with gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
        isCameraOrbitBlocked = event.value; // Block when dragging starts, unblock when ends
        isMouseDown = false; // Also reset mouse state
    });
}

// ============================================================
// EXACT DIMENSIONS FROM FLOOR PLAN (converted to meters)
// FLOOR PLAN ORIENTATION: STUDIO corridor at TOP (NORTH = +Z)
// LAYOUT: Windows on SOUTH (-Z), Entries from STUDIO on NORTH (+Z)
// Both rooms are labeled S202 on the floor plan
// THREE STAR is WEST (left), SPECIAL SPECIAL is EAST (right)
// THREE STAR: Entry at north-west, Door to SS at south-east
// SPECIAL SPECIAL: Entry corridor at north-center, Door to TS at south-west
// ============================================================
// SPECIAL SPECIAL (East Room - Sound Library)
const SPECIAL_SPECIAL_WIDTH = 3.496;  // 11'-5⅝" (X direction)
const SPECIAL_SPECIAL_DEPTH = 7.715;  // 25'-3¾" (Z direction) - same depth as west room per floor plan
const SPECIAL_SPECIAL_CORRIDOR_WIDTH = 0.85;  // 2'-9⅝" entry corridor width
const SPECIAL_SPECIAL_CORRIDOR_DEPTH = 0.65;  // 2'-1 5/16" entry corridor depth
// THREE STAR (West Room - Pan-African Library)
const THREE_STAR_WIDTH = 4.36;   // 14'-3 13/16" INTERIOR width (X direction)
const THREE_STAR_DEPTH = 7.715;  // 25'-3¾" (Z direction)
const THREE_STAR_ENTRY_WIDTH = 1.37;  // 4'-5 15/16" entry alcove width
const THREE_STAR_WINDOW_WIDTH = 3.09; // 10'-1½" window section width
// Shared constants
const CEILING_HEIGHT = 3.66;   // 12' ceiling
const WALL_THICKNESS = 0.152;  // 6"
const DOOR_WIDTH = 1.044;      // 3'-5⅛"
const DOOR_HEIGHT = 2.134;     // 7'-0"

// Entry vestibule for SPECIAL SPECIAL (small corridor at south)
const VESTIBULE_WIDTH = SPECIAL_SPECIAL_CORRIDOR_WIDTH;
const VESTIBULE_DEPTH = SPECIAL_SPECIAL_CORRIDOR_DEPTH;

// Room positioning constants - define here for use in ROOM_GEOMETRY
// In the 3D view (floor plan view looking down):
// - THREE STAR (larger room) should appear on LEFT = WEST  (+X side)
// - SPECIAL SPECIAL (smaller room with corridor) should appear on RIGHT = EAST (-X side)
//
// The shared wall (with connecting door) is built by THREE STAR at its -X edge.
// SPECIAL SPECIAL has no east wall (it's handled by THREE STAR's west/shared wall).
// Position rooms so Three Star's west wall sits flush against Special Special's east edge.
const TOTAL_WIDTH = THREE_STAR_WIDTH + SPECIAL_SPECIAL_WIDTH;  // No extra gap — shared wall is built by Three Star at its -X edge
const THREE_STAR_X = TOTAL_WIDTH / 2 - THREE_STAR_WIDTH / 2;  // THREE STAR on +X side (appears LEFT in floor plan view)
const SPECIAL_SPECIAL_X = -(TOTAL_WIDTH / 2) + SPECIAL_SPECIAL_WIDTH / 2;  // SPECIAL SPECIAL on -X side (appears RIGHT in floor plan view)

// ============================================================
// LAYOUT VALIDATION SYSTEM
// Prevents bad furniture placements from rendering
// ============================================================

// Asset Whitelist - Only these items can be placed
const ASSET_WHITELIST = {
    // THREE STAR (West) - Pan-African Library - Publications, archives, video interviews
    'audio_station': {
        id: 'audio_station',
        name: 'DJ / Audio Station',
        footprint: { width: 1.2, depth: 0.6 },
        clearance: { front: 0.8, back: 0.1, left: 0.2, right: 0.2 },
        allowedRooms: ['THREE_STAR'],
        wallAnchor: 'west',
        maxCount: 1
    },
    'floor_speaker': {
        id: 'floor_speaker',
        name: 'Floor Speaker',
        footprint: { width: 0.35, depth: 0.35 },
        clearance: { front: 0.5, back: 0.1, left: 0.1, right: 0.1 },
        allowedRooms: ['THREE_STAR'],
        wallAnchor: null,
        maxCount: 4
    },
    'simple_pouf': {
        id: 'simple_pouf',
        name: 'Floor Pouf/Cushion',
        footprint: { width: 0.6, depth: 0.6 },
        clearance: { front: 0.3, back: 0.3, left: 0.3, right: 0.3 },
        allowedRooms: ['THREE_STAR'],
        wallAnchor: null,
        maxCount: 8
    },
    'headphone_station': {
        id: 'headphone_station',
        name: 'Headphone Listening Station',
        footprint: { width: 0.5, depth: 0.5 },
        clearance: { front: 0.6, back: 0.1, left: 0.3, right: 0.3 },
        allowedRooms: ['THREE_STAR'],
        wallAnchor: 'east',
        maxCount: 3
    },
    'african_natte': {
        id: 'african_natte',
        name: 'African Woven Mat',
        footprint: { width: 2.0, depth: 1.5 },
        clearance: { front: 0, back: 0, left: 0, right: 0 },
        allowedRooms: ['THREE_STAR'],
        wallAnchor: null,
        maxCount: 2
    },

    // SPECIAL SPECIAL (East) - Sound Library - Audio/radio, DJ, collective listening
    'reading_table': {
        id: 'reading_table',
        name: 'Reading Table',
        footprint: { width: 1.8, depth: 0.9 },
        clearance: { front: 0.8, back: 0.8, left: 0.6, right: 0.6 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: null,
        maxCount: 2
    },
    'stackable_chair': {
        id: 'stackable_chair',
        name: 'Stackable Chair',
        footprint: { width: 0.45, depth: 0.45 },
        clearance: { front: 0.5, back: 0.1, left: 0.1, right: 0.1 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: null,
        maxCount: 12
    },
    'wall_shelf': {
        id: 'wall_shelf',
        name: 'Wall-Mounted Archive Shelf',
        footprint: { width: 1.2, depth: 0.3 },
        clearance: { front: 0.6, back: 0, left: 0.1, right: 0.1 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: 'any',
        maxCount: 6
    },
    'archive_cabinet': {
        id: 'archive_cabinet',
        name: 'Low Archive Cabinet',
        footprint: { width: 1.0, depth: 0.45 },
        clearance: { front: 0.6, back: 0.1, left: 0.1, right: 0.1 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: 'any',
        maxCount: 4
    },
    'screen_stand': {
        id: 'screen_stand',
        name: 'Video Screen Stand',
        footprint: { width: 0.6, depth: 0.4 },
        clearance: { front: 1.5, back: 0.1, left: 0.3, right: 0.3 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: null,
        maxCount: 2
    },
    'simple_stool': {
        id: 'simple_stool',
        name: 'Simple Stool',
        footprint: { width: 0.35, depth: 0.35 },
        clearance: { front: 0.4, back: 0.2, left: 0.2, right: 0.2 },
        allowedRooms: ['SPECIAL_SPECIAL'],
        wallAnchor: null,
        maxCount: 6
    },
    'pendant_light': {
        id: 'pendant_light',
        name: 'Pendant Light',
        footprint: { width: 0.4, depth: 0.4 },
        clearance: { front: 0, back: 0, left: 0, right: 0 },
        allowedRooms: ['THREE_STAR', 'SPECIAL_SPECIAL'],
        wallAnchor: null,
        isCeilingMounted: true,
        maxCount: 4
    }
};

// Room Geometry - Defines boundaries and keep-out zones
// Note: These are in WORLD coordinates after room positioning
// THREE_STAR is at X = THREE_STAR_X, Z = 0
// SPECIAL_SPECIAL is at X = SPECIAL_SPECIAL_X, Z offset to align NORTH walls
// Positive offset moves Special Special south so north walls align
const SS_Z_OFFSET = THREE_STAR_DEPTH / 2 - SPECIAL_SPECIAL_DEPTH / 2;
const ROOM_GEOMETRY = {
    'THREE_STAR': {
        id: 'THREE_STAR',
        name: 'Panafrican Library',
        bounds: {
            minX: THREE_STAR_X - THREE_STAR_WIDTH / 2,
            maxX: THREE_STAR_X + THREE_STAR_WIDTH / 2,
            minZ: -THREE_STAR_DEPTH / 2,
            maxZ: THREE_STAR_DEPTH / 2
        },
        doorZone: {
            // Entry door at NORTH-WEST corner (from STUDIO)
            minX: THREE_STAR_X - THREE_STAR_WIDTH / 2,
            maxX: THREE_STAR_X - THREE_STAR_WIDTH / 2 + DOOR_WIDTH + 1.0,
            minZ: THREE_STAR_DEPTH / 2 - 1.5,
            maxZ: THREE_STAR_DEPTH / 2
        },
        circulationZones: [
            {
                minX: THREE_STAR_X - THREE_STAR_WIDTH / 2 + 0.8,
                maxX: THREE_STAR_X + THREE_STAR_WIDTH / 2 - 0.8,
                minZ: -THREE_STAR_DEPTH / 2 + 0.8,
                maxZ: THREE_STAR_DEPTH / 2 - 1.0
            }
        ],
        usableArea: null
    },
    'SPECIAL_SPECIAL': {
        id: 'SPECIAL_SPECIAL',
        name: 'Sound Library',
        bounds: {
            minX: SPECIAL_SPECIAL_X - SPECIAL_SPECIAL_WIDTH / 2,
            maxX: SPECIAL_SPECIAL_X + SPECIAL_SPECIAL_WIDTH / 2,
            minZ: SS_Z_OFFSET - SPECIAL_SPECIAL_DEPTH / 2,
            maxZ: SS_Z_OFFSET + SPECIAL_SPECIAL_DEPTH / 2
        },
        doorZone: {
            // Entry corridor at NORTH-CENTER (from STUDIO)
            minX: SPECIAL_SPECIAL_X - SPECIAL_SPECIAL_CORRIDOR_WIDTH / 2 - 0.3,
            maxX: SPECIAL_SPECIAL_X + SPECIAL_SPECIAL_CORRIDOR_WIDTH / 2 + 0.3,
            minZ: SS_Z_OFFSET + SPECIAL_SPECIAL_DEPTH / 2 - 0.5,
            maxZ: SS_Z_OFFSET + SPECIAL_SPECIAL_DEPTH / 2 + SPECIAL_SPECIAL_CORRIDOR_DEPTH
        },
        circulationZones: [
            {
                minX: SPECIAL_SPECIAL_X - SPECIAL_SPECIAL_WIDTH / 2 + 0.6,
                maxX: SPECIAL_SPECIAL_X + SPECIAL_SPECIAL_WIDTH / 2 - 0.6,
                minZ: SS_Z_OFFSET - SPECIAL_SPECIAL_DEPTH / 2 + 0.8,
                maxZ: SS_Z_OFFSET + SPECIAL_SPECIAL_DEPTH / 2 - 0.8
            }
        ],
        usableArea: null
    }
};

// Calculate usable areas (bounds minus door and circulation zones)
function calculateUsableAreas() {
    for (const roomId in ROOM_GEOMETRY) {
        const room = ROOM_GEOMETRY[roomId];
        const bounds = room.bounds;
        const door = room.doorZone;
        // Usable area is the bounds with margin
        room.usableArea = {
            minX: bounds.minX + 0.3,
            maxX: bounds.maxX - 0.3,
            minZ: bounds.minZ + 0.3,
            maxZ: bounds.maxZ - 0.3
        };
    }
}
calculateUsableAreas();

// 2D AABB Collision Detection
function getAABB(placement) {
    const asset = ASSET_WHITELIST[placement.assetId];
    if (!asset) return null;

    const halfW = asset.footprint.width / 2;
    const halfD = asset.footprint.depth / 2;

    // Account for rotation (simplified - assumes 90 degree increments)
    const rot = (placement.rotation || 0) % 360;
    const rotated = (rot === 90 || rot === 270);
    const w = rotated ? halfD : halfW;
    const d = rotated ? halfW : halfD;

    return {
        minX: placement.x - w,
        maxX: placement.x + w,
        minZ: placement.z - d,
        maxZ: placement.z + d
    };
}

function aabbsOverlap(a, b) {
    if (!a || !b) return false;
    return !(a.maxX < b.minX || a.minX > b.maxX ||
        a.maxZ < b.minZ || a.minZ > b.maxZ);
}

function getAABBWithClearance(placement) {
    const asset = ASSET_WHITELIST[placement.assetId];
    if (!asset) return null;

    const base = getAABB(placement);
    if (!base) return null;

    const cl = asset.clearance;
    return {
        minX: base.minX - cl.left,
        maxX: base.maxX + cl.right,
        minZ: base.minZ - cl.back,
        maxZ: base.maxZ + cl.front
    };
}

// Layout Validation Function
function validateLayout(placements) {
    const errors = [];
    const warnings = [];
    const assetCounts = {};

    for (let i = 0; i < placements.length; i++) {
        const p = placements[i];
        const asset = ASSET_WHITELIST[p.assetId];

        // 1. Check if asset is in whitelist
        if (!asset) {
            errors.push(`Unknown asset: ${p.assetId}`);
            continue;
        }

        // 2. Check room assignment
        if (!asset.allowedRooms.includes(p.roomId)) {
            errors.push(`${asset.name} not allowed in room ${p.roomId}`);
        }

        // 3. Check max count
        assetCounts[p.assetId] = (assetCounts[p.assetId] || 0) + 1;
        if (assetCounts[p.assetId] > asset.maxCount) {
            errors.push(`Too many ${asset.name} (max ${asset.maxCount})`);
        }

        // 4. Check room boundaries
        const room = ROOM_GEOMETRY[p.roomId];
        if (room) {
            const aabb = getAABB(p);
            if (aabb) {
                const usable = room.usableArea;
                if (aabb.minX < usable.minX || aabb.maxX > usable.maxX ||
                    aabb.minZ < usable.minZ || aabb.maxZ > usable.maxZ) {
                    errors.push(`${asset.name} outside room boundaries`);
                }

                // 5. Check door zone collision
                if (aabbsOverlap(aabb, room.doorZone)) {
                    errors.push(`${asset.name} blocks door in ${p.roomId}`);
                }
            }
        }

        // 6. Check wall anchor requirements
        if (asset.wallAnchor && asset.wallAnchor !== 'any') {
            const room = ROOM_GEOMETRY[p.roomId];
            if (room) {
                const bounds = room.bounds;
                const wallMargin = 0.5;
                let anchored = false;

                if (asset.wallAnchor === 'west' && Math.abs(p.x - bounds.minX) < wallMargin) anchored = true;
                if (asset.wallAnchor === 'east' && Math.abs(p.x - bounds.maxX) < wallMargin) anchored = true;
                if (asset.wallAnchor === 'north' && Math.abs(p.z - bounds.minZ) < wallMargin) anchored = true;
                if (asset.wallAnchor === 'south' && Math.abs(p.z - bounds.maxZ) < wallMargin) anchored = true;

                if (!anchored) {
                    warnings.push(`${asset.name} should be against ${asset.wallAnchor} wall`);
                }
            }
        }

        // 7. Check collision with other placements
        for (let j = i + 1; j < placements.length; j++) {
            const other = placements[j];
            const aabb1 = getAABBWithClearance(p);
            const aabb2 = getAABBWithClearance(other);

            if (aabbsOverlap(aabb1, aabb2)) {
                const otherAsset = ASSET_WHITELIST[other.assetId];
                errors.push(`${asset.name} collides with ${otherAsset?.name || other.assetId}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

// Layout Scoring Function
function scoreLayout(placements) {
    let score = 100;
    const validation = validateLayout(placements);

    // Hard failures
    if (!validation.valid) {
        return { score: 0, details: 'Invalid layout: ' + validation.errors.join(', ') };
    }

    // Deduct for warnings
    score -= validation.warnings.length * 5;

    // Check functional completeness
    const hasAudioStation = placements.some(p => p.assetId === 'audio_station' && p.roomId === 'THREE_STAR');
    const hasReadingTable = placements.some(p => p.assetId === 'reading_table' && p.roomId === 'SPECIAL_SPECIAL');
    const hasSeating = placements.some(p =>
        ['simple_pouf', 'stackable_chair', 'simple_stool'].includes(p.assetId)
    );

    if (!hasAudioStation) score -= 20;
    if (!hasReadingTable) score -= 20;
    if (!hasSeating) score -= 15;

    // Bonus for good distribution
    const threeStarCount = placements.filter(p => p.roomId === 'THREE_STAR').length;
    const specialSpecialCount = placements.filter(p => p.roomId === 'SPECIAL_SPECIAL').length;
    if (threeStarCount > 0 && specialSpecialCount > 0) score += 10;

    return {
        score: Math.max(0, Math.min(100, score)),
        details: validation.warnings.length > 0 ?
            'Warnings: ' + validation.warnings.join(', ') : 'Good layout'
    };
}

// Convert Three.js position to placement format
function objectToPlacement(obj, assetId, roomId) {
    return {
        assetId: assetId,
        roomId: roomId,
        x: obj.position.x,
        z: obj.position.z,
        rotation: (obj.rotation.y * 180 / Math.PI) % 360
    };
}

// Determine which room an object is in
function getObjectRoom(obj) {
    const x = obj.position.x;
    const z = obj.position.z;

    for (const roomId in ROOM_GEOMETRY) {
        const room = ROOM_GEOMETRY[roomId];
        const b = room.bounds;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
            return roomId;
        }
    }
    return null;
}

console.log('Layout validation system initialized');
console.log('Asset whitelist:', Object.keys(ASSET_WHITELIST).length, 'items');
console.log('Room geometries:', Object.keys(ROOM_GEOMETRY));

// ============================================================
// END LAYOUT VALIDATION SYSTEM
// ============================================================

// Window dimensions (from reference photos - MoMA PS1 industrial windows)
// Tall rectangular windows with white frames, grid pattern
const PS1_WINDOW_WIDTH = 1.3;      // ~4.25 feet
const PS1_WINDOW_HEIGHT = 2.2;     // ~7.25 feet tall
const PS1_WINDOW_SILL = 0.75;      // ~2.5 feet sill height
const PS1_COLUMN_WIDTH = 0.25;     // White fluted columns between windows

// Materials
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf8f8f5, side: THREE.DoubleSide });
const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }); // Pure white ceiling
const brickMaterial = new THREE.MeshLambertMaterial({ color: 0xf0ebe5, side: THREE.DoubleSide });
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xd4c8b8 });
const darkBlueMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e5c });
const windowFrameMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
const glassMaterial = new THREE.MeshLambertMaterial({ color: 0xc8d8e4, transparent: true, opacity: 0.35 });
const woodMaterial = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
const ochreFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xc9a227 });
const redMaterial = new THREE.MeshLambertMaterial({ color: 0xc41e3a });

// ============ AFRICAN TEXTILE PATTERN SYSTEM (must be before furniture) ============
// Cache for textile textures
const textileTextureCache = {};

// Create canvas-based textures for African wax print patterns
function createAfricanTextileTexture(patternType = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const patterns = [
        // Pattern 0: Red/Yellow floral
        () => {
            ctx.fillStyle = '#d4382a';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#f4c430';
            for (let x = 32; x < 256; x += 64) {
                for (let y = 32; y < 256; y += 64) {
                    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#f4c430';
                }
            }
        },
        // Pattern 1: Blue diamond
        () => {
            ctx.fillStyle = '#1e4d7b'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#87ceeb';
            for (let y = 0; y < 256; y += 32) {
                for (let x = (y % 64 === 0) ? 0 : 16; x < 256; x += 32) {
                    ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + 32, y + 16);
                    ctx.lineTo(x + 16, y + 32); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill();
                }
            }
        },
        // Pattern 2: Orange/green medallions
        () => {
            ctx.fillStyle = '#ff8c00'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#228b22';
            for (let x = 64; x < 256; x += 128) {
                for (let y = 64; y < 256; y += 128) {
                    ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#228b22';
                }
            }
        },
        // Pattern 3: Pink/Cyan scallop
        () => {
            ctx.fillStyle = '#ff69b4'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#00ced1';
            for (let y = 0; y < 256; y += 48) {
                for (let x = (y % 96 === 0) ? 0 : 24; x < 256; x += 48) {
                    ctx.beginPath(); ctx.arc(x + 24, y + 48, 24, Math.PI, 0); ctx.fill();
                }
            }
        },
        // Pattern 4: Teal/Yellow circles
        () => {
            ctx.fillStyle = '#008b8b'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#ffd700';
            for (let x = 40; x < 256; x += 80) {
                for (let y = 40; y < 256; y += 80) {
                    ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffd700';
                }
            }
        },
        // Pattern 5: Red/Gold lattice
        () => {
            ctx.fillStyle = '#8b0000'; ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#daa520'; ctx.lineWidth = 8;
            for (let i = -256; i < 512; i += 32) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
            }
        },
        // Pattern 6: Purple/Pink florals
        () => {
            ctx.fillStyle = '#4b0082'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#ff1493';
            for (let y = 0; y < 256; y += 64) {
                ctx.beginPath(); ctx.moveTo(0, y + 32);
                for (let x = 0; x < 256; x += 32) ctx.quadraticCurveTo(x + 16, y + (x % 64 === 0 ? 0 : 64), x + 32, y + 32);
                ctx.lineTo(256, y + 64); ctx.lineTo(0, y + 64); ctx.closePath(); ctx.fill();
            }
        },
        // Pattern 7: Yellow/Red sunburst
        () => {
            ctx.fillStyle = '#ffd700'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#dc143c';
            for (let x = 64; x < 256; x += 128) {
                for (let y = 64; y < 256; y += 128) {
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                        ctx.beginPath(); ctx.moveTo(x, y);
                        ctx.lineTo(x + Math.cos(a) * 45, y + Math.sin(a) * 45);
                        ctx.lineTo(x + Math.cos(a + Math.PI / 16) * 45, y + Math.sin(a + Math.PI / 16) * 45);
                        ctx.closePath(); ctx.fill();
                    }
                }
            }
        },
        // Pattern 8: Orange/Teal abstract
        () => {
            ctx.fillStyle = '#ff7f50'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#20b2aa';
            for (let x = 0; x < 256; x += 64) {
                for (let y = 0; y < 256; y += 64) {
                    ctx.beginPath(); ctx.ellipse(x + 32, y + 32, 25, 15, (x + y) * 0.02, 0, Math.PI * 2); ctx.fill();
                }
            }
        },
        // Pattern 9: Green/Blue kente
        () => {
            ctx.fillStyle = '#006400'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#4169e1';
            for (let i = 0; i < 256; i += 32) ctx.fillRect(i, 0, 16, 256);
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 256; i += 64) ctx.fillRect(0, i, 256, 8);
        }
    ];

    patterns[patternType % patterns.length]();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

function getTextileTexture(patternIndex) {
    if (!textileTextureCache[patternIndex]) {
        textileTextureCache[patternIndex] = createAfricanTextileTexture(patternIndex);
    }
    return textileTextureCache[patternIndex];
}
// ============ END TEXTILE PATTERN SYSTEM ============

// Groups for visibility control
const labelsGroup = new THREE.Group();
const ceilingsGroup = new THREE.Group();
const wallsGroup = new THREE.Group();
const threeStarRoomWalls = { front: null, back: null, left: null, right: null, vestibuleLeft: null, vestibuleRight: null };
const specialSpecialRoomWalls = { front: null, back: null, left: null, right: null };

const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x333333);
scene.add(gridHelper);

// Note: TOTAL_WIDTH, THREE_STAR_X, SPECIAL_SPECIAL_X defined earlier (before ROOM_GEOMETRY)

// ============ HELPER FUNCTIONS ============

function createArchedWindow(width, height, archRadius, hasFabricFrame = true) {
    const group = new THREE.Group();
    const frameThickness = 0.08;

    // Glass
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-width / 2, 0);
    glassShape.lineTo(-width / 2, height - archRadius);
    glassShape.quadraticCurveTo(-width / 2, height, 0, height);
    glassShape.quadraticCurveTo(width / 2, height, width / 2, height - archRadius);
    glassShape.lineTo(width / 2, 0);
    glassShape.lineTo(-width / 2, 0);

    const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape), glassMaterial);
    group.add(glass);

    // Frame bars
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height - archRadius, frameThickness), windowFrameMaterial);
    leftFrame.position.set(-width / 2, (height - archRadius) / 2, 0);
    group.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height - archRadius, frameThickness), windowFrameMaterial);
    rightFrame.position.set(width / 2, (height - archRadius) / 2, 0);
    group.add(rightFrame);

    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(width + frameThickness, frameThickness, frameThickness), windowFrameMaterial);
    bottomFrame.position.set(0, 0, 0);
    group.add(bottomFrame);

    const centerFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height - archRadius, frameThickness), windowFrameMaterial);
    centerFrame.position.set(0, (height - archRadius) / 2, 0);
    group.add(centerFrame);

    const middleFrame = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, frameThickness), windowFrameMaterial);
    middleFrame.position.set(0, height * 0.4, 0);
    group.add(middleFrame);

    // Dark blue fabric frame
    if (hasFabricFrame) {
        const fabricWidth = width + 0.4;
        const fabricHeight = height + 0.3;
        const leftFabric = new THREE.Mesh(new THREE.BoxGeometry(0.15, fabricHeight, 0.02), darkBlueMaterial);
        leftFabric.position.set(-fabricWidth / 2, fabricHeight / 2, 0.02);
        group.add(leftFabric);
        const rightFabric = new THREE.Mesh(new THREE.BoxGeometry(0.15, fabricHeight, 0.02), darkBlueMaterial);
        rightFabric.position.set(fabricWidth / 2, fabricHeight / 2, 0.02);
        group.add(rightFabric);
        const topFabric = new THREE.Mesh(new THREE.BoxGeometry(fabricWidth, 0.15, 0.02), darkBlueMaterial);
        topFabric.position.set(0, fabricHeight - 0.1, 0.02);
        group.add(topFabric);
    }

    return group;
}

// NYC double-hung sash window — split roughly in half, bottom slides up
// Classic MoMA PS1 industrial style with white painted wood frames
function createPS1Window(width, height, hasAC = false) {
    const group = new THREE.Group();
    const frameThickness = 0.05;
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sillMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e3 });

    // Split point: roughly halfway (classic NYC proportion)
    const splitY = 0; // center of window
    const topH = height / 2;
    const botH = height / 2;

    // --- TOP SASH (fixed upper half) ---
    const topGlass = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, topH - 0.06), glassMaterial);
    topGlass.position.set(0, topH / 2, 0);
    group.add(topGlass);

    // --- BOTTOM SASH (the sliding half) ---
    const botGlass = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, botH - 0.06), glassMaterial);
    botGlass.position.set(0, -botH / 2, 0.01); // slightly in front (overlaps when slid up)
    group.add(botGlass);

    // Outer frame
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, frameThickness, frameThickness), frameMat);
    topBar.position.set(0, height / 2, 0.02);
    group.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, frameThickness, frameThickness), frameMat);
    botBar.position.set(0, -height / 2, 0.02);
    group.add(botBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameThickness), frameMat);
    leftBar.position.set(-width / 2, 0, 0.02);
    group.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameThickness), frameMat);
    rightBar.position.set(width / 2, 0, 0.02);
    group.add(rightBar);

    // Meeting rail — thick horizontal bar where the two sashes meet
    // Classic NYC double-hung: only this horizontal divider, no vertical muntins
    const meetingRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, frameThickness * 1.4, frameThickness * 1.2), frameMat);
    meetingRail.position.set(0, splitY, 0.025);
    group.add(meetingRail);

    // Window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.06, 0.12), sillMat);
    sill.position.set(0, -height / 2 - 0.03, 0.05);
    group.add(sill);

    // AC unit in the top half (if flagged)
    if (hasAC) {
        const acMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const acBody = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, topH * 0.6, 0.35), acMat);
        acBody.position.set(0, topH / 2, 0.18);
        group.add(acBody);
        // Vent grille lines
        const ventMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        for (let i = -3; i <= 3; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.01, 0.01), ventMat);
            slat.position.set(0, topH / 2 + i * 0.04, 0.36);
            group.add(slat);
        }
    }

    return group;
}

// Create white fluted column/pilaster (decorative element between windows)
function createFlutedColumn(height) {
    const group = new THREE.Group();
    const columnMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });

    // Main column body
    const column = new THREE.Mesh(
        new THREE.BoxGeometry(PS1_COLUMN_WIDTH, height, 0.1),
        columnMat
    );
    column.position.set(0, height / 2, 0);
    group.add(column);

    // Add fluting detail (vertical ridges)
    const fluteMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e3 });
    for (let i = -2; i <= 2; i++) {
        const flute = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, height, 0.03),
            fluteMat
        );
        flute.position.set(i * 0.05, height / 2, 0.06);
        group.add(flute);
    }

    return group;
}

function createFloorCushion(color, size = 0.6) {
    const group = new THREE.Group();
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(size / 2, 16, 12), new THREE.MeshLambertMaterial({ color }));
    cushion.scale.set(1, 0.5, 1);
    cushion.position.set(0, size * 0.25, 0);
    group.add(cushion);
    return group;
}

function createTuftedFloorMattress(width, depth) {
    const group = new THREE.Group();
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), ochreFloorMaterial);
    mattress.position.set(0, 0.1, 0);
    group.add(mattress);
    const buttonMat = new THREE.MeshLambertMaterial({ color: 0xa88520 });
    for (let x = -width / 2 + 0.3; x < width / 2; x += 0.3) {
        for (let z = -depth / 2 + 0.3; z < depth / 2; z += 0.3) {
            const button = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), buttonMat);
            button.position.set(x, 0.2, z);
            group.add(button);
        }
    }
    return group;
}

function createLayeredRug(width, depth, color) {
    const group = new THREE.Group();
    const rug = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), new THREE.MeshLambertMaterial({ color }));
    rug.position.set(0, 0.01, 0);
    group.add(rug);
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
    const topBorder = new THREE.Mesh(new THREE.BoxGeometry(width, 0.025, 0.05), borderMat);
    topBorder.position.set(0, 0.02, -depth / 2 + 0.025);
    group.add(topBorder);
    const bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(width, 0.025, 0.05), borderMat);
    bottomBorder.position.set(0, 0.02, depth / 2 - 0.025);
    group.add(bottomBorder);
    return group;
}

function createWoodenBookshelf(width, height, rows) {
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

function createPottedPlant() {
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

function createPendantLight() {
    const group = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    cord.position.set(0, 0.4, 0);
    group.add(cord);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xd4a76a, side: THREE.DoubleSide }));
    group.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfffacd }));
    group.add(bulb);
    return group;
}

function createLowCoffeeTable() {
    const group = new THREE.Group();
    const tableMat = new THREE.MeshLambertMaterial({ color: 0xc4a77d });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), tableMat);
    top.position.set(0, 0.25, 0);
    group.add(top);
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.23, 8), tableMat);
        leg.position.set(Math.cos(angle) * 0.25, 0.115, Math.sin(angle) * 0.25);
        group.add(leg);
    }
    return group;
}

function createRedBookDisplay() {
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

function createPosterWall(width, height) {
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

// ============ PAN-AFRICAN LIBRARY (WEST) - THREE STAR ============
// LAYOUT FROM FLOOR PLAN (STUDIO corridor at TOP = NORTH = +Z):
// - Windows on SOUTH wall (-Z) - 2 windows with column - BOTTOM of floor plan
// - Entry door from STUDIO on NORTH wall (+Z), at WEST (left) side - TOP LEFT
// - Door to SPECIAL SPECIAL on EAST wall (+X), near SOUTH end - BOTTOM RIGHT
// - Solid WEST wall (-X) - exterior
function createThreeStar() {
    const group = new THREE.Group();

    // ========== FLOOR ==========
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(THREE_STAR_WIDTH, THREE_STAR_DEPTH), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, 0);
    group.add(floor);

    // African pattern rugs will be added as furniture items (moveable)

    // ========== SOUTH WALL (-Z) - PS1 Industrial Windows (BOTTOM of floor plan) ==========
    const southWallGroup = new THREE.Group();

    // Wall below windows (sill area)
    const southWallBase = new THREE.Mesh(
        new THREE.BoxGeometry(THREE_STAR_WIDTH, PS1_WINDOW_SILL, WALL_THICKNESS),
        wallMaterial
    );
    southWallBase.position.set(0, PS1_WINDOW_SILL / 2, -THREE_STAR_DEPTH / 2);
    southWallGroup.add(southWallBase);

    // Wall above windows
    const topWallHeight = CEILING_HEIGHT - PS1_WINDOW_SILL - PS1_WINDOW_HEIGHT;
    const southWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(THREE_STAR_WIDTH, topWallHeight, WALL_THICKNESS),
        wallMaterial
    );
    southWallTop.position.set(0, PS1_WINDOW_SILL + PS1_WINDOW_HEIGHT + topWallHeight / 2, -THREE_STAR_DEPTH / 2);
    southWallGroup.add(southWallTop);

    // Two windows with fluted column between them
    // Window layout: [side wall] [window1] [column] [window2] [side wall]
    const windowCenterY = PS1_WINDOW_SILL + PS1_WINDOW_HEIGHT / 2;

    // Calculate positions: 2 windows + 1 column in center, wall on each side
    const totalWindowsAndColumn = PS1_WINDOW_WIDTH * 2 + PS1_COLUMN_WIDTH;
    const sideWallWidth = (THREE_STAR_WIDTH - totalWindowsAndColumn) / 2;

    // Left window position: starts after left side wall
    const leftWindowX = -THREE_STAR_WIDTH / 2 + sideWallWidth + PS1_WINDOW_WIDTH / 2;
    // Right window position: ends before right side wall
    const rightWindowX = THREE_STAR_WIDTH / 2 - sideWallWidth - PS1_WINDOW_WIDTH / 2;

    // Left window
    const win1 = createPS1Window(PS1_WINDOW_WIDTH, PS1_WINDOW_HEIGHT);
    win1.position.set(leftWindowX, windowCenterY, -THREE_STAR_DEPTH / 2 + 0.02);
    win1.rotation.y = Math.PI;  // Face into room
    southWallGroup.add(win1);

    // Right window
    const win2 = createPS1Window(PS1_WINDOW_WIDTH, PS1_WINDOW_HEIGHT);
    win2.position.set(rightWindowX, windowCenterY, -THREE_STAR_DEPTH / 2 + 0.02);
    win2.rotation.y = Math.PI;  // Face into room
    southWallGroup.add(win2);

    // Fluted column between windows (centered)
    const columnThreeStar = createFlutedColumn(PS1_WINDOW_HEIGHT);
    columnThreeStar.position.set(0, PS1_WINDOW_SILL, -THREE_STAR_DEPTH / 2 + 0.02);
    southWallGroup.add(columnThreeStar);

    // Wall sections on either side of windows - FULL HEIGHT in window zone
    if (sideWallWidth > 0.05) {
        const leftSide = new THREE.Mesh(
            new THREE.BoxGeometry(sideWallWidth, PS1_WINDOW_HEIGHT, WALL_THICKNESS),
            wallMaterial
        );
        leftSide.position.set(-THREE_STAR_WIDTH / 2 + sideWallWidth / 2, windowCenterY, -THREE_STAR_DEPTH / 2);
        southWallGroup.add(leftSide);

        const rightSide = new THREE.Mesh(
            new THREE.BoxGeometry(sideWallWidth, PS1_WINDOW_HEIGHT, WALL_THICKNESS),
            wallMaterial
        );
        rightSide.position.set(THREE_STAR_WIDTH / 2 - sideWallWidth / 2, windowCenterY, -THREE_STAR_DEPTH / 2);
        southWallGroup.add(rightSide);
    }

    group.add(southWallGroup);
    threeStarRoomWalls.front = southWallGroup;  // Windows (south)

    // ========== NORTH WALL (+Z) - Entry door from STUDIO at EAST (exterior) side (TOP LEFT in floor plan) ==========
    // With swapped positions: THREE STAR's exterior (away from SPECIAL SPECIAL) is at +X
    // Entry is in the top-left corner of floor plan = north-east corner in local coords
    const northWallGroup = new THREE.Group();

    // Door position: East side (exterior) of north wall, about 0.5m from corner
    const northDoorOffsetX = THREE_STAR_WIDTH / 2 - DOOR_WIDTH / 2 - 0.5;

    // Wall section to the LEFT of door (large piece toward SPECIAL SPECIAL)
    const leftOfDoorWidth = THREE_STAR_WIDTH / 2 + northDoorOffsetX - DOOR_WIDTH / 2;
    if (leftOfDoorWidth > 0.05) {
        const northWallLeft = new THREE.Mesh(
            new THREE.BoxGeometry(leftOfDoorWidth, CEILING_HEIGHT, WALL_THICKNESS),
            wallMaterial
        );
        northWallLeft.position.set(-THREE_STAR_WIDTH / 2 + leftOfDoorWidth / 2, CEILING_HEIGHT / 2, THREE_STAR_DEPTH / 2);
        northWallGroup.add(northWallLeft);
    }

    // Wall section to the RIGHT of door (small piece at exterior corner)
    const rightOfDoorWidth = THREE_STAR_WIDTH / 2 - northDoorOffsetX - DOOR_WIDTH / 2;
    if (rightOfDoorWidth > 0.05) {
        const northWallRight = new THREE.Mesh(
            new THREE.BoxGeometry(rightOfDoorWidth, CEILING_HEIGHT, WALL_THICKNESS),
            wallMaterial
        );
        northWallRight.position.set(THREE_STAR_WIDTH / 2 - rightOfDoorWidth / 2, CEILING_HEIGHT / 2, THREE_STAR_DEPTH / 2);
        northWallGroup.add(northWallRight);
    }

    // Door header above entry door
    const northDoorHeader = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_WIDTH, CEILING_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS),
        wallMaterial
    );
    northDoorHeader.position.set(northDoorOffsetX, DOOR_HEIGHT + (CEILING_HEIGHT - DOOR_HEIGHT) / 2, THREE_STAR_DEPTH / 2);
    northWallGroup.add(northDoorHeader);

    group.add(northWallGroup);
    threeStarRoomWalls.back = northWallGroup;  // Entry from STUDIO (north)

    // ========== WEST WALL (-X) - Door to SPECIAL SPECIAL ==========
    // This is the SHARED wall - SPECIAL SPECIAL is to the WEST (left) of THREE STAR
    // Per floor plan: Door is 4'-5 15/16" (1.37m) from THREE STAR's south facade windows
    // South facade is at -THREE_STAR_DEPTH/2, so door center is at:
    const CONNECTING_DOOR_FROM_SOUTH = 1.37;  // 4'-5 15/16" from south facade
    const westDoorCenterZ = -THREE_STAR_DEPTH / 2 + CONNECTING_DOOR_FROM_SOUTH + DOOR_WIDTH / 2;

    const westWallGroup = new THREE.Group();

    // SOUTH segment: wall from south corner to door (near windows)
    const southSegmentLength = Math.abs(westDoorCenterZ - DOOR_WIDTH / 2 - (-THREE_STAR_DEPTH / 2));
    if (southSegmentLength > 0.05) {
        const westWallSouth = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_THICKNESS, CEILING_HEIGHT, southSegmentLength),
            wallMaterial
        );
        westWallSouth.position.set(-THREE_STAR_WIDTH / 2, CEILING_HEIGHT / 2, -THREE_STAR_DEPTH / 2 + southSegmentLength / 2);
        westWallGroup.add(westWallSouth);
    }

    // NORTH segment: wall from door to north corner (toward STUDIO)
    const northSegmentLength = THREE_STAR_DEPTH / 2 - (westDoorCenterZ + DOOR_WIDTH / 2);
    if (northSegmentLength > 0.05) {
        const westWallNorth = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_THICKNESS, CEILING_HEIGHT, northSegmentLength),
            wallMaterial
        );
        westWallNorth.position.set(-THREE_STAR_WIDTH / 2, CEILING_HEIGHT / 2, THREE_STAR_DEPTH / 2 - northSegmentLength / 2);
        westWallGroup.add(westWallNorth);
    }

    // Door header above connecting door
    const westDoorHeader = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, CEILING_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH),
        wallMaterial
    );
    westDoorHeader.position.set(-THREE_STAR_WIDTH / 2, DOOR_HEIGHT + (CEILING_HEIGHT - DOOR_HEIGHT) / 2, westDoorCenterZ);
    westWallGroup.add(westDoorHeader);

    group.add(westWallGroup);
    threeStarRoomWalls.left = westWallGroup;

    // ========== EAST WALL (+X) - Solid exterior wall ==========
    // Extend wall by WALL_THICKNESS at both ends to meet corner walls properly
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, CEILING_HEIGHT, THREE_STAR_DEPTH + 2 * WALL_THICKNESS),
        wallMaterial
    );
    eastWall.position.set(THREE_STAR_WIDTH / 2, CEILING_HEIGHT / 2, 0);
    group.add(eastWall);
    threeStarRoomWalls.right = eastWall;

    // ========== CEILING ==========
    const ceilingThreeStar = new THREE.Mesh(new THREE.PlaneGeometry(THREE_STAR_WIDTH, THREE_STAR_DEPTH), ceilingMaterial);
    ceilingThreeStar.rotation.x = Math.PI / 2;
    ceilingThreeStar.position.set(0, CEILING_HEIGHT, 0);
    ceilingThreeStar.userData.isCeiling = true;
    group.add(ceilingThreeStar);

    // ========== PAN-AFRICAN LIBRARY - Publications, Archives, Video ==========
    // CURATORIAL BRIEF: Collective listening space for sound library, radio,
    // DJ sets, readings, performances, poetry, round tables
    //
    // SPATIAL RULES:
    // - Primary function = LISTENING
    // - Clear central area for gatherings/performances
    // - Low seating that doesn't block circulation
    // - Speakers face inward, not blocked
    // - Minimum 1.1m circulation paths

    // Windows at SOUTH (-Z), entry door at NORTH (+Z) on west side
    const windowZ = -THREE_STAR_DEPTH / 2 + 1.2;   // Near window wall (south)
    const entryZ = THREE_STAR_DEPTH / 2 - 1.5;     // Near entry (north)
    const mainRoomZ = 0;                            // Center of room

    // Helper to add furniture with proper marking
    function addFurniture(item, name) {
        item.userData.isFurniture = true;
        item.userData.itemType = name;
        item.name = name;
        group.add(item);
    }

    // === FLOOR RUG - large rug covering main floor area ===
    const mainRug = createWaxPrintRug(0xc41e3a, 0xffd700);  // Red with gold circles
    mainRug.position.set(0, 0, mainRoomZ);
    mainRug.scale.set(1.5, 1, 1.5);
    addFurniture(mainRug, 'rug-main');

    // === BANQUETTE-SHELF UNITS along walls (seating against walls, center clear) ===
    // Long banquette against east wall (exterior, +X) — full length
    const banquetteEast = createBanquetteShelfUnit(5.0);
    banquetteEast.position.set(THREE_STAR_WIDTH / 2 - 0.3, 0, 0);
    banquetteEast.rotation.y = -Math.PI / 2;
    addFurniture(banquetteEast, 'banquette-east');

    // Banquette against west wall (shared wall, -X) — shorter, north of connecting door
    const banquetteWest = createBanquetteShelfUnit(3.5);
    banquetteWest.position.set(-THREE_STAR_WIDTH / 2 + 0.3, 0, 1.2);
    banquetteWest.rotation.y = Math.PI / 2;
    addFurniture(banquetteWest, 'banquette-west');

    // === COFFEE TABLES next to banquettes ===
    const coffeeTable1 = createLowCoffeeTable();
    coffeeTable1.position.set(THREE_STAR_WIDTH / 2 - 0.9, 0, -1.5);
    addFurniture(coffeeTable1, 'coffee-table-1');

    const coffeeTable2 = createLowCoffeeTable();
    coffeeTable2.position.set(THREE_STAR_WIDTH / 2 - 0.9, 0, 1.5);
    addFurniture(coffeeTable2, 'coffee-table-2');

    const coffeeTable3 = createLowCoffeeTable();
    coffeeTable3.position.set(-THREE_STAR_WIDTH / 2 + 0.9, 0, 1.2);
    addFurniture(coffeeTable3, 'coffee-table-3');

    // === BOOKSHELVES along walls ===
    const bookshelf1 = createWallBookcase();
    bookshelf1.position.set(THREE_STAR_WIDTH / 2 - 0.15, 0, -3.0);
    bookshelf1.rotation.y = -Math.PI / 2;
    addFurniture(bookshelf1, 'bookshelf-east-1');

    const bookshelf2 = createWallBookcase();
    bookshelf2.position.set(-THREE_STAR_WIDTH / 2 + 0.15, 0, -2.0);
    bookshelf2.rotation.y = Math.PI / 2;
    addFurniture(bookshelf2, 'bookshelf-west-1');

    // === WOVEN MAT on floor (center) ===
    const listeningMat = createAfricanNatte();
    listeningMat.position.set(0, 0.01, mainRoomZ);
    addFurniture(listeningMat, 'natte-mat');

    // === AFRIKADAA WALL ART ===
    const posterWallX = -THREE_STAR_WIDTH / 2 + 0.16;

    const afrikadaaPoster1 = createAfrikadaaPoster('AFRIKADAA', 0xc41e3a, 0.5, 0.7);
    afrikadaaPoster1.position.set(posterWallX, 2.2, mainRoomZ - 2.5);
    afrikadaaPoster1.rotation.y = Math.PI / 2;
    afrikadaaPoster1.userData.isWallArt = true;
    addFurniture(afrikadaaPoster1, 'poster-afrikadaa-1');

    const afrikadaaPoster2 = createAfrikadaaPoster('PANAFRICAN', 0xfdd835, 0.4, 0.5);
    afrikadaaPoster2.position.set(posterWallX, 2.0, mainRoomZ + 2.0);
    afrikadaaPoster2.rotation.y = Math.PI / 2;
    afrikadaaPoster2.userData.isWallArt = true;
    addFurniture(afrikadaaPoster2, 'poster-afrikadaa-2');

    return group;
}

// ============ SPECIAL SPECIAL / SOUND LIBRARY (EAST) ============
// LAYOUT FROM FLOOR PLAN (STUDIO corridor at TOP = NORTH = +Z):
// - Windows on SOUTH wall (-Z) - 3 windows with 2 columns - BOTTOM of floor plan
// - Entry corridor at NORTH-CENTER (+Z) projecting into STUDIO - TOP CENTER
// - Door to THREE STAR on WEST wall (-X), near SOUTH end - BOTTOM LEFT
// - EAST wall (+X) is solid exterior
function createSpecialSpecial() {
    const group = new THREE.Group();

    // ========== MAIN ROOM FLOOR ==========
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(SPECIAL_SPECIAL_WIDTH, SPECIAL_SPECIAL_DEPTH),
        floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, 0);
    group.add(floor);

    // ========== ENTRY CORRIDOR - Partition walls from side walls creating enclosed corridor ==========
    // Per floor plan: The corridor is formed by TWO partition walls that run SOUTH
    // from the north wall. Each partition connects to its respective side wall,
    // creating a narrow corridor passage in the center and closed-off zones on each side.
    //
    // Layout (looking from above, north at top):
    //   NORTH WALL (with door opening in center)
    //   |  closed  |  corridor  |  closed  |
    //   | west zone|  (0.85m)   | east zone|
    //   WEST WALL  | partition  | partition |  EAST (shared wall)
    //              | wall west  | wall east |
    //              +============+===========+ <-- partition ends ~3.1m south of north wall
    //              |      MAIN ROOM         |
    //
    const corridorShaftDepth = 3.105;  // ~10'-2¼" partition depth into room
    const corridorCenterX = 0;  // Corridor centered in room
    const corridorLeftEdge = corridorCenterX - SPECIAL_SPECIAL_CORRIDOR_WIDTH / 2;
    const corridorRightEdge = corridorCenterX + SPECIAL_SPECIAL_CORRIDOR_WIDTH / 2;
    const partitionThickness = WALL_THICKNESS;  // Same thickness as room walls (0.152m / 6")

    // WEST partition wall — runs from corridor left edge to west exterior wall
    // This wall extends from north wall southward, closing off the west zone
    const westPartitionWidth = SPECIAL_SPECIAL_WIDTH / 2 + corridorLeftEdge;  // distance from west wall to corridor
    if (westPartitionWidth > 0.05) {
        const westPartition = new THREE.Mesh(
            new THREE.BoxGeometry(westPartitionWidth, CEILING_HEIGHT, partitionThickness),
            brickMaterial
        );
        westPartition.position.set(
            -SPECIAL_SPECIAL_WIDTH / 2 + westPartitionWidth / 2,
            CEILING_HEIGHT / 2,
            SPECIAL_SPECIAL_DEPTH / 2 - corridorShaftDepth  // South end of partition
        );
        group.add(westPartition);

        // West corridor side wall — thin wall along the corridor's west side
        const westCorridorWall = new THREE.Mesh(
            new THREE.BoxGeometry(partitionThickness, CEILING_HEIGHT, corridorShaftDepth),
            brickMaterial
        );
        westCorridorWall.position.set(
            corridorLeftEdge - partitionThickness / 2,
            CEILING_HEIGHT / 2,
            SPECIAL_SPECIAL_DEPTH / 2 - corridorShaftDepth / 2
        );
        group.add(westCorridorWall);
    }

    // EAST partition wall — runs from corridor right edge to east shared wall
    // This wall extends from north wall southward, closing off the east zone
    const eastPartitionWidth = SPECIAL_SPECIAL_WIDTH / 2 - corridorRightEdge;  // distance from corridor to east wall
    if (eastPartitionWidth > 0.05) {
        const eastPartition = new THREE.Mesh(
            new THREE.BoxGeometry(eastPartitionWidth, CEILING_HEIGHT, partitionThickness),
            brickMaterial
        );
        eastPartition.position.set(
            SPECIAL_SPECIAL_WIDTH / 2 - eastPartitionWidth / 2,
            CEILING_HEIGHT / 2,
            SPECIAL_SPECIAL_DEPTH / 2 - corridorShaftDepth  // South end of partition
        );
        group.add(eastPartition);

        // East corridor side wall — thin wall along the corridor's east side
        const eastCorridorWall = new THREE.Mesh(
            new THREE.BoxGeometry(partitionThickness, CEILING_HEIGHT, corridorShaftDepth),
            brickMaterial
        );
        eastCorridorWall.position.set(
            corridorRightEdge + partitionThickness / 2,
            CEILING_HEIGHT / 2,
            SPECIAL_SPECIAL_DEPTH / 2 - corridorShaftDepth / 2
        );
        group.add(eastCorridorWall);
    }

    // Door header at south entry of vestibule corridor (standard door height opening)
    const vestibuleDoorHeader = new THREE.Mesh(
        new THREE.BoxGeometry(SPECIAL_SPECIAL_CORRIDOR_WIDTH, CEILING_HEIGHT - DOOR_HEIGHT, partitionThickness),
        brickMaterial
    );
    vestibuleDoorHeader.position.set(
        corridorCenterX,
        DOOR_HEIGHT + (CEILING_HEIGHT - DOOR_HEIGHT) / 2,
        SPECIAL_SPECIAL_DEPTH / 2 - corridorShaftDepth
    );
    group.add(vestibuleDoorHeader);

    // ========== SOUTH WALL (-Z) - PS1 Industrial Windows (BOTTOM of floor plan) ==========
    const southWallGroup = new THREE.Group();

    // Wall below windows
    const southWallBase = new THREE.Mesh(
        new THREE.BoxGeometry(SPECIAL_SPECIAL_WIDTH, PS1_WINDOW_SILL, WALL_THICKNESS),
        brickMaterial
    );
    southWallBase.position.set(0, PS1_WINDOW_SILL / 2, -SPECIAL_SPECIAL_DEPTH / 2);
    southWallGroup.add(southWallBase);

    // Wall above windows
    const topWallHeightSS = CEILING_HEIGHT - PS1_WINDOW_SILL - PS1_WINDOW_HEIGHT;
    const southWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(SPECIAL_SPECIAL_WIDTH, topWallHeightSS, WALL_THICKNESS),
        brickMaterial
    );
    southWallTop.position.set(0, PS1_WINDOW_SILL + PS1_WINDOW_HEIGHT + topWallHeightSS / 2, -SPECIAL_SPECIAL_DEPTH / 2);
    southWallGroup.add(southWallTop);

    // 2 windows with 1 column (same as THREE STAR per floor plan)
    const windowCenterYSS = PS1_WINDOW_SILL + PS1_WINDOW_HEIGHT / 2;

    // Calculate positions: 2 windows + 1 column in center, wall on each side
    const windowWidthSS = (SPECIAL_SPECIAL_WIDTH - 0.4 - PS1_COLUMN_WIDTH) / 2;  // 2 windows
    const sideWallWidthSS = 0.2;  // Side wall sections

    // Left window position
    const leftWindowXSS = -SPECIAL_SPECIAL_WIDTH / 2 + sideWallWidthSS + windowWidthSS / 2;
    // Right window position
    const rightWindowXSS = SPECIAL_SPECIAL_WIDTH / 2 - sideWallWidthSS - windowWidthSS / 2;

    // Left (west-side) window — has AC unit in top half
    const win1SS = createPS1Window(windowWidthSS * 0.9, PS1_WINDOW_HEIGHT, true);
    win1SS.position.set(leftWindowXSS, windowCenterYSS, -SPECIAL_SPECIAL_DEPTH / 2 + 0.02);
    win1SS.rotation.y = Math.PI;  // Face into room
    southWallGroup.add(win1SS);

    // Right (east-side) window
    const win2SS = createPS1Window(windowWidthSS * 0.9, PS1_WINDOW_HEIGHT);
    win2SS.position.set(rightWindowXSS, windowCenterYSS, -SPECIAL_SPECIAL_DEPTH / 2 + 0.02);
    win2SS.rotation.y = Math.PI;  // Face into room
    southWallGroup.add(win2SS);

    // Fluted column between windows (centered)
    const columnSS = createFlutedColumn(PS1_WINDOW_HEIGHT);
    columnSS.position.set(0, PS1_WINDOW_SILL, -SPECIAL_SPECIAL_DEPTH / 2 + 0.02);
    southWallGroup.add(columnSS);

    // Side wall sections
    const sideWidthSS = 0.2;
    const leftSideSS = new THREE.Mesh(
        new THREE.BoxGeometry(sideWidthSS, PS1_WINDOW_HEIGHT, WALL_THICKNESS),
        brickMaterial
    );
    leftSideSS.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + sideWidthSS / 2, windowCenterYSS, -SPECIAL_SPECIAL_DEPTH / 2);
    southWallGroup.add(leftSideSS);

    const rightSideSS = new THREE.Mesh(
        new THREE.BoxGeometry(sideWidthSS, PS1_WINDOW_HEIGHT, WALL_THICKNESS),
        brickMaterial
    );
    rightSideSS.position.set(SPECIAL_SPECIAL_WIDTH / 2 - sideWidthSS / 2, windowCenterYSS, -SPECIAL_SPECIAL_DEPTH / 2);
    southWallGroup.add(rightSideSS);

    group.add(southWallGroup);
    specialSpecialRoomWalls.front = southWallGroup;  // Windows (south)

    // ========== NORTH WALL (+Z) - Entry door opening centered ==========
    const northWallGroup = new THREE.Group();

    // The north wall has the corridor door opening in the center
    // The partition walls connect to the side walls, so the opening is just the corridor width
    const openingLeftEdge = corridorLeftEdge;
    const openingRightEdge = corridorRightEdge;

    // Wall section WEST of opening
    const westOfOpeningWidth = SPECIAL_SPECIAL_WIDTH / 2 + openingLeftEdge;
    if (westOfOpeningWidth > 0.05) {
        const northWallWest = new THREE.Mesh(
            new THREE.BoxGeometry(westOfOpeningWidth, CEILING_HEIGHT, WALL_THICKNESS),
            brickMaterial
        );
        northWallWest.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + westOfOpeningWidth / 2, CEILING_HEIGHT / 2, SPECIAL_SPECIAL_DEPTH / 2);
        northWallGroup.add(northWallWest);
    }

    // Wall section EAST of opening
    const eastOfOpeningWidth = SPECIAL_SPECIAL_WIDTH / 2 - openingRightEdge;
    if (eastOfOpeningWidth > 0.05) {
        const northWallEast = new THREE.Mesh(
            new THREE.BoxGeometry(eastOfOpeningWidth, CEILING_HEIGHT, WALL_THICKNESS),
            brickMaterial
        );
        northWallEast.position.set(SPECIAL_SPECIAL_WIDTH / 2 - eastOfOpeningWidth / 2, CEILING_HEIGHT / 2, SPECIAL_SPECIAL_DEPTH / 2);
        northWallGroup.add(northWallEast);
    }

    // Door header above the entry (spans the corridor width between the shafts)
    const northDoorHeader = new THREE.Mesh(
        new THREE.BoxGeometry(SPECIAL_SPECIAL_CORRIDOR_WIDTH, CEILING_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS),
        brickMaterial
    );
    northDoorHeader.position.set(corridorCenterX, DOOR_HEIGHT + (CEILING_HEIGHT - DOOR_HEIGHT) / 2, SPECIAL_SPECIAL_DEPTH / 2);
    northWallGroup.add(northDoorHeader);

    group.add(northWallGroup);
    specialSpecialRoomWalls.back = northWallGroup;  // Entry from STUDIO

    // ========== WEST WALL (-X) - Solid exterior wall ==========
    // Extend wall by WALL_THICKNESS at both ends to meet corner walls properly
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, CEILING_HEIGHT, SPECIAL_SPECIAL_DEPTH + 2 * WALL_THICKNESS),
        brickMaterial
    );
    westWall.position.set(-SPECIAL_SPECIAL_WIDTH / 2, CEILING_HEIGHT / 2, 0);
    group.add(westWall);
    specialSpecialRoomWalls.left = westWall;

    // ========== EAST WALL (+X) - NO wall here, connects to THREE STAR ==========
    // The wall between rooms is created by THREE STAR's west wall with the connecting door
    specialSpecialRoomWalls.right = null;

    // ========== CEILING ==========
    const ceilingSS = new THREE.Mesh(
        new THREE.PlaneGeometry(SPECIAL_SPECIAL_WIDTH, SPECIAL_SPECIAL_DEPTH),
        ceilingMaterial
    );
    ceilingSS.rotation.x = Math.PI / 2;
    ceilingSS.position.set(0, CEILING_HEIGHT, 0);
    ceilingSS.userData.isCeiling = true;
    group.add(ceilingSS);

    // ========== SOUND LIBRARY - Audio/Radio/DJ/Collective Listening ==========
    // CURATORIAL BRIEF: Reading room for ~50 publications, AABF archives,
    // video interviews, publishing network mapping
    //
    // FUNCTIONS: Read, browse, watch, listen, move quietly
    //
    // SPATIAL RULES:
    // - Reading/browsing are PRIMARY
    // - Books visible, legible, face-up or face-out
    // - Clear viewing direction for screens
    // - Minimum 1.1m circulation paths
    // - 1.2m clearance from door
    // - NO domestic furniture (sofas, armchairs, coffee tables)

    // Helper to add furniture with proper marking
    function addFurniture(item, name, isWall = false) {
        item.userData.isFurniture = true;
        item.userData.itemType = name;
        item.userData.isWallArt = isWall;
        item.name = name;
        group.add(item);
    }

    // === SOUND LIBRARY MAIN ROOM ===
    // The main room is the area SOUTH of the partition walls
    // Windows at SOUTH (-Z), corridor opens at ~3.1m from north
    // Connecting door to Three Star on east side near south end
    // CENTER MUST BE CLEAR — people walk through both rooms via connecting door
    const mainRoomCenterZ = -corridorShaftDepth / 2;  // Center of usable main room area
    const windowZ = -SPECIAL_SPECIAL_DEPTH / 2 + 1.0;  // Near south window wall

    // === FLOOR RUG — dark blue wax print covering main area ===
    const mainRug = createWaxPrintRug(0x1a3a5c, 0xffd700);  // Dark blue with gold
    mainRug.position.set(0, 0, mainRoomCenterZ);
    mainRug.scale.set(1.2, 1, 1.2);
    addFurniture(mainRug, 'rug-main-ss');

    // === BANQUETTE-SHELF against west wall (exterior, -X) ===
    const banquetteWest = createBanquetteShelfUnit(3.0);
    banquetteWest.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.3, 0, mainRoomCenterZ);
    banquetteWest.rotation.y = Math.PI / 2;
    addFurniture(banquetteWest, 'banquette-west-ss');

    // === BANQUETTE-SHELF against east wall (shared wall, +X) — north of connecting door ===
    const banquetteEast = createBanquetteShelfUnit(2.0);
    banquetteEast.position.set(SPECIAL_SPECIAL_WIDTH / 2 - 0.3, 0, mainRoomCenterZ + 0.8);
    banquetteEast.rotation.y = -Math.PI / 2;
    addFurniture(banquetteEast, 'banquette-east-ss');

    // === COFFEE TABLES next to banquettes ===
    const coffeeTableSS1 = createLowCoffeeTable();
    coffeeTableSS1.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.9, 0, mainRoomCenterZ - 0.8);
    addFurniture(coffeeTableSS1, 'coffee-table-ss-1');

    const coffeeTableSS2 = createLowCoffeeTable();
    coffeeTableSS2.position.set(SPECIAL_SPECIAL_WIDTH / 2 - 0.9, 0, mainRoomCenterZ + 0.8);
    addFurniture(coffeeTableSS2, 'coffee-table-ss-2');

    // === BOOKSHELVES along walls ===
    const bookshelfSS1 = createWallBookcase();
    bookshelfSS1.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.15, 0, windowZ + 0.5);
    bookshelfSS1.rotation.y = Math.PI / 2;
    addFurniture(bookshelfSS1, 'bookshelf-west-ss');

    // === SPEAKERS against walls (corners) ===
    const speaker1 = createFloorSpeaker();
    speaker1.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.25, 0, windowZ + 0.2);
    speaker1.rotation.y = Math.PI * 0.25;
    addFurniture(speaker1, 'speaker-left');

    const speaker2 = createFloorSpeaker();
    speaker2.position.set(SPECIAL_SPECIAL_WIDTH / 2 - 0.25, 0, windowZ + 0.2);
    speaker2.rotation.y = -Math.PI * 0.25;
    addFurniture(speaker2, 'speaker-right');

    // === HEADPHONE STATIONS against west wall ===
    const headphones1 = createHeadphoneStation();
    headphones1.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.35, 0, mainRoomCenterZ + 1.0);
    addFurniture(headphones1, 'headphone-station-1');

    // === AFRIKADAA POSTER WALL — on west wall above banquette ===
    const posterA1 = createAfrikadaaPoster('AFRIKADAA', 0xd32f2f, 0.55, 0.75);
    posterA1.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.02, 1.7, mainRoomCenterZ - 1.0);
    posterA1.rotation.y = Math.PI / 2;
    addFurniture(posterA1, 'poster-ss-1', true);

    const posterA2 = createAfrikadaaPoster('SOUND', 0xfbc02d, 0.45, 0.6);
    posterA2.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.02, 1.5, mainRoomCenterZ);
    posterA2.rotation.y = Math.PI / 2;
    addFurniture(posterA2, 'poster-ss-2', true);

    const posterA3 = createAfrikadaaPoster('LIBRARY', 0x1976d2, 0.5, 0.65);
    posterA3.position.set(-SPECIAL_SPECIAL_WIDTH / 2 + 0.02, 1.75, mainRoomCenterZ + 1.0);
    posterA3.rotation.y = Math.PI / 2;
    addFurniture(posterA3, 'poster-ss-3', true);

    // === MINIMAL LIGHTING ===
    const pendant1 = createSimplePendant();
    pendant1.position.set(0, CEILING_HEIGHT - 0.4, mainRoomCenterZ);
    addFurniture(pendant1, 'pendant-ss-1');

    return group;
}

// Create and position rooms
// Looking at floor plan CAREFULLY:
// - The NORTH walls are ALIGNED at the STUDIO corridor
// - SPECIAL SPECIAL is shorter, so its SOUTH wall (windows) is set back from THREE STAR's
//
// Align NORTH walls (both flush with STUDIO corridor):
// THREE STAR north wall: +THREE_STAR_DEPTH/2
// SPECIAL SPECIAL north wall (in world coords): offset + SPECIAL_SPECIAL_DEPTH/2 = THREE_STAR_DEPTH/2
// offset = THREE_STAR_DEPTH/2 - SPECIAL_SPECIAL_DEPTH/2
const SPECIAL_SPECIAL_Z_OFFSET = THREE_STAR_DEPTH / 2 - SPECIAL_SPECIAL_DEPTH / 2;

const threeStarRoom = createThreeStar();
threeStarRoom.position.set(THREE_STAR_X, 0, 0);
scene.add(threeStarRoom);

const specialSpecialRoom = createSpecialSpecial();
// Position Special Special so its NORTH wall aligns with Three Star's north wall (STUDIO corridor)
specialSpecialRoom.position.set(SPECIAL_SPECIAL_X, 0, SPECIAL_SPECIAL_Z_OFFSET);
scene.add(specialSpecialRoom);

// ========== NORTH CORRIDOR (STUDIO HALLWAY) ==========
// The hallway just outside both room doors, running east-west along the north side
// Both rooms' north walls align at Z = THREE_STAR_DEPTH/2
// North corridor — open hallway (no east/west end walls per floor plan)
const northCorridorGroup = (function createNorthCorridor() {
    const corridorGroup = new THREE.Group();
    const corridorDepth = 2.5;   // ~8 feet deep corridor
    const corridorFloorMat = new THREE.MeshLambertMaterial({ color: 0xb0b0a8 }); // grey concrete
    const corridorWallMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });  // off-white plaster
    const corridorCeilMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide });

    const corridorWestEdge = SPECIAL_SPECIAL_X - SPECIAL_SPECIAL_WIDTH / 2;
    const corridorEastEdge = THREE_STAR_X + THREE_STAR_WIDTH / 2;
    const corridorCenterX = (corridorWestEdge + corridorEastEdge) / 2;
    const corridorWidth = corridorEastEdge - corridorWestEdge;

    const northWallZ = THREE_STAR_DEPTH / 2;
    const farWallZ = northWallZ + corridorDepth;

    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(corridorWidth + 0.3, corridorDepth),
        corridorFloorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(corridorCenterX, 0.001, northWallZ + corridorDepth / 2);
    corridorGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(corridorWidth + 0.3, corridorDepth),
        corridorCeilMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(corridorCenterX, CEILING_HEIGHT, northWallZ + corridorDepth / 2);
    ceiling.userData.isCeiling = true;
    corridorGroup.add(ceiling);

    // Far (north) corridor wall only — opposite side of hallway from room doors
    const farWall = new THREE.Mesh(
        new THREE.BoxGeometry(corridorWidth + 0.3, CEILING_HEIGHT, WALL_THICKNESS),
        corridorWallMat
    );
    farWall.position.set(corridorCenterX, CEILING_HEIGHT / 2, farWallZ);
    corridorGroup.add(farWall);

    scene.add(corridorGroup);
    return corridorGroup;
})();

// ========== SOUTH EXTERIOR VIEW — JACKSON AVENUE, LONG ISLAND CITY ==========
// Visible through the south-facing windows: Jackson Ave, buildings, Manhattan skyline
const southExteriorGroup = (function createExteriorView() {
    const extGroup = new THREE.Group();

    // The south wall (windows) of Three Star is at Z = -THREE_STAR_DEPTH/2
    // Place exterior elements south of that
    const windowWallZ = -THREE_STAR_DEPTH / 2;
    const streetZ = windowWallZ - 8;  // Jackson Avenue ~8m from building face
    const buildingsZ = windowWallZ - 20; // Buildings across the street
    const skylineZ = windowWallZ - 80;  // Manhattan skyline in far distance

    // --- SIDEWALK + STREET ---
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x999990 });
    const sidewalk = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 3),
        sidewalkMat
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.01, windowWallZ - 2);
    extGroup.add(sidewalk);

    const streetMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const street = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 10),
        streetMat
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.005, streetZ);
    extGroup.add(street);

    // Lane markings
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xcccc77 });
    for (let i = -12; i < 12; i += 3) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.1), laneMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(i, 0.01, streetZ);
        extGroup.add(dash);
    }

    // Far sidewalk
    const farSidewalk = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 2.5),
        sidewalkMat
    );
    farSidewalk.rotation.x = -Math.PI / 2;
    farSidewalk.position.set(0, 0.01, streetZ - 6.5);
    extGroup.add(farSidewalk);

    // --- BUILDINGS ACROSS JACKSON AVE ---
    const bldgMat1 = new THREE.MeshLambertMaterial({ color: 0xc8b898 }); // beige brick
    const bldgMat2 = new THREE.MeshLambertMaterial({ color: 0x889098 }); // modern grey
    const bldgMat3 = new THREE.MeshLambertMaterial({ color: 0xb04030 }); // red brick
    const bldgWindowMat = new THREE.MeshLambertMaterial({ color: 0x445566, transparent: true, opacity: 0.7 });

    function createBuilding(x, z, w, h, d, mat) {
        const bldg = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        body.position.set(0, h / 2, 0);
        bldg.add(body);
        // Window grid on front face
        const winRows = Math.floor(h / 1.2);
        const winCols = Math.floor(w / 1.5);
        for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
                const win = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.8, 0.9),
                    bldgWindowMat
                );
                win.position.set(
                    -w / 2 + 0.8 + c * (w / winCols),
                    1.5 + r * 1.2,
                    d / 2 + 0.01
                );
                bldg.add(win);
            }
        }
        bldg.position.set(x, 0, z);
        return bldg;
    }

    // Court Square Diner (small, one-story with awning)
    const diner = new THREE.Group();
    const dinerBody = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 4), new THREE.MeshLambertMaterial({ color: 0xd0d0c8 }));
    dinerBody.position.set(0, 1.75, 0);
    diner.add(dinerBody);
    // Awning
    const awningMat = new THREE.MeshLambertMaterial({ color: 0xcc3333, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.5), awningMat);
    awning.rotation.x = -0.3;
    awning.position.set(0, 3.2, 2.3);
    diner.add(awning);
    // Sign
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.6), signMat);
    sign.position.set(0, 3.8, 2.01);
    diner.add(sign);
    diner.position.set(-3, 0, buildingsZ);
    extGroup.add(diner);

    // Modern residential building (taller)
    extGroup.add(createBuilding(6, buildingsZ - 2, 8, 18, 8, bldgMat2));

    // Red brick building
    extGroup.add(createBuilding(-10, buildingsZ - 1, 6, 12, 6, bldgMat3));

    // Office building
    extGroup.add(createBuilding(14, buildingsZ - 3, 7, 22, 7, bldgMat2));

    // --- MANHATTAN SKYLINE (far background) ---
    const skylineMat = new THREE.MeshLambertMaterial({ color: 0x8090a0 }); // hazy blue-grey
    const skylineAccent = new THREE.MeshLambertMaterial({ color: 0x708090 });

    // Simplified skyline silhouette — a row of tall shapes
    const skylineBuildings = [
        { x: -25, w: 4, h: 45, d: 4 },  // residential tower
        { x: -18, w: 5, h: 60, d: 5 },  // office tower
        { x: -10, w: 3, h: 50, d: 3 },  // slim tower
        { x: -4, w: 6, h: 80, d: 5 },   // tall midtown tower
        { x: 3, w: 4, h: 70, d: 4 },    // Empire State scale
        { x: 9, w: 7, h: 55, d: 6 },    // broad tower
        { x: 16, w: 3, h: 65, d: 3 },   // slim spire
        { x: 22, w: 5, h: 48, d: 5 },   // another tower
        { x: 28, w: 4, h: 58, d: 4 },   // far tower
    ];
    skylineBuildings.forEach(b => {
        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(b.w, b.h, b.d),
            b.h > 65 ? skylineAccent : skylineMat
        );
        tower.position.set(b.x, b.h / 2, skylineZ);
        extGroup.add(tower);
    });

    // SKY backdrop — large blue-grey plane behind everything
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xc4cdd6, side: THREE.DoubleSide });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), skyMat);
    sky.position.set(0, 40, skylineZ - 20);
    extGroup.add(sky);

    // Ground plane extending south
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x707068 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, windowWallZ - 60);
    extGroup.add(ground);

    // MoMA PS1 rooms are on the second floor — drop exterior down one story (~4.5m)
    extGroup.position.y = -4.5;
    scene.add(extGroup);
    return extGroup;
})();

// ============================================================
// MAKE ALL DEFAULT FURNITURE EDITABLE
// Items marked with userData.isFurniture are moved to scene root
// and added to placedItems array for selection/editing
// ============================================================
function registerEditableFurniture() {
    function processRoom(roomGroup) {
        const furnitureToMove = [];

        // Find all direct children marked as furniture
        roomGroup.children.forEach(child => {
            if (child.userData.isFurniture) {
                furnitureToMove.push(child);
            }
        });

        // Move furniture from room group to scene directly
        furnitureToMove.forEach(item => {
            // Calculate world position
            const worldPos = new THREE.Vector3();
            item.getWorldPosition(worldPos);
            const worldRot = item.rotation.clone();

            // Remove from room group
            roomGroup.remove(item);

            // Add to scene directly with world position
            item.position.copy(worldPos);
            item.rotation.copy(worldRot);
            item.userData.isPlacedItem = true;

            scene.add(item);
            placedItems.push(item);
        });
    }

    processRoom(threeStarRoom);
    processRoom(specialSpecialRoom);

    console.log('Registered', placedItems.length, 'editable furniture items');
}

// Register furniture after a short delay to ensure scene is ready
setTimeout(registerEditableFurniture, 100);

// Room labels
function createLabel(text, position) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 10);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.6, 1);
    sprite.position.copy(position);
    return sprite;
}

labelsGroup.add(createLabel('PANAFRICAN LIBRARY', new THREE.Vector3(THREE_STAR_X, CEILING_HEIGHT + 0.5, 0)));
labelsGroup.add(createLabel('SOUND LIBRARY', new THREE.Vector3(SPECIAL_SPECIAL_X, CEILING_HEIGHT + 0.5, 0)));
scene.add(labelsGroup);

// Lighting — overcast day: very soft diffused window light, strong ceiling spots
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xdde0e8, 0.2);
directionalLight.position.set(5, 12, -8); // from south (window side), low angle
directionalLight.castShadow = true;
scene.add(directionalLight);
const fillLight = new THREE.DirectionalLight(0xdde0e8, 0.15);
fillLight.position.set(-5, 10, -6);
scene.add(fillLight);
const threeStarRoomLight = new THREE.PointLight(0xffffee, 0.4, 12);
threeStarRoomLight.position.set(THREE_STAR_X, CEILING_HEIGHT - 0.5, 0);
scene.add(threeStarRoomLight);
const specialSpecialRoomLight = new THREE.PointLight(0xffffee, 0.4, 12);
specialSpecialRoomLight.position.set(SPECIAL_SPECIAL_X, CEILING_HEIGHT - 0.5, 0);
scene.add(specialSpecialRoomLight);

// ========== GALLERY CEILING SPOTLIGHTS ==========
// White track-mounted spotlights evenly distributed across both rooms
const spotlightMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
const spotlightEmissive = new THREE.MeshBasicMaterial({ color: 0xffffee });

function createCeilingSpotlight(worldX, worldZ) {
    const group = new THREE.Group();

    // Track rail segment (horizontal bar flush to ceiling)
    const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.03, 0.03),
        spotlightMat
    );
    rail.position.set(0, 0, 0);
    group.add(rail);

    // Spotlight housing (cylinder hanging from rail)
    const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.10, 12),
        spotlightMat
    );
    housing.position.set(0, -0.07, 0);
    group.add(housing);

    // Lens / bulb face (glowing disc at bottom)
    const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 12),
        spotlightEmissive
    );
    lens.rotation.x = Math.PI / 2; // face down
    lens.position.set(0, -0.12, 0);
    group.add(lens);

    group.position.set(worldX, CEILING_HEIGHT - 0.01, worldZ);
    group.userData.isCeiling = true;
    group.traverse(child => { child.userData.isCeiling = true; });

    // Actual SpotLight for illumination — gallery-bright, wide wash
    const spotLight = new THREE.SpotLight(0xffffff, 2.0, 12, Math.PI / 4, 0.6, 0.8);
    spotLight.position.set(worldX, CEILING_HEIGHT - 0.13, worldZ);
    spotLight.target.position.set(worldX, 0, worldZ);
    spotLight.userData.isCeiling = true;
    scene.add(spotLight);
    scene.add(spotLight.target);

    scene.add(group);
    return group;
}

// Panafrican Library (Three Star) — 4×5 grid of spotlights
const tsMinX = THREE_STAR_X - THREE_STAR_WIDTH / 2;
const tsMaxX = THREE_STAR_X + THREE_STAR_WIDTH / 2;
const tsMinZ = -THREE_STAR_DEPTH / 2;
const tsMaxZ = THREE_STAR_DEPTH / 2;
const tsCols = 4, tsRows = 5;
for (let c = 0; c < tsCols; c++) {
    for (let r = 0; r < tsRows; r++) {
        const x = tsMinX + (c + 0.5) * (THREE_STAR_WIDTH / tsCols);
        const z = tsMinZ + (r + 0.5) * (THREE_STAR_DEPTH / tsRows);
        createCeilingSpotlight(x, z);
    }
}

// Sound Library (Special Special) — 3×5 grid of spotlights
const ssZoff = SPECIAL_SPECIAL_Z_OFFSET;
const ssMinX = SPECIAL_SPECIAL_X - SPECIAL_SPECIAL_WIDTH / 2;
const ssMinZ = ssZoff - SPECIAL_SPECIAL_DEPTH / 2;
const ssCols = 3, ssRows = 5;
for (let c = 0; c < ssCols; c++) {
    for (let r = 0; r < ssRows; r++) {
        const x = ssMinX + (c + 0.5) * (SPECIAL_SPECIAL_WIDTH / ssCols);
        const z = ssMinZ + (r + 0.5) * (SPECIAL_SPECIAL_DEPTH / ssRows);
        createCeilingSpotlight(x, z);
    }
}

// Camera controls
let isMouseDown = false;
let mouseX = 0, mouseY = 0;
// Default view: Overview (bird's eye) from SOUTH looking NORTH
// This matches floor plan orientation: THREE STAR on LEFT (west), SPECIAL SPECIAL on RIGHT (east)
// rotationX = Math.PI puts camera at -Z (south) looking toward +Z (north)
let targetRotationX = Math.PI, targetRotationY = 0.5;
let currentRotationX = Math.PI, currentRotationY = 0.5;
let cameraDistance = 18;
let cameraTarget = new THREE.Vector3(0, 2, 0);

// Set initial camera position for overview - from SOUTH looking NORTH
camera.position.set(0, 18 * Math.sin(0.5), -18 * Math.cos(0.5));
camera.lookAt(cameraTarget);

let isShiftDown = false;
document.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftDown = true; });
document.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftDown = false; });

container.addEventListener('mousedown', (e) => {
    if (!isCameraOrbitBlocked) {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
});
container.addEventListener('mouseup', () => isMouseDown = false);
container.addEventListener('mouseleave', () => isMouseDown = false);

container.addEventListener('mousemove', (e) => {
    if (!isMouseDown || isCameraOrbitBlocked) return;
    const dx = e.clientX - mouseX;
    const dy = e.clientY - mouseY;

    if (isShiftDown || e.shiftKey) {
        // Shift+drag = PAN camera target left/right/up/down
        const panSpeed = 0.005 * cameraDistance;
        // Calculate camera right and up vectors for panning in view space
        const forward = new THREE.Vector3().subVectors(cameraTarget, camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        cameraTarget.add(right.multiplyScalar(-dx * panSpeed));
        cameraTarget.add(up.multiplyScalar(dy * panSpeed));
    } else {
        // Normal drag = ORBIT camera around target
        targetRotationX += dx * 0.005;
        targetRotationY += dy * 0.005;
        targetRotationY = Math.max(-0.5, Math.min(1.2, targetRotationY));
    }
    mouseX = e.clientX; mouseY = e.clientY;
});

container.addEventListener('wheel', (e) => {
    cameraDistance += e.deltaY * 0.01;
    cameraDistance = Math.max(3, Math.min(35, cameraDistance));
}, { passive: true });

const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Touch controls (2-finger = pan, 1-finger = orbit)
let touchCount = 0;
container.addEventListener('touchstart', (e) => {
    touchCount = e.touches.length;
    isMouseDown = true;
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
});
container.addEventListener('touchend', () => { isMouseDown = false; touchCount = 0; });
container.addEventListener('touchmove', (e) => {
    if (!isMouseDown) return;
    const dx = e.touches[0].clientX - mouseX;
    const dy = e.touches[0].clientY - mouseY;
    if (touchCount >= 2) {
        // Two-finger = PAN
        const panSpeed = 0.005 * cameraDistance;
        const forward = new THREE.Vector3().subVectors(cameraTarget, camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        cameraTarget.add(right.multiplyScalar(-dx * panSpeed));
        cameraTarget.add(up.multiplyScalar(dy * panSpeed));
    } else {
        targetRotationX += dx * 0.005;
        targetRotationY += dy * 0.005;
        targetRotationY = Math.max(-0.5, Math.min(1.2, targetRotationY));
    }
    mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY;
});

// View presets - CORRECTED FOR FLOOR PLAN ORIENTATION
// Floor plan: STUDIO corridor at TOP (NORTH = +Z), Windows at BOTTOM (SOUTH = -Z)
// Camera views - Windows at SOUTH (-Z), Entries at NORTH (+Z)
// rotX=Math.PI means camera at north (+Z, entry) looking south toward windows (-Z)
// rotX=0 means camera at south (-Z, windows) looking north toward entries (+Z)
const views = {
    // Overview from SOUTH looking NORTH - matches floor plan orientation
    // THREE STAR on LEFT (west), SPECIAL SPECIAL on RIGHT (east)
    overview: { rotX: Math.PI, rotY: 0.5, dist: 18, target: new THREE.Vector3(0, 2, 0) },
    floorPlan: { rotX: Math.PI, rotY: 1.5, dist: 14, target: new THREE.Vector3(0, 0, 0) },
    // THREE STAR views - Entry at NORTH (+Z), windows at SOUTH (-Z)
    // rotX=Math.PI puts camera at north (entry) looking toward south (windows)
    threeStarRoomEntry: { rotX: Math.PI, rotY: 0.15, dist: 3, target: new THREE.Vector3(THREE_STAR_X, 1.5, THREE_STAR_DEPTH / 2 - 1) },
    threeStarRoomInside: { rotX: Math.PI, rotY: 0.2, dist: 5, target: new THREE.Vector3(THREE_STAR_X, 1.5, 0) },
    threeStarRoomWindows: { rotX: Math.PI, rotY: 0.15, dist: 4, target: new THREE.Vector3(THREE_STAR_X, 1.5, -THREE_STAR_DEPTH / 4) },
    threeStarRoomTable: { rotX: Math.PI * 0.8, rotY: 0.25, dist: 4, target: new THREE.Vector3(THREE_STAR_X, 0.8, 0) },
    // SPECIAL SPECIAL views - Entry corridor at NORTH-CENTER (+Z), windows at SOUTH (-Z)
    // rotX=Math.PI puts camera at north (entry) looking toward south (windows)
    specialSpecialRoomEntry: { rotX: Math.PI, rotY: 0.15, dist: 3, target: new THREE.Vector3(SPECIAL_SPECIAL_X, 1.5, SPECIAL_SPECIAL_DEPTH / 2 - 1) },
    specialSpecialRoomInside: { rotX: Math.PI, rotY: 0.2, dist: 6, target: new THREE.Vector3(SPECIAL_SPECIAL_X, 1.5, 0) },
    specialSpecialRoomWindows: { rotX: Math.PI, rotY: 0.15, dist: 4, target: new THREE.Vector3(SPECIAL_SPECIAL_X, 1.5, -SPECIAL_SPECIAL_DEPTH / 4) },
    specialSpecialRoomSeating: { rotX: Math.PI * 0.7, rotY: 0.2, dist: 4, target: new THREE.Vector3(SPECIAL_SPECIAL_X, 0.5, 0.5) },
    specialSpecialRoomShelves: { rotX: Math.PI * 1.2, rotY: 0.2, dist: 5, target: new THREE.Vector3(SPECIAL_SPECIAL_X, 1.2, SPECIAL_SPECIAL_DEPTH / 3) }
};

function animateToView(view, duration = 1500) {
    const startRotX = currentRotationX, startRotY = currentRotationY;
    const startDist = cameraDistance;
    const startTarget = cameraTarget.clone();
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        targetRotationX = startRotX + (view.rotX - startRotX) * eased;
        targetRotationY = startRotY + (view.rotY - startRotY) * eased;
        cameraDistance = startDist + (view.dist - startDist) * eased;
        cameraTarget.lerpVectors(startTarget, view.target, eased);

        if (t < 1) requestAnimationFrame(update);
    }
    update();
}

// Legacy setView still works with old view keys for backwards compatibility
window.setView = function (viewName) { const view = views[viewName]; if (view) animateToView(view); };
window.focusRoom = function (room) {
    // Find matching saved view by name or fall back to legacy views
    if (room === 'threeStarRoom') {
        const idx = savedViews.findIndex(v => v.name === 'Inside View' && v.category && v.category.includes('Panafrican'));
        if (idx >= 0) loadView(idx); else setView('threeStarRoomInside');
    } else if (room === 'specialSpecialRoom') {
        const idx = savedViews.findIndex(v => v.name === 'Inside View' && v.category && v.category.includes('Sound'));
        if (idx >= 0) loadView(idx); else setView('specialSpecialRoomInside');
    }
};

let tourRunning = false;
window.startTour = function () {
    if (tourRunning) return;
    tourRunning = true;
    // Tour through all saved views in order
    let i = 0;
    function next() {
        if (i >= savedViews.length) { tourRunning = false; return; }
        const v = savedViews[i++];
        if (v && v.data) {
            animateToView({
                rotX: v.data.rotationX,
                rotY: v.data.rotationY,
                dist: v.data.distance,
                target: new THREE.Vector3(v.data.target.x, v.data.target.y, v.data.target.z)
            }, 2000);
        }
        setTimeout(next, 3500);
    }
    next();
};

// Toggle functions
let showGrid = true, showLabels = true, showCeiling = true, hideNearWall = true, showWireframe = false, showSurroundings = false;

window.toggleGrid = function () {
    showGrid = !showGrid;
    gridHelper.visible = showGrid;
    document.getElementById('gridBtn').classList.toggle('active', showGrid);
};

window.toggleLabels = function () {
    showLabels = !showLabels;
    labelsGroup.visible = showLabels;
    document.getElementById('labelsBtn').classList.toggle('active', showLabels);
};

window.toggleCeiling = function () {
    showCeiling = !showCeiling;
    if (ceilingCacheDirty) buildCeilingCache();
    for (let i = 0; i < ceilingObjects.length; i++) {
        ceilingObjects[i].visible = showCeiling;
    }
    lastCeilingState = null; // Reset so auto-visibility rechecks
    document.getElementById('ceilingBtn').classList.toggle('active', showCeiling);
};

window.toggleNearWall = function () {
    hideNearWall = !hideNearWall;
    document.getElementById('nearWallBtn').classList.toggle('active', hideNearWall);
};

window.toggleWireframe = function () {
    showWireframe = !showWireframe;
    document.getElementById('wireframeBtn').classList.toggle('active', showWireframe);
    scene.traverse((obj) => { if (obj.isMesh && obj.material) obj.material.wireframe = showWireframe; });
};

window.toggleSurroundings = function () {
    showSurroundings = !showSurroundings;
    if (northCorridorGroup) northCorridorGroup.visible = showSurroundings;
    if (southExteriorGroup) southExteriorGroup.visible = showSurroundings;
    document.getElementById('surroundingsBtn').classList.toggle('active', showSurroundings);
};

// Apply default: hide surroundings on load
if (northCorridorGroup) northCorridorGroup.visible = false;
if (southExteriorGroup) southExteriorGroup.visible = false;

window.captureScreenshot = function () {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'PanafricanLibrary_ReadingRoom.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
};

window.toggleMoodboard = function () {
    const modal = document.getElementById('moodboard-modal');
    const isOpening = modal.classList.contains('modal-hidden');
    modal.classList.toggle('modal-hidden');
    if (isOpening) {
        renderMoodboardGallery();
        // Close decorator panel if open
        const decoratorPanel = document.getElementById('decorator-panel');
        if (decoratorPanel && decoratorPanel.classList.contains('open')) {
            decoratorPanel.classList.remove('open');
            decoratorMode = false;
            deselectAll();
        }
    }
};

// ============ MOOD BOARD MANAGEMENT ============
let moodboardEditMode = false;
let currentSlideIndex = 0;
let currentFilter = 'all';
let draggedImageIndex = null;

// Default mood board images
let moodboardImages = JSON.parse(localStorage.getItem('moodboardImages')) || [
    { src: 'photos refs reading room/Style mobilier/569a10d902522e95d504c7964c67310e.jpg', title: 'Ochre floor mattress with cushions', category: 'furniture' },
    { src: 'photos refs reading room/ambiance/352102ea74fd486ae6c0906204724e6d.jpg', title: 'Layered rugs, disco balls, wooden chairs', category: 'ambiance' },
    { src: 'photos refs reading room/Style mobilier/-natte-plastique-thies.jpg', title: 'Senegalese plastic woven mats (nattes)', category: 'furniture' },
    { src: 'photos refs reading room/inspiration afrique/The-Library-of-Muyinga-by-BC-architects_dezeen_8.jpg', title: 'Library of Muyinga - wooden platforms', category: 'inspiration' },
    { src: 'photos refs reading room/ambiance/_M5C0020.jpg', title: 'Colorful bean bags and poufs', category: 'ambiance' },
    { src: 'photos refs reading room/Style mobilier/tissu-wax.webp', title: 'African wax print fabric', category: 'pattern' }
];

// Default categories
const defaultCategories = [
    { value: 'furniture', label: 'Furniture Style' },
    { value: 'ambiance', label: 'Ambiance' },
    { value: 'inspiration', label: 'Inspiration' },
    { value: 'pattern', label: 'Patterns & Textiles' },
    { value: 'film', label: 'Films' },
    { value: 'media', label: 'Media' }
];
let imageCategories = JSON.parse(localStorage.getItem('panafricanCategories')) || [...defaultCategories];

function saveCategories() {
    localStorage.setItem('panafricanCategories', JSON.stringify(imageCategories));
}

// Render category filter buttons
function renderCategoryFilters() {
    const container = document.getElementById('category-filter-buttons');
    if (!container) return;
    container.innerHTML = `
                <button class="moodboard-toolbar-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="filterMoodboard('all')" data-filter="all">All</button>
                ${imageCategories.map(c => `
                    <button class="moodboard-toolbar-btn ${currentFilter === c.value ? 'active' : ''}" onclick="filterMoodboard('${c.value}')" data-filter="${c.value}">${c.label}</button>
                `).join('')}
            `;
}

// Render category dropdown options
function renderCategoryOptions() {
    const addSelect = document.getElementById('new-image-category');
    const editSelect = document.getElementById('edit-image-category');
    const options = imageCategories.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
    if (addSelect) addSelect.innerHTML = options;
    if (editSelect) editSelect.innerHTML = options;
}

// Category manager
window.toggleCategoryManager = function () {
    const manager = document.getElementById('category-manager');
    manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
    document.getElementById('manage-categories-btn').classList.toggle('active', manager.style.display !== 'none');
    renderCategoryList();
};

function renderCategoryList() {
    const container = document.getElementById('category-list');
    container.innerHTML = imageCategories.map((c, idx) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #333;">
                    <span style="color: #888; font-size: 10px; width: 80px;">${c.value}</span>
                    <span style="color: #fff; font-size: 12px; flex: 1;">${c.label}</span>
                    <button onclick="removeCategory(${idx})" style="background: #c41e3a; border: none; color: #fff; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; font-size: 10px;">✕</button>
                </div>
            `).join('');
}

window.addCategory = function () {
    const value = document.getElementById('new-category-value').value.trim().toLowerCase().replace(/\s+/g, '-');
    const label = document.getElementById('new-category-label').value.trim();
    if (value && label) {
        if (imageCategories.some(c => c.value === value)) {
            alert('Category key already exists');
            return;
        }
        imageCategories.push({ value, label });
        saveCategories();
        document.getElementById('new-category-value').value = '';
        document.getElementById('new-category-label').value = '';
        renderCategoryList();
        renderCategoryFilters();
        renderCategoryOptions();
    }
};

window.removeCategory = function (index) {
    if (imageCategories.length <= 1) {
        alert('You must keep at least one category');
        return;
    }
    const cat = imageCategories[index];
    // Move images in this category to first available category
    const newCat = imageCategories[0].value !== cat.value ? imageCategories[0].value : imageCategories[1].value;
    moodboardImages.forEach(img => {
        if (img.category === cat.value) img.category = newCat;
    });
    saveMoodboardImages();
    imageCategories.splice(index, 1);
    saveCategories();
    renderCategoryList();
    renderCategoryFilters();
    renderCategoryOptions();
    renderMoodboardGallery();
};

// Edit image details
window.editImageDetails = function (index) {
    const img = moodboardImages[index];
    document.getElementById('edit-image-index').value = index;
    document.getElementById('edit-image-title').value = img.title;
    renderCategoryOptions();
    document.getElementById('edit-image-category').value = img.category;
    document.getElementById('edit-image-modal').style.display = 'flex';
};

window.saveImageEdit = function () {
    const index = parseInt(document.getElementById('edit-image-index').value);
    moodboardImages[index].title = document.getElementById('edit-image-title').value.trim();
    moodboardImages[index].category = document.getElementById('edit-image-category').value;
    saveMoodboardImages();
    closeImageEdit();
    renderMoodboardGallery();
};

window.closeImageEdit = function () {
    document.getElementById('edit-image-modal').style.display = 'none';
};

// Initialize categories on load
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryFilters();
    renderCategoryOptions();
});

function saveMoodboardImages() {
    try {
        localStorage.setItem('moodboardImages', JSON.stringify(moodboardImages));
    } catch (e) {
        console.error('Failed to save moodboard to localStorage (may be full):', e);
        // If localStorage is full, try removing old data URLs to free space
        const trimmed = moodboardImages.map(img => {
            if (img.src && img.src.startsWith('data:') && img.src.length > 50000) {
                return { ...img, src: img.src.substring(0, 50000) }; // Truncate large data URLs
            }
            return img;
        });
        try {
            localStorage.setItem('moodboardImages', JSON.stringify(trimmed));
        } catch (e2) {
            console.error('Still failed after truncation:', e2);
        }
    }
}

function getFilteredImages() {
    if (currentFilter === 'all') return moodboardImages;
    return moodboardImages.filter(img => img.category === currentFilter);
}

function renderMoodboardGallery() {
    const gallery = document.getElementById('moodboard-gallery');
    const countEl = document.getElementById('image-count');
    const filtered = getFilteredImages();

    countEl.textContent = `(${filtered.length} images)`;

    gallery.innerHTML = filtered.map((img, idx) => {
        const realIdx = moodboardImages.indexOf(img);
        const categoryLabel = imageCategories.find(c => c.value === img.category)?.label || img.category;
        return `
                <div class="moodboard-image-item ${moodboardEditMode ? 'editing' : ''}"
                     data-index="${realIdx}"
                     onclick="openSlideshow(${realIdx})"
                     draggable="${moodboardEditMode}">
                    <img src="${img.src}" alt="${img.title}" onerror="this.parentElement.style.display='none'">
                    <div class="image-overlay">
                        <div class="image-title">${img.title}</div>
                        <div class="image-category" style="font-size:9px; opacity:0.7; margin-top:2px;">${categoryLabel}</div>
                    </div>
                    <div class="image-actions">
                        <button class="image-action-btn move" title="Drag to reorder" onclick="event.stopPropagation()">⋮⋮</button>
                        <button class="image-action-btn edit" title="Edit" onclick="event.stopPropagation(); editImageDetails(${realIdx})" style="background:rgba(32,201,151,0.8);">✏️</button>
                        <button class="image-action-btn delete" title="Remove" onclick="event.stopPropagation(); removeMoodboardImage(${realIdx})">✕</button>
                    </div>
                </div>
                `;
    }).join('');

    // Add drag-drop for reordering
    if (moodboardEditMode) {
        setupDragDrop();
    }
}

function setupDragDrop() {
    const items = document.querySelectorAll('.moodboard-image-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedImageIndex = parseInt(item.dataset.index);
            e.dataTransfer.effectAllowed = 'move';
            item.style.opacity = '0.5';
        });
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            draggedImageIndex = null;
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIndex = parseInt(item.dataset.index);
            if (draggedImageIndex !== null && draggedImageIndex !== targetIndex) {
                reorderMoodboardImage(draggedImageIndex, targetIndex);
            }
        });
    });
}

window.toggleMoodboardEdit = function () {
    moodboardEditMode = !moodboardEditMode;
    document.getElementById('edit-mode-btn').classList.toggle('active', moodboardEditMode);
    renderMoodboardGallery();
};

window.toggleAddImageForm = function () {
    const form = document.getElementById('add-image-form');
    form.classList.toggle('active');
    document.getElementById('add-image-btn').classList.toggle('active', form.classList.contains('active'));
};

window.filterMoodboard = function (filter) {
    currentFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderMoodboardGallery();
};

window.addMoodboardImage = function () {
    const urlInput = document.getElementById('new-image-url');
    const titleInput = document.getElementById('new-image-title');
    const categorySelect = document.getElementById('new-image-category');
    const dropZone = document.getElementById('drop-zone');

    const src = urlInput.value.trim() || dropZone.dataset.imageSrc;
    const title = titleInput.value.trim() || 'Untitled';
    const category = categorySelect.value;

    if (!src) {
        alert('Please provide an image URL or upload a file');
        return;
    }

    moodboardImages.push({ src, title, category });
    saveMoodboardImages();

    // Reset form
    urlInput.value = '';
    titleInput.value = '';
    dropZone.classList.remove('has-file');
    dropZone.innerHTML = '📷 Drag & drop image here or click to browse';
    delete dropZone.dataset.imageSrc;
    toggleAddImageForm();

    renderMoodboardGallery();
};

window.removeMoodboardImage = function (index) {
    if (confirm('Remove this image from the mood board?')) {
        moodboardImages.splice(index, 1);
        saveMoodboardImages();
        renderMoodboardGallery();
    }
};

// ===============================
// EDITABLE SECTIONS DATA & STATE
// ===============================
let colorPaletteEditMode = false;
let patternEditMode = false;
let furnitureEditMode = false;
let functionsEditMode = false;

// Default data
const defaultColorPalette = [
    { color: '#f5f0e8', name: 'Cream/Off-White (Bean Bags, Walls)' },
    { color: '#fd7e14', name: 'Burnt Orange (Bean Bags, Accents)' },
    { color: '#c41e3a', name: 'Deep Red (Natte, Posters)' },
    { color: '#fdd835', name: 'Bright Yellow (Wax Print, Highlights)' },
    { color: '#c2185b', name: 'Magenta/Pink (Cushions, Rugs)' },
    { color: '#6b8e23', name: 'Olive Green (Velvet Sofa)' },
    { color: '#00897b', name: 'Teal (Cushions, Accents)' },
    { color: '#1a3a5c', name: 'Deep Blue (Tie-Dye, Books)' },
    { color: '#d4a76a', name: 'Natural Wood/Rattan' },
    { color: '#8b4513', name: 'Terracotta/Brown' },
    { color: '#c9a227', name: 'Ochre/Gold' },
    { color: '#1a1a1a', name: 'Black (Frames, Contrast)' }
];

const defaultPatterns = [
    { name: 'Ankara Circles', css: 'repeating-conic-gradient(from 0deg, #fdd835 0deg 30deg, #c41e3a 30deg 60deg)' },
    { name: 'Kente Stripes', css: 'repeating-linear-gradient(45deg, #fd7e14 0px, #fd7e14 10px, #fdd835 10px, #fdd835 20px)' },
    { name: 'Target Circles', css: 'radial-gradient(circle at 50% 50%, #c41e3a 30%, #1a1a1a 30%, #1a1a1a 40%, #fdd835 40%)' },
    { name: 'Horizontal Bars', css: 'repeating-linear-gradient(0deg, #00897b 0px, #00897b 8px, #f5f0e8 8px, #f5f0e8 16px)' },
    { name: 'Color Wheel', css: 'conic-gradient(#c2185b, #fdd835, #00897b, #c41e3a, #c2185b)' },
    { name: 'B&W Geometric', css: 'repeating-conic-gradient(#1a1a1a 0deg 10deg, #f5f0e8 10deg 20deg)' }
];

const defaultFurniture = [
    { emoji: '📚', text: 'Reading area (tables, chairs, display stands) — Pan-African Library' },
    { emoji: '📖', text: 'Books on table: zines, fanzines, essays, archives, catalogues, experimental editions' },
    { emoji: '🖼️', text: 'Printed posters on walls — Afrikadaa posters, AABF archives' },
    { emoji: '🗺️', text: 'Mapping African publishing (wall-based or digital display)' },
    { emoji: '📺', text: 'Video screens for publisher interviews (10 filmed interviews)' },
    { emoji: '🎧', text: 'Audio/radio listening station with speakers & headphones — Sound Library' },
    { emoji: '🎵', text: 'DJ table with vinyl collection' },
    { emoji: '📱', text: '2-3 screens with media players or 4 iPads with headphones' },
    { emoji: '🧘', text: 'Floor cushions (poufs) for seating' },
    { emoji: '🪴', text: 'Woven mats on the floor' }
];

const defaultFunctions = [
    { title: 'S202 Three Stars — Panafrican Library', text: 'Curatorial selection of ~50 independent publications (zines, fanzines, essays, archives, catalogues, experimental editions). AABF 10-year archives with posters, visuals, documents, photographs, catalogues, and manifestos. Video space with filmed interviews with publishers, artists, and publishing activists. Mapping African publishing: wall-based or digital installation mapping editorial scenes, networks, and emerging practices.' },
    { title: 'S202 Special Special — Sound Library', text: 'Audio/radio listening station with speakers, headphones, and listening terminal. DJ table with vinyl. 2-3 screens with media players and headphones (or 4 iPads). Floor cushions (poufs) and woven mats. Sound works from Afrikadaa collective and Station of Commons radio. Collective listening sessions with DJ-led music focused on repair of bodies and narratives. Collective reading space for group readings, performances, and poetry. Public program with roundtables and conversations between AABF × Printed Matter.' },
    { title: 'The Reading Room Concept', text: 'A space of extended time within the fair: a place to read, listen, watch, exchange, and rest. The project favors a sensory and collective experience, inviting visitors to slow down, immerse themselves in the archives, and activate publications as living objects of transmission and dialogue.' },
    { title: 'Expected Impact', text: 'Creates a unique space for the circulation of transnational knowledge among African, diasporic, and North American publishers, connecting New York, Dakar, and the African continent. Amplifies editorial voices often relegated to the margins. Proposes a critical and active engagement with archives. Affirms the necessity of a decolonial, collective, and self-affirmed ecology of knowledge.' }
];

// Load from localStorage or use defaults
let colorPalette = JSON.parse(localStorage.getItem('panafricanColorPalette')) || [...defaultColorPalette];
let patterns = JSON.parse(localStorage.getItem('panafricanPatterns')) || [...defaultPatterns];
let furnitureItems = JSON.parse(localStorage.getItem('panafricanFurniture')) || [...defaultFurniture];
let roomFunctions = JSON.parse(localStorage.getItem('panafricanFunctions')) || [...defaultFunctions];

// Save functions
function saveColorPalette() { localStorage.setItem('panafricanColorPalette', JSON.stringify(colorPalette)); }
function savePatterns() { localStorage.setItem('panafricanPatterns', JSON.stringify(patterns)); }
function saveFurniture() { localStorage.setItem('panafricanFurniture', JSON.stringify(furnitureItems)); }
function saveFunctions() { localStorage.setItem('panafricanFunctions', JSON.stringify(roomFunctions)); }

// ===============================
// COLOR PALETTE EDITING
// ===============================
window.toggleColorPaletteEdit = function () {
    colorPaletteEditMode = !colorPaletteEditMode;
    document.getElementById('color-edit-btn').classList.toggle('active', colorPaletteEditMode);
    document.getElementById('color-add-form').style.display = colorPaletteEditMode ? 'flex' : 'none';
    renderColorPalette();
};

function renderColorPalette() {
    const container = document.getElementById('color-palette-container');
    container.innerHTML = colorPalette.map((c, idx) => `
                <div class="color-swatch ${colorPaletteEditMode ? 'editing' : ''}"
                     style="background: ${c.color}; position: relative;"
                     title="${c.name}"
                     onclick="${colorPaletteEditMode ? `removeColorSwatch(${idx})` : ''}">
                </div>
            `).join('');
}

window.addColorSwatch = function () {
    const colorValue = document.getElementById('new-color-value').value;
    const colorName = document.getElementById('new-color-name').value.trim() || 'New Color';
    colorPalette.push({ color: colorValue, name: colorName });
    saveColorPalette();
    document.getElementById('new-color-name').value = '';
    renderColorPalette();
};

window.removeColorSwatch = function (index) {
    colorPalette.splice(index, 1);
    saveColorPalette();
    renderColorPalette();
};

// ===============================
// PATTERN EDITING WITH INDEXEDDB & DRAG-DROP
// ===============================

// IndexedDB for storing pattern images
let patternDB = null;
const PATTERN_DB_NAME = 'PanafricanPatternDB';
const PATTERN_STORE_NAME = 'patterns';

function initPatternDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PATTERN_DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { patternDB = request.result; resolve(patternDB); };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(PATTERN_STORE_NAME)) {
                db.createObjectStore(PATTERN_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function savePatternToDB(name, imageDataUrl) {
    if (!patternDB) await initPatternDB();
    return new Promise((resolve, reject) => {
        const tx = patternDB.transaction(PATTERN_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PATTERN_STORE_NAME);
        const id = 'pattern_' + Date.now();
        const request = store.add({ id, name, imageData: imageDataUrl, timestamp: Date.now() });
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

async function getPatternFromDB(id) {
    if (!patternDB) await initPatternDB();
    return new Promise((resolve, reject) => {
        const tx = patternDB.transaction(PATTERN_STORE_NAME, 'readonly');
        const store = tx.objectStore(PATTERN_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllPatternsFromDB() {
    if (!patternDB) await initPatternDB();
    return new Promise((resolve, reject) => {
        const tx = patternDB.transaction(PATTERN_STORE_NAME, 'readonly');
        const store = tx.objectStore(PATTERN_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deletePatternFromDB(id) {
    if (!patternDB) await initPatternDB();
    return new Promise((resolve, reject) => {
        const tx = patternDB.transaction(PATTERN_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PATTERN_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Currently dragged pattern for furniture application
let draggedPattern = null;

window.togglePatternEdit = function () {
    patternEditMode = !patternEditMode;
    document.getElementById('pattern-edit-btn').classList.toggle('active', patternEditMode);
    document.getElementById('pattern-add-form').style.display = patternEditMode ? 'block' : 'none';
    renderPatterns();
};

async function renderPatterns() {
    const container = document.getElementById('pattern-grid-container');
    if (!container) return; // Safety check

    // Get patterns from both localStorage (CSS) and IndexedDB (images)
    let dbPatterns = [];
    try {
        dbPatterns = await getAllPatternsFromDB();
    } catch (err) {
        console.warn('Could not load patterns from IndexedDB:', err);
    }

    let html = '';

    // Render CSS-based patterns from localStorage
    patterns.forEach((p, idx) => {
        const bgStyle = p.imageUrl ? `url(${p.imageUrl})` : p.css;
        const bgSize = p.imageUrl ? 'background-size: cover; background-position: center;' : '';
        html += `
                    <div class="pattern-swatch ${patternEditMode ? 'editing' : ''}"
                         draggable="true"
                         data-pattern-type="css"
                         data-pattern-idx="${idx}"
                         style="background: ${bgStyle}; width: 80px; height: 80px; border-radius: 4px; cursor: grab; ${bgSize}"
                         title="${p.name} (drag to furniture)"
                         ondragstart="handlePatternDragStart(event, 'css', ${idx})"
                         onclick="${patternEditMode ? `removePattern(${idx})` : `selectPatternForTexture('css', ${idx})`}">
                    </div>
                `;
    });

    // Render image-based patterns from IndexedDB
    dbPatterns.forEach((p, idx) => {
        html += `
                    <div class="pattern-swatch ${patternEditMode ? 'editing' : ''}"
                         draggable="true"
                         data-pattern-type="db"
                         data-pattern-id="${p.id}"
                         style="background: url(${p.imageData}); background-size: cover; background-position: center; width: 80px; height: 80px; border-radius: 4px; cursor: grab;"
                         title="${p.name} (drag to furniture)"
                         ondragstart="handlePatternDragStart(event, 'db', '${p.id}')"
                         onclick="${patternEditMode ? `removePatternFromDB('${p.id}')` : `selectPatternForTexture('db', '${p.id}')`}">
                    </div>
                `;
    });

    container.innerHTML = html;

    // Also update the mini texture panel in Room Decorator
    try {
        await updateTexturePanelPatterns();
    } catch (err) {
        console.warn('Could not update texture panel:', err);
    }
}

// Pattern drag start handler
window.handlePatternDragStart = function (event, type, idOrIdx) {
    draggedPattern = { type, id: idOrIdx };
    event.dataTransfer.setData('text/plain', JSON.stringify(draggedPattern));
    event.dataTransfer.effectAllowed = 'copy';
};

// Select pattern for applying to selected furniture
window.selectPatternForTexture = async function (type, idOrIdx) {
    if (!selectedPlacedItem) {
        alert('Please select a piece of furniture first in the Room Decorator');
        return;
    }
    await applyPatternToFurniture(type, idOrIdx);
};

// Apply pattern texture to selected furniture
async function applyPatternToFurniture(type, idOrIdx, surfaceType = 'all') {
    if (!selectedPlacedItem) return;

    let textureUrl;
    if (type === 'css') {
        // For CSS patterns, we create a canvas-based texture
        const pattern = patterns[idOrIdx];
        if (pattern.imageUrl) {
            textureUrl = pattern.imageUrl;
        } else {
            // Generate texture from CSS pattern (use existing canvas generator)
            const patternIdx = idOrIdx % 10;
            const texture = getTextileTexture(patternIdx);
            applyTextureToObject(selectedPlacedItem, texture, surfaceType);
            return;
        }
    } else if (type === 'db') {
        const pattern = await getPatternFromDB(idOrIdx);
        if (pattern) {
            textureUrl = pattern.imageData;
        }
    }

    if (textureUrl) {
        const loader = new THREE.TextureLoader(loadingManager);
        loader.load(textureUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            applyTextureToObject(selectedPlacedItem, texture, surfaceType);
        }, undefined, (err) => {
            console.error('Error loading texture:', err);
        });
    }
}

// Apply texture to 3D object based on surface type
function applyTextureToObject(object, texture, surfaceType) {
    if (!object) return;

    object.traverse((child) => {
        if (child.isMesh) {
            const mat = child.material;
            const isTexturable = shouldApplyToSurface(child, surfaceType);

            if (isTexturable) {
                // Clone material to avoid affecting other objects
                const newMat = mat.clone();
                newMat.map = texture;
                newMat.needsUpdate = true;
                child.material = newMat;
            }
        }
    });
}

// Determine if texture should be applied to this surface
function shouldApplyToSurface(mesh, surfaceType) {
    if (surfaceType === 'all') return true;

    const mat = mesh.material;
    const color = mat.color ? mat.color.getHex() : 0;

    // Heuristics based on color and position
    if (surfaceType === 'cushions') {
        // Cushions are typically colored (olive, etc) and at seat height
        return mesh.position.y < 1.0 && color !== 0xf5f5f5 && color !== 0xffffff;
    } else if (surfaceType === 'top') {
        return mesh.position.y === Math.max(...mesh.parent.children.filter(c => c.isMesh).map(c => c.position.y));
    } else if (surfaceType === 'sides') {
        return mesh.position.y !== Math.max(...mesh.parent.children.filter(c => c.isMesh).map(c => c.position.y));
    }
    return true;
}

// Update texture panel in Room Decorator
async function updateTexturePanelPatterns() {
    const container = document.getElementById('texture-patterns-mini');
    if (!container) return;

    let dbPatterns = [];
    try {
        dbPatterns = await getAllPatternsFromDB();
    } catch (err) {
        console.warn('Could not load patterns for texture panel:', err);
    }

    let html = '';

    // First 5 CSS patterns
    patterns.slice(0, 5).forEach((p, idx) => {
        const bgStyle = p.imageUrl ? `url(${p.imageUrl})` : p.css;
        const bgSize = p.imageUrl ? 'background-size: cover;' : '';
        html += `<div class="mini-pattern" style="background:${bgStyle}; width:32px; height:32px; border-radius:3px; cursor:pointer; ${bgSize}" onclick="applyPatternToFurniture('css', ${idx}, document.getElementById('surface-select').value)" title="${p.name}"></div>`;
    });

    // IndexedDB patterns
    dbPatterns.slice(0, 10).forEach((p) => {
        html += `<div class="mini-pattern" style="background:url(${p.imageData}); background-size:cover; width:32px; height:32px; border-radius:3px; cursor:pointer;" onclick="applyPatternToFurniture('db', '${p.id}', document.getElementById('surface-select').value)" title="${p.name}"></div>`;
    });

    container.innerHTML = html || '<p style="font-size:9px; color:#666;">No patterns - add in Mood Board</p>';
}

// Add pattern from file upload
window.addPatternFromFile = async function () {
    const fileInput = document.getElementById('new-pattern-file');
    const nameInput = document.getElementById('new-pattern-name');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select an image file');
        return;
    }

    const file = fileInput.files[0];
    const name = nameInput.value.trim() || file.name.replace(/\.[^/.]+$/, '');

    try {
        const dataUrl = await fileToDataUrl(file);
        await savePatternToDB(name, dataUrl);
        fileInput.value = '';
        nameInput.value = '';
        await renderPatterns();
        console.log('Pattern added:', name);
    } catch (err) {
        console.error('Error adding pattern:', err);
        alert('Error adding pattern: ' + err.message);
    }
};

// Load multiple patterns from folder
window.loadPatternsFromFolder = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.webkitdirectory = true;

    input.onchange = async (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        let added = 0;

        for (const file of files) {
            try {
                const name = file.name.replace(/\.[^/.]+$/, '');
                const dataUrl = await fileToDataUrl(file);
                await savePatternToDB(name, dataUrl);
                added++;
            } catch (err) {
                console.warn('Skipped file:', file.name, err);
            }
        }

        await renderPatterns();
        alert(`Added ${added} patterns from folder`);
    };

    input.click();
};

// Helper: Convert file to data URL
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

window.addPatternSwatch = function () {
    const patternName = document.getElementById('new-pattern-name').value.trim() || 'New Pattern';
    const patternUrl = document.getElementById('new-pattern-url').value.trim();
    if (patternUrl) {
        patterns.push({ name: patternName, imageUrl: patternUrl });
        savePatterns();
        document.getElementById('new-pattern-name').value = '';
        document.getElementById('new-pattern-url').value = '';
        renderPatterns();
    } else {
        alert('Please provide a pattern image URL');
    }
};

window.removePattern = function (index) {
    patterns.splice(index, 1);
    savePatterns();
    renderPatterns();
};

window.removePatternFromDB = async function (id) {
    if (confirm('Remove this pattern?')) {
        await deletePatternFromDB(id);
        await renderPatterns();
    }
};

// Reset furniture texture to default
window.resetFurnitureTexture = function () {
    if (!selectedPlacedItem) return;
    selectedPlacedItem.traverse((child) => {
        if (child.isMesh && child.material) {
            const newMat = child.material.clone();
            newMat.map = null;
            newMat.needsUpdate = true;
            child.material = newMat;
        }
    });
};

// Randomize furniture textures
window.randomizeFurnitureTexture = function () {
    if (!selectedPlacedItem) return;
    const randomIdx = Math.floor(Math.random() * 10);
    const texture = getTextileTexture(randomIdx);
    applyTextureToObject(selectedPlacedItem, texture, 'cushions');
};

// ===============================
// FURNITURE EDITING
// ===============================
window.toggleFurnitureEdit = function () {
    furnitureEditMode = !furnitureEditMode;
    document.getElementById('furniture-edit-btn').classList.toggle('active', furnitureEditMode);
    document.getElementById('furniture-add-form').style.display = furnitureEditMode ? 'flex' : 'none';
    renderFurniture();
};

function renderFurniture() {
    const container = document.getElementById('furniture-list-container');
    container.innerHTML = `<ul class="design-list" style="font-size: 12px;">` +
        furnitureItems.map((f, idx) => `
                    <li class="editable-item ${furnitureEditMode ? 'editing' : ''}">
                        <button class="remove-btn" onclick="removeFurniture(${idx})">✕</button>
                        <span>${f.emoji} ${f.text}</span>
                    </li>
                `).join('') +
        `</ul>`;
}

window.addFurnitureItem = function () {
    const emoji = document.getElementById('new-furniture-emoji').value.trim() || '•';
    const text = document.getElementById('new-furniture-text').value.trim();
    if (text) {
        furnitureItems.push({ emoji, text });
        saveFurniture();
        document.getElementById('new-furniture-emoji').value = '';
        document.getElementById('new-furniture-text').value = '';
        renderFurniture();
    }
};

window.removeFurniture = function (index) {
    furnitureItems.splice(index, 1);
    saveFurniture();
    renderFurniture();
};

// ===============================
// ROOM FUNCTIONS EDITING
// ===============================
window.toggleFunctionsEdit = function () {
    functionsEditMode = !functionsEditMode;
    document.getElementById('functions-edit-btn').classList.toggle('active', functionsEditMode);
    document.getElementById('functions-add-form').style.display = functionsEditMode ? 'block' : 'none';
    renderFunctions();
};

function renderFunctions() {
    const container = document.getElementById('functions-container');
    container.innerHTML = roomFunctions.map((f, idx) => `
                <div class="editable-item ${functionsEditMode ? 'editing' : ''}" style="display: block; margin-bottom: 8px;">
                    <button class="remove-btn" onclick="removeFunction(${idx})" style="float: right; margin-left: 8px;">✕</button>
                    <p><strong>${f.title}:</strong> ${f.text}</p>
                </div>
            `).join('');
}

window.addFunctionItem = function () {
    const title = document.getElementById('new-function-title').value.trim();
    const text = document.getElementById('new-function-text').value.trim();
    if (title && text) {
        roomFunctions.push({ title, text });
        saveFunctions();
        document.getElementById('new-function-title').value = '';
        document.getElementById('new-function-text').value = '';
        renderFunctions();
    }
};

window.removeFunction = function (index) {
    roomFunctions.splice(index, 1);
    saveFunctions();
    renderFunctions();
};

// Initialize editable sections on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        renderColorPalette();
        await renderPatterns();
        renderFurniture();
        renderFunctions();
    } catch (err) {
        console.error('Error initializing mood board:', err);
    }
});

function reorderMoodboardImage(fromIndex, toIndex) {
    const item = moodboardImages.splice(fromIndex, 1)[0];
    moodboardImages.splice(toIndex, 0, item);
    saveMoodboardImages();
    renderMoodboardGallery();
}

// ============ MULTI-FILE UPLOAD QUEUE ============
let uploadQueue = [];

// Process a single file and return its data URL
async function processImageFile(file) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof handleMoodboardImageUpload === 'function') {
                handleMoodboardImageUpload(file).then(resolve).catch(() => {
                    // Fallback to FileReader
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
        } catch (err) {
            reject(err);
        }
    });
}

// Update the upload queue UI
function updateUploadQueueUI() {
    const queueEl = document.getElementById('upload-queue');
    const queueCountEl = document.getElementById('queue-count');
    const addAllBtn = document.getElementById('add-all-btn');
    const addSingleBtn = document.getElementById('add-single-btn');

    if (uploadQueue.length > 0) {
        queueEl.style.display = 'block';
        addAllBtn.style.display = 'block';
        addSingleBtn.style.display = 'none';
        queueCountEl.textContent = uploadQueue.length;

        queueEl.innerHTML = uploadQueue.map((item, i) => `
                    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:rgba(255,255,255,0.05); border-radius:3px; margin-bottom:4px;">
                        <img src="${item.src}" style="width:40px; height:40px; object-fit:cover; border-radius:3px;">
                        <span style="flex:1; font-size:11px; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>
                        <button onclick="removeFromQueue(${i})" style="background:none; border:none; color:#f55; cursor:pointer; font-size:14px;">✕</button>
                    </div>
                `).join('');
    } else {
        queueEl.style.display = 'none';
        addAllBtn.style.display = 'none';
        addSingleBtn.style.display = 'block';
    }
}

// Remove item from queue
window.removeFromQueue = function (index) {
    uploadQueue.splice(index, 1);
    updateUploadQueueUI();
    if (uploadQueue.length === 0) {
        const dropZone = document.getElementById('drop-zone');
        dropZone.innerHTML = '📷 Drag & drop images here or click to browse<br><span style="font-size: 10px; color: #888;">Select multiple files at once!</span>';
        dropZone.classList.remove('has-file');
    }
};

// Add all queued images to moodboard
window.addAllQueuedImages = function () {
    try {
        const categorySelect = document.getElementById('new-image-category');
        const category = (categorySelect && categorySelect.value) ? categorySelect.value : 'reference';

        console.log(`Adding ${uploadQueue.length} images to moodboard with category: ${category}`);

        uploadQueue.forEach(item => {
            moodboardImages.push({
                src: item.src,
                title: item.name.replace(/\.[^/.]+$/, ''),
                category: category
            });
        });

        saveMoodboardImages();
        renderMoodboardGallery();

        // Clear queue and reset form
        uploadQueue = [];
        updateUploadQueueUI();
        const dropZone = document.getElementById('drop-zone');
        dropZone.innerHTML = '📷 Drag & drop images here or click to browse<br><span style="font-size: 10px; color: #888;">Select multiple files at once!</span>';
        dropZone.classList.remove('has-file');
        toggleAddImageForm();

        console.log(`Moodboard now has ${moodboardImages.length} images total`);
    } catch (err) {
        console.error('Error adding queued images:', err);
        alert('Error adding images: ' + err.message);
    }
};

// Multi-file upload handler
window.handleMultiImageSelect = async function (event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `⏳ Processing ${files.length} images...`;

    let processed = 0;
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        try {
            const dataUrl = await processImageFile(file);
            uploadQueue.push({
                src: dataUrl,
                name: file.name
            });
            processed++;
            dropZone.innerHTML = `⏳ Processing ${processed}/${files.length}...`;
        } catch (err) {
            console.error('Error processing', file.name, err);
        }
    }

    dropZone.innerHTML = `✓ ${uploadQueue.length} images ready`;
    dropZone.classList.add('has-file');
    updateUploadQueueUI();

    // Reset file input
    event.target.value = '';
};

// Legacy single file handler (kept for compatibility)
window.handleImageSelect = async function (event) {
    const file = event.target.files[0];
    if (file) {
        const dropZone = document.getElementById('drop-zone');
        dropZone.innerHTML = '⏳ Processing...';

        try {
            const dataUrl = await processImageFile(file);
            dropZone.dataset.imageSrc = dataUrl;
            dropZone.dataset.fileName = file.name;
            dropZone.classList.add('has-file');
            dropZone.innerHTML = `✓ ${file.name}`;
        } catch (err) {
            console.error('Image upload error:', err);
        }
    }
};

// Drop zone setup - supports multiple files
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;

            dropZone.innerHTML = `⏳ Processing ${files.length} images...`;

            let processed = 0;
            for (const file of files) {
                try {
                    const dataUrl = await processImageFile(file);
                    uploadQueue.push({
                        src: dataUrl,
                        name: file.name
                    });
                    processed++;
                    dropZone.innerHTML = `⏳ Processing ${processed}/${files.length}...`;
                } catch (err) {
                    console.error('Error processing', file.name, err);
                }
            }

            dropZone.innerHTML = `✓ ${uploadQueue.length} images ready`;
            dropZone.classList.add('has-file');
            updateUploadQueueUI();
        });
    }
});

// ============ REFERENCE IMAGES UPLOAD ============
let referenceUploadQueue = [];

function updateReferenceQueueUI() {
    const queueEl = document.getElementById('reference-upload-queue');
    const actionsEl = document.getElementById('reference-upload-actions');
    const countEl = document.getElementById('reference-queue-count');
    const categorySelect = document.getElementById('reference-category-select');

    if (referenceUploadQueue.length > 0) {
        queueEl.style.display = 'block';
        actionsEl.style.display = 'block';
        countEl.textContent = referenceUploadQueue.length;

        // Populate category dropdown
        if (categorySelect && imageCategories) {
            categorySelect.innerHTML = imageCategories.map(c =>
                `<option value="${c.value}">${c.label}</option>`
            ).join('');
        }

        queueEl.innerHTML = `<div style="display: flex; flex-wrap: wrap; gap: 8px;">` +
            referenceUploadQueue.map((item, i) => `
                        <div style="position: relative; width: 60px; height: 60px;">
                            <img src="${item.src}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                            <button onclick="removeFromReferenceQueue(${i})" style="position: absolute; top: -5px; right: -5px; width: 18px; height: 18px; border-radius: 50%; background: #f55; border: none; color: white; font-size: 10px; cursor: pointer; line-height: 1;">✕</button>
                        </div>
                    `).join('') + `</div>`;
    } else {
        queueEl.style.display = 'none';
        actionsEl.style.display = 'none';
    }
}

window.removeFromReferenceQueue = function (index) {
    referenceUploadQueue.splice(index, 1);
    updateReferenceQueueUI();
    if (referenceUploadQueue.length === 0) {
        const dropZone = document.getElementById('reference-drop-zone');
        dropZone.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                    <div style="color: #aaa; font-size: 13px;">Drag & drop images here or click to browse</div>
                    <div style="color: #666; font-size: 11px; margin-top: 4px;">Select multiple files at once!</div>`;
    }
};

window.clearReferenceQueue = function () {
    referenceUploadQueue = [];
    updateReferenceQueueUI();
    const dropZone = document.getElementById('reference-drop-zone');
    dropZone.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                <div style="color: #aaa; font-size: 13px;">Drag & drop images here or click to browse</div>
                <div style="color: #666; font-size: 11px; margin-top: 4px;">Select multiple files at once!</div>`;
};

window.addAllReferenceImages = function () {
    try {
        const categorySelect = document.getElementById('reference-category-select');
        const category = (categorySelect && categorySelect.value) ? categorySelect.value : 'reference';

        console.log(`Adding ${referenceUploadQueue.length} reference images with category: ${category}`);

        referenceUploadQueue.forEach(item => {
            moodboardImages.push({
                src: item.src,
                title: item.name.replace(/\.[^/.]+$/, ''),
                category: category
            });
        });

        saveMoodboardImages();
        renderMoodboardGallery();

        // Clear queue
        referenceUploadQueue = [];
        updateReferenceQueueUI();
        const dropZone = document.getElementById('reference-drop-zone');
        dropZone.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                    <div style="color: #aaa; font-size: 13px;">Drag & drop images here or click to browse</div>
                    <div style="color: #666; font-size: 11px; margin-top: 4px;">Select multiple files at once!</div>`;

        console.log(`Moodboard now has ${moodboardImages.length} images total`);
    } catch (err) {
        console.error('Error adding reference images:', err);
        alert('Error adding images: ' + err.message);
    }
};

// Setup reference images drop zone
document.addEventListener('DOMContentLoaded', () => {
    const refDropZone = document.getElementById('reference-drop-zone');
    const refFileInput = document.getElementById('reference-file-input');

    if (refDropZone && refFileInput) {
        // Click to browse
        refDropZone.addEventListener('click', () => refFileInput.click());

        // File input change
        refFileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;

            refDropZone.innerHTML = `<div style="font-size: 18px;">⏳ Processing ${files.length} images...</div>`;

            for (const file of files) {
                try {
                    const dataUrl = await processImageFile(file);
                    referenceUploadQueue.push({ src: dataUrl, name: file.name });
                } catch (err) {
                    console.error('Error:', file.name, err);
                }
            }

            refDropZone.innerHTML = `<div style="font-size: 18px; color: #4CAF50;">✓ ${referenceUploadQueue.length} images ready to add</div>`;
            updateReferenceQueueUI();
            e.target.value = '';
        });

        // Drag & drop
        refDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            refDropZone.style.borderColor = '#6495ED';
            refDropZone.style.background = 'rgba(100, 149, 237, 0.1)';
        });

        refDropZone.addEventListener('dragleave', () => {
            refDropZone.style.borderColor = '#444';
            refDropZone.style.background = 'transparent';
        });

        refDropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            refDropZone.style.borderColor = '#444';
            refDropZone.style.background = 'transparent';

            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;

            refDropZone.innerHTML = `<div style="font-size: 18px;">⏳ Processing ${files.length} images...</div>`;

            for (const file of files) {
                try {
                    const dataUrl = await processImageFile(file);
                    referenceUploadQueue.push({ src: dataUrl, name: file.name });
                } catch (err) {
                    console.error('Error:', file.name, err);
                }
            }

            refDropZone.innerHTML = `<div style="font-size: 18px; color: #4CAF50;">✓ ${referenceUploadQueue.length} images ready to add</div>`;
            updateReferenceQueueUI();
        });
    }
});

// ============ SLIDESHOW ============
window.openSlideshow = function (index) {
    if (moodboardEditMode) return; // Don't open slideshow in edit mode
    currentSlideIndex = index;
    updateSlideshow();
    document.getElementById('slideshow-modal').classList.add('active');
};

window.closeSlideshow = function () {
    document.getElementById('slideshow-modal').classList.remove('active');
};

window.slideshowNav = function (direction) {
    currentSlideIndex += direction;
    if (currentSlideIndex < 0) currentSlideIndex = moodboardImages.length - 1;
    if (currentSlideIndex >= moodboardImages.length) currentSlideIndex = 0;
    updateSlideshow();
};

function updateSlideshow() {
    const img = moodboardImages[currentSlideIndex];
    document.getElementById('slideshow-image').src = img.src;
    document.getElementById('slideshow-caption').textContent = img.title;
    document.getElementById('slideshow-info').textContent = `${currentSlideIndex + 1} / ${moodboardImages.length}`;
}

// Keyboard navigation for slideshow
document.addEventListener('keydown', (e) => {
    if (document.getElementById('slideshow-modal').classList.contains('active')) {
        if (e.key === 'ArrowLeft') slideshowNav(-1);
        if (e.key === 'ArrowRight') slideshowNav(1);
        if (e.key === 'Escape') closeSlideshow();
    }
});

// ============ DECORATOR MODE ============
let decoratorMode = false;
let selectedFurnitureType = null;
let selectedPlacedItem = null;
let placedItems = [];
let isDraggingItem = false;
let draggedLibraryItem = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.toggleDecorator = function () {
    const panel = document.getElementById('decorator-panel');
    panel.classList.toggle('open');
    decoratorMode = panel.classList.contains('open');
    // Defer heavy work so click handler returns fast (fixes INP)
    requestAnimationFrame(() => {
        if (!decoratorMode) {
            deselectAll();
        } else {
            // Close mood board if open
            const moodModal = document.getElementById('moodboard-modal');
            if (moodModal && !moodModal.classList.contains('modal-hidden')) {
                moodModal.classList.add('modal-hidden');
            }
            // Setup drag-drop for library items when decorator opens
            setupLibraryDragDrop();
        }
    });
};

// Setup drag-drop for all library item cards
function setupLibraryDragDrop() {
    document.querySelectorAll('.item-card').forEach(card => {
        if (card.dataset.dragSetup) return; // Already setup
        card.dataset.dragSetup = 'true';
        card.draggable = true;

        card.addEventListener('dragstart', (e) => {
            const type = card.onclick?.toString().match(/selectFurniture\('([^']+)'\)/)?.[1];
            if (type) {
                draggedLibraryItem = type;
                e.dataTransfer.setData('text/plain', type);
                e.dataTransfer.effectAllowed = 'copy';
                card.classList.add('dragging');
            }
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedLibraryItem = null;
        });
    });
}

// Canvas drop zone for library items and 3D files from Finder
function setupCanvasDragDrop() {
    const canvas = document.getElementById('canvas-container');

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', (e) => {
        // Only remove if leaving the container entirely
        if (!canvas.contains(e.relatedTarget)) {
            canvas.classList.remove('drag-over');
        }
    });

    canvas.addEventListener('drop', async (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');

        const rect = canvas.getBoundingClientRect();
        const dropX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const dropY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Check for 3D file from Finder
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            if (['glb', 'gltf', 'obj'].includes(ext)) {
                await handleDropped3DFile(file, dropX, dropY);
                return;
            }
        }

        // Check for library item
        const furnitureType = e.dataTransfer.getData('text/plain');
        if (furnitureType) {
            placeItemAtScreenPos(furnitureType, dropX, dropY);
        }
    });
}

// Handle 3D file dropped from Finder
async function handleDropped3DFile(file, screenX, screenY) {
    const ext = file.name.split('.').pop().toLowerCase();
    const name = file.name.replace(/\.[^.]+$/, '');

    initLoaders();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);

        let object = null;

        if (ext === 'glb' || ext === 'gltf') {
            if (!gltfLoader) {
                alert('GLTF loader not available');
                return;
            }
            object = await new Promise((resolve, reject) => {
                gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
            });
        } else if (ext === 'obj') {
            if (!objLoader) {
                alert('OBJ loader not available');
                return;
            }
            object = await new Promise((resolve, reject) => {
                objLoader.load(url, resolve, undefined, reject);
            });
        }

        URL.revokeObjectURL(url);

        if (object) {
            // Auto-scale to reasonable size
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
                object.scale.multiplyScalar(1.5 / maxDim);
            } else if (maxDim < 0.1) {
                object.scale.multiplyScalar(0.5 / maxDim);
            }

            // Recalculate bounds after scaling
            const newBox = new THREE.Box3().setFromObject(object);
            object.position.y = -newBox.min.y; // Sit on floor

            // Wrap in group for consistent handling
            const group = new THREE.Group();
            group.add(object);
            group.userData.itemType = 'custom-' + name;
            group.userData.isPlacedItem = true;

            // Place at drop position
            placeObjectAtScreenPos(group, screenX, screenY);
        }
    } catch (err) {
        console.error('Error loading dropped 3D file:', err);
        alert('Failed to load 3D file: ' + err.message);
    }
}

// Place furniture item at screen position
function placeItemAtScreenPos(type, screenX, screenY) {
    const item = createFurnitureItem(type);
    placeObjectAtScreenPos(item, screenX, screenY);
}

// Place any object at screen position
function placeObjectAtScreenPos(item, screenX, screenY) {
    mouse.x = screenX;
    mouse.y = screenY;
    raycaster.setFromCamera(mouse, camera);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, intersectPoint);

    if (intersectPoint) {
        intersectPoint.y = 0;
        const isWall = item.userData.isWallArt || item.userData.isPoster;
        const constrainedPos = constrainToRoom(intersectPoint, null, isWall);
        if (constrainedPos) {
            item.position.copy(constrainedPos);
            if (isWall) {
                item.position.y = 1.5;
                autoSnapToWall(item);
            }
            scene.add(item);
            placedItems.push(item);
            pushUndo({ type: 'add', item: item });

            // Select the newly placed item
            selectedPlacedItem = item;
            selectedFurnitureType = null;
            document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
            updateSelectedInfo();
        } else {
            console.log('Cannot place item outside room boundaries');
        }
    }
}

window.toggleCategory = function (catId) {
    document.getElementById(catId).classList.toggle('collapsed');
};

window.selectFurniture = function (type) {
    // Deselect previous
    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
    // Select new
    event.currentTarget.classList.add('selected');
    selectedFurnitureType = type;
    selectedPlacedItem = null;
    updateSelectedInfo();
};

function deselectAll() {
    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
    selectedFurnitureType = null;
    selectedPlacedItem = null;
    updateSelectedInfo();
}

function updateSelectedInfo() {
    const info = document.getElementById('selected-item-info');
    const nameSpan = document.getElementById('selected-name');
    const texturePanel = document.getElementById('texture-panel');

    if (selectedPlacedItem) {
        info.classList.add('visible');
        nameSpan.textContent = selectedPlacedItem.userData.customPosterName || selectedPlacedItem.userData.itemType || 'Item';
        // Show texture panel for customization
        if (texturePanel) {
            texturePanel.style.display = 'block';
            updateTexturePanelPatterns();
        }
        // Show poster size controls if poster is selected
        const posterSizeCtrl = document.getElementById('poster-size-controls');
        if (posterSizeCtrl) {
            if (selectedPlacedItem.userData.isPoster && selectedPlacedItem.userData.posterHeightCm) {
                posterSizeCtrl.style.display = 'block';
                document.getElementById('placed-poster-h').value = selectedPlacedItem.userData.posterHeightCm;
                document.getElementById('placed-poster-w').textContent = selectedPlacedItem.userData.posterWidthCm || '—';
            } else {
                posterSizeCtrl.style.display = 'none';
            }
        }
        // Attach transform controls gizmo
        if (transformControls) {
            transformControls.attach(selectedPlacedItem);
        }
    } else if (selectedFurnitureType) {
        info.classList.add('visible');
        nameSpan.textContent = selectedFurnitureType + ' (click to place)';
        // Hide texture panel when no placed item selected
        if (texturePanel) texturePanel.style.display = 'none';
        // Detach transform controls
        if (transformControls) {
            transformControls.detach();
        }
    } else {
        info.classList.remove('visible');
        // Hide texture panel
        if (texturePanel) texturePanel.style.display = 'none';
        // Detach transform controls
        if (transformControls) {
            transformControls.detach();
        }
    }
}

// Create furniture based on type
function createFurnitureItem(type) {
    let item;
    switch (type) {
        // Bean Bags - large triangular
        case 'beanbag-cream': item = createTriangleBeanbag(0xf5f0e8); break;
        case 'beanbag-orange': item = createTriangleBeanbag(0xfd7e14); break;
        case 'beanbag-magenta': item = createTriangleBeanbag(0xc2185b); break;
        case 'beanbag-teal': item = createTriangleBeanbag(0x26a69a); break;
        // Ethnic cushions
        case 'cushion-ethnic-orange': item = createEthnicCushion(0xfd7e14, 0xc96000); break;
        case 'cushion-ethnic-burgundy': item = createEthnicCushion(0x8b2942, 0x5a1a2a); break;
        case 'cushion-velvet-teal': item = createFloorCushion(0x00897b, 0.55); break;
        case 'cushion-round-green': item = createFloorCushion(0x7cb342, 0.45); break;
        case 'cushion-pebble-gray': item = createPebbleCushion(0x90a4ae); break;
        // Mattress & Seating
        case 'mattress-ochre': item = createTuftedFloorMattress(2.2, 1.4); break;
        case 'sofa-olive': item = createVelvetSofa(0x827717); break;
        case 'armchair-pink': item = createVintageArmchair(0xe91e63); break;
        // Tables
        case 'table-display': item = createDisplayTable(); break;
        case 'table-coffee': item = createLowCoffeeTable(); break;
        case 'table-side': item = createSideTable(); break;
        case 'bench-wood': item = createWoodenBench(); break;
        // Book Displays & Storage
        case 'bookcase-wall': item = createWallBookcase(); break;
        case 'book-cubby': item = createBookCubby(); break;
        case 'magazine-rack': item = createMagazineRack(); break;
        case 'book-stack': item = createBookStack(); break;
        case 'display-pink': item = createColorDisplay(0xf8bbd0); break;
        case 'shelf-leaning': item = createLeaningShelf(); break;
        // Rugs - Layered Persian & African
        case 'rug-persian-red': item = createLayeredRug(3.5, 2.5, 0xb71c1c); break;
        case 'rug-persian-cream': item = createLayeredRug(3.0, 2.2, 0xefebe9); break;
        case 'rug-natte-african': item = createAfricanNatte(); break;
        case 'rug-checkered-pink': item = createCheckeredRug(0xe91e63, 0xf8bbd0); break;
        case 'rug-checkered-teal': item = createCheckeredRug(0x00897b, 0xb2dfdb); break;
        case 'rug-wax-yellow': item = createWaxPrintRug(0xfdd835, 0xc41e3a); break;
        case 'rug-geometric-bw': item = createGeometricRug(); break;
        case 'tablecloth-tiedye': item = createTieDyeCloth(); break;
        // Lighting - Ethiopian & Disco
        case 'lamp-ethiopian': item = createEthiopianLamp(); break;
        case 'lamp-beaded': item = createBeadedLamp(); break;
        case 'disco-ball': item = createDiscoBall(); break;
        case 'disco-ball-cluster': item = createDiscoBallCluster(); break;
        case 'light-string': item = createStringLights(); break;
        case 'lantern-paper': item = createPaperLantern(); break;
        // Plants & African Decor
        case 'plant-palm': item = createPalmPlant(); break;
        case 'plant-hanging': item = createHangingPlant(); break;
        case 'plant-pothos': item = createPothosVine(); break;
        case 'basket-woven': item = createWovenBasket(); break;
        case 'pottery-african': item = createAfricanPottery(); break;
        case 'sculpture-wood': item = createWoodSculpture(); break;
        // Wall art
        case 'poster-afrikadaa-1': item = createWallPoster(0xff6b6b, 0.6, 0.8, 'Afrikadaa #1'); break;
        case 'poster-afrikadaa-2': item = createWallPoster(0x45b7d1, 0.5, 0.7, 'Afrikadaa #2'); break;
        case 'poster-afrikadaa-3': item = createWallPoster(0xe17055, 0.5, 0.65, 'African Art'); break;
        case 'poster-coolhunt-1': item = createWallPoster(0x1a1a1a, 0.5, 0.7, 'Fashion'); break;
        case 'poster-coolhunt-2': item = createWallPoster(0xc41e3a, 0.6, 0.8, 'Street Art'); break;
        case 'poster-coolhunt-3': item = createWallPoster(0x74b9ff, 0.4, 0.5, 'Design'); break;
        case 'poster-activist-1': item = createTextBanner('WE WANT TO LIVE FREE', 0x1a3a5c); break;
        case 'poster-activist-2': item = createTextBanner('SOMOS PERSONAS', 0xf5f0e8, 0x1a1a1a); break;
        case 'poster-activist-3': item = createWallPoster(0xc41e3a, 0.7, 0.9, 'Resistance'); break;
        // NEW PANAFRICAN LIBRARY FURNITURE
        // Banquette-shelf units (integrated seating + book display)
        case 'banquette-shelf-short': item = createBanquetteShelfUnit(1.8); break;
        case 'banquette-shelf-medium': item = createBanquetteShelfUnit(2.4); break;
        case 'banquette-shelf-long': item = createBanquetteShelfUnit(3.2); break;
        // Cardboard cube stools
        case 'cube-stool-branches': item = createCardboardCubeStool('branches'); break;
        case 'cube-stool-pattern': item = createCardboardCubeStool('african-pattern'); break;
        case 'cube-stool-text': item = createCardboardCubeStool('text'); break;
        case 'cube-stool-benin': item = createCardboardCubeStool('benin'); break;
        // Vinyl record tables
        case 'record-table-ngoma': item = createVinylRecordTable('ngoma'); break;
        case 'record-table-bantou': item = createVinylRecordTable('bantou'); break;
        case 'record-table-jazz': item = createVinylRecordTable('african-jazz'); break;
        case 'record-table-pathe': item = createVinylRecordTable('pathe'); break;
        // African print poufs
        case 'pouf-leopard': item = createAfricanPrintPouf('leopard'); break;
        case 'pouf-wax-blue': item = createAfricanPrintPouf('wax-blue'); break;
        case 'pouf-wax-pink': item = createAfricanPrintPouf('wax-pink'); break;
        case 'pouf-kente': item = createAfricanPrintPouf('kente'); break;
        case 'pouf-mudcloth': item = createAfricanPrintPouf('mudcloth'); break;
        // Sculptural elements
        case 'sculpture-benin-head': item = createBeninHead(); break;
        default:
            // Check if it's a custom model
            if (type && type.startsWith('custom-model-')) {
                const modelId = parseInt(type.replace('custom-model-', ''));
                item = createCustomModelPlaceholder(modelId);
            } else if (type && type.startsWith('custom-poster-')) {
                const posterId = parseInt(type.replace('custom-poster-', ''));
                const posterData = uploadedPosters.find(p => p.id === posterId);
                if (posterData) {
                    item = createPosterObject(posterData);
                } else {
                    item = createWallPoster(0x888888, 0.6, 0.8, 'Poster');
                }
            } else {
                item = createFloorCushion(0x888888, 0.5);
            }
    }
    item.userData.itemType = type;
    item.userData.isPlacedItem = true;
    return item;
}

// Placeholder for custom models while loading
function createCustomModelPlaceholder(modelId) {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshLambertMaterial({
        color: 0x4a90d9,
        transparent: true,
        opacity: 0.5
    });
    const box = new THREE.Mesh(geo, mat);
    box.position.y = 0.25;
    group.add(box);

    // Add loading indicator
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.position.y = 0.25;
    group.add(line);

    group.userData.isPlaceholder = true;
    group.userData.customModelId = modelId;

    // Async load the actual model and replace placeholder
    loadAndReplaceCustomModel(group, modelId);

    return group;
}

// Load custom model and replace placeholder
async function loadAndReplaceCustomModel(placeholder, modelId) {
    const model = uploadedModels.find(m => m.id === modelId);
    if (!model) return;

    initLoaders();

    try {
        const blob = new Blob([model.data]);
        const url = URL.createObjectURL(blob);

        let object = null;

        if (model.type === 'glb' || model.type === 'gltf') {
            if (!gltfLoader) return;
            object = await new Promise((resolve, reject) => {
                gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
            });
        } else if (model.type === 'obj') {
            if (!objLoader) return;
            object = await new Promise((resolve, reject) => {
                objLoader.load(url, resolve, undefined, reject);
            });
        }

        URL.revokeObjectURL(url);

        if (object) {
            // Auto-scale
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
                object.scale.multiplyScalar(1.5 / maxDim);
            }

            // Center
            const newBox = new THREE.Box3().setFromObject(object);
            object.position.y = -newBox.min.y;

            // Clear placeholder contents
            while (placeholder.children.length > 0) {
                placeholder.remove(placeholder.children[0]);
            }

            // Add loaded model to placeholder group
            placeholder.add(object);
            placeholder.userData.isPlaceholder = false;
            placeholder.userData.customModelName = model.name;
        }
    } catch (err) {
        console.error('Error loading custom model:', err);
    }
}

// Additional furniture creation functions
function createBeanbag(color) {
    const group = new THREE.Group();
    const bean = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 16),
        new THREE.MeshLambertMaterial({ color })
    );
    bean.scale.set(1.2, 0.7, 1);
    bean.position.set(0, 0.3, 0);
    group.add(bean);
    return group;
}

function createLowSofa() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x6c757d });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.8), mat);
    seat.position.set(0, 0.25, 0);
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.15), mat);
    back.position.set(0, 0.5, -0.35);
    group.add(back);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.8), mat);
    armL.position.set(-0.85, 0.35, 0);
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.8), mat);
    armR.position.set(0.85, 0.35, 0);
    group.add(armR);
    return group;
}

function createDisplayTable() {
    const group = new THREE.Group();
    const tableMat = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.04, 0.8), tableMat);
    top.position.set(0, 0.72, 0);
    group.add(top);
    const legs = [[0.9, 0.3], [0.9, -0.3], [-0.9, 0.3], [-0.9, -0.3]];
    legs.forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), tableMat);
        leg.position.set(x, 0.35, z);
        group.add(leg);
    });
    return group;
}

function createSideTable() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd93d });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16), mat);
    top.position.set(0, 0.45, 0);
    group.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.43, 8), mat);
    leg.position.set(0, 0.22, 0);
    group.add(leg);
    return group;
}

function createWoodenBench() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.4), mat);
    seat.position.set(0, 0.45, 0);
    group.add(seat);
    const legs = [[0.65, 0.1], [0.65, -0.1], [-0.65, 0.1], [-0.65, -0.1]];
    legs.forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.43, 0.05), mat);
        leg.position.set(x, 0.22, z);
        group.add(leg);
    });
    return group;
}

function createFoldingScreen() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xd4a76a, side: THREE.DoubleSide });
    for (let i = -1; i <= 1; i++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.02), mat);
        panel.position.set(i * 0.5, 0.9, i * 0.1);
        panel.rotation.y = i * 0.3;
        group.add(panel);
    }
    return group;
}

function createWireRack() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let y = 0; y < 4; y++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), mat);
        shelf.position.set(0, 0.3 + y * 0.3, 0);
        group.add(shelf);
    }
    const legs = [[0.18, 0.13], [0.18, -0.13], [-0.18, 0.13], [-0.18, -0.13]];
    legs.forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 8), mat);
        leg.position.set(x, 0.6, z);
        group.add(leg);
    });
    return group;
}

function createStripedRug() {
    const group = new THREE.Group();
    const colors = [0xc9a227, 0x8b6914, 0xc9a227, 0x8b6914, 0xc9a227];
    const stripeWidth = 0.6;
    colors.forEach((color, i) => {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeWidth, 0.02, 2.5),
            new THREE.MeshLambertMaterial({ color })
        );
        stripe.position.set((i - 2) * stripeWidth, 0.01, 0);
        group.add(stripe);
    });
    return group;
}

function createTablecloth(color) {
    const group = new THREE.Group();
    const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.02, 0.9),
        new THREE.MeshLambertMaterial({ color })
    );
    cloth.position.set(0, 0.74, 0);
    group.add(cloth);
    return group;
}

function createFloorLamp() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.03, 16), mat);
    base.position.set(0, 0.015, 0);
    group.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), mat);
    pole.position.set(0, 0.78, 0);
    group.add(pole);
    const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.25, 16, 1, true),
        new THREE.MeshLambertMaterial({ color: 0xf5f5dc, side: THREE.DoubleSide })
    );
    shade.position.set(0, 1.6, 0);
    shade.rotation.x = Math.PI;
    group.add(shade);
    return group;
}

function createDiscoBall() {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0xc0c0c0 })
    );
    ball.position.set(0, 0, 0);
    group.add(ball);
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    cord.position.set(0, 0.25, 0);
    group.add(cord);
    return group;
}

function createSmallPlant() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.12, 12),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    );
    pot.position.set(0, 0.06, 0);
    group.add(pot);
    const plant = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x32cd32 })
    );
    plant.position.set(0, 0.18, 0);
    group.add(plant);
    return group;
}

function createVase() {
    const group = new THREE.Group();
    const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.25, 12),
        new THREE.MeshLambertMaterial({ color: 0x4169e1 })
    );
    vase.position.set(0, 0.125, 0);
    group.add(vase);
    const flowers = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xff69b4 })
    );
    flowers.position.set(0, 0.35, 0);
    group.add(flowers);
    return group;
}

function createWallPoster(color, width, height, text) {
    const group = new THREE.Group();
    const poster = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.02),
        new THREE.MeshLambertMaterial({ color })
    );
    poster.position.set(0, height / 2, 0);
    group.add(poster);
    // Frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.02, 0.03), frameMat);
    frameT.position.set(0, height + 0.01, 0.01);
    group.add(frameT);
    const frameB = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.02, 0.03), frameMat);
    frameB.position.set(0, -0.01, 0.01);
    group.add(frameB);
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.02, height + 0.04, 0.03), frameMat);
    frameL.position.set(-width / 2 - 0.01, height / 2, 0.01);
    group.add(frameL);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.02, height + 0.04, 0.03), frameMat);
    frameR.position.set(width / 2 + 0.01, height / 2, 0.01);
    group.add(frameR);
    group.userData.isWallArt = true;
    return group;
}

function createTextBanner(text, bgColor, textColor = 0xffffff) {
    const group = new THREE.Group();
    const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.0, 0.02),
        new THREE.MeshLambertMaterial({ color: bgColor })
    );
    banner.position.set(0, 0.5, 0);
    group.add(banner);
    group.userData.isWallArt = true;
    group.userData.bannerText = text;
    return group;
}

// ==========================================
// PANAFRICAN-INSPIRED FURNITURE FUNCTIONS
// Based on reference images from the mood board
// ==========================================

// TRIANGLE BEAN BAGS - Large triangular floor cushions
function createTriangleBeanbag(color) {
    const group = new THREE.Group();
    // Large triangular floor cushion/beanbag - FLAT on the floor
    // Using a flattened cylinder (like a thick triangular cushion)
    const height = 0.2;  // Low to the ground
    const radius = 0.55;
    const geometry = new THREE.CylinderGeometry(radius * 0.3, radius, height, 3);
    const material = new THREE.MeshLambertMaterial({ color });
    const bean = new THREE.Mesh(geometry, material);
    bean.rotation.y = Math.PI / 6;  // Rotate for visual interest
    bean.position.set(0, height / 2, 0);  // Sits flat on floor (y=0)
    group.add(bean);
    return group;
}

// ETHNIC/VELVET CUSHIONS - Colorful floor cushions
function createEthnicCushion(colors) {
    const group = new THREE.Group();
    const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.5),
        new THREE.MeshLambertMaterial({ color: colors[0] })
    );
    cushion.position.set(0, 0.08, 0);
    group.add(cushion);
    // Add pattern stripe
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.02, 0.1),
        new THREE.MeshLambertMaterial({ color: colors[1] || 0xffd700 })
    );
    stripe.position.set(0, 0.16, 0);
    group.add(stripe);
    return group;
}

function createVelvetCushion(color) {
    const group = new THREE.Group();
    const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.12, 0.45),
        new THREE.MeshLambertMaterial({ color })
    );
    cushion.position.set(0, 0.06, 0);
    group.add(cushion);
    // Tufted center button
    const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    button.position.set(0, 0.13, 0);
    group.add(button);
    return group;
}

function createPebbleCushion(color) {
    const group = new THREE.Group();
    const cushion = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshLambertMaterial({ color })
    );
    cushion.scale.set(1, 0.4, 1);
    cushion.position.set(0, 0.1, 0);
    group.add(cushion);
    return group;
}

// ========== EXHIBITION FURNITURE (Curatorial) ==========
// These are appropriate for a 3-day public exhibition context
// NOT domestic/lounge furniture

// SIMPLE POUF - Low, robust seating for collective use
function createSimplePouf(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.35, 16), mat);
    pouf.position.set(0, 0.175, 0);
    group.add(pouf);
    return group;
}

// AUDIO STATION - DJ/Radio terminal
function createAudioStation() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), woodMat);
    table.position.set(0, 0.75, 0);
    group.add(table);
    // Legs
    for (let x of [-0.55, 0.55]) {
        for (let z of [-0.25, 0.25]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), metalMat);
            leg.position.set(x, 0.375, z);
            group.add(leg);
        }
    }
    // Equipment (mixer/laptop placeholder)
    const equipment = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.3), metalMat);
    equipment.position.set(0, 0.82, 0);
    group.add(equipment);
    return group;
}

// FLOOR SPEAKER - Exhibition audio
function createFloorSpeaker() {
    // Speaker on stand - cabinet sits DIRECTLY on stand top plate
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Speaker Stand
    const standHeight = 0.75;  // Stand pole height
    const topPlateY = standHeight + 0.02;  // Top of stand
    const cabinetHeight = 0.4;  // Speaker cabinet height
    const cabinetY = topPlateY + cabinetHeight / 2 + 0.01;  // Cabinet center (sits on top plate)

    // Base plate (on floor)
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.32), metalMat);
    basePlate.position.set(0, 0.01, 0);
    group.add(basePlate);

    // Center pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, standHeight, 8), metalMat);
    pole.position.set(0, standHeight / 2 + 0.02, 0);
    group.add(pole);

    // Top plate (speaker sits here)
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.22), metalMat);
    topPlate.position.set(0, topPlateY, 0);
    group.add(topPlate);

    // Speaker Cabinet - sits directly on top plate, NO gap
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.24, cabinetHeight, 0.20), mat);
    cabinet.position.set(0, cabinetY, 0);
    group.add(cabinet);

    // Woofer (driver faces +Z, when rotated 180deg faces into room)
    const woofer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
    );
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, cabinetY - 0.06, 0.11);
    group.add(woofer);

    // Tweeter
    const tweeter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12),
        new THREE.MeshLambertMaterial({ color: 0x666666 })
    );
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, cabinetY + 0.10, 0.11);
    group.add(tweeter);

    // LED indicator
    const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x00ff00 })
    );
    led.position.set(0, cabinetY + 0.17, 0.11);
    group.add(led);

    return group;
}

// AFRIKADAA WALL POSTER - Magazine cover style artwork
// Creates a framed poster with text overlay for wall decoration
function createAfrikadaaPoster(text, color, width, height) {
    const group = new THREE.Group();

    // Frame
    const frameThickness = 0.025;
    const frameDepth = 0.02;
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    // Frame sides
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth), frameMat);
    topFrame.position.set(0, height / 2 + frameThickness / 2, 0);
    group.add(topFrame);

    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth), frameMat);
    bottomFrame.position.set(0, -height / 2 - frameThickness / 2, 0);
    group.add(bottomFrame);

    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat);
    leftFrame.position.set(-width / 2 - frameThickness / 2, 0, 0);
    group.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat);
    rightFrame.position.set(width / 2 + frameThickness / 2, 0, 0);
    group.add(rightFrame);

    // Poster background (colored)
    const posterMat = new THREE.MeshLambertMaterial({ color: color });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(width, height), posterMat);
    poster.position.set(0, 0, 0.005);
    group.add(poster);

    // Abstract geometric elements (Afrikadaa style - bold, graphic)
    const accentMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Diagonal stripe
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.15, height * 1.2), accentMat);
    stripe.position.set(-width * 0.2, 0, 0.006);
    stripe.rotation.z = Math.PI / 6;
    group.add(stripe);

    // Circle element
    const circle = new THREE.Mesh(new THREE.CircleGeometry(width * 0.12, 24), darkMat);
    circle.position.set(width * 0.25, height * 0.2, 0.007);
    group.add(circle);

    // Small accent squares
    const sq1 = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.08, width * 0.08), accentMat);
    sq1.position.set(width * 0.3, -height * 0.3, 0.007);
    group.add(sq1);

    const sq2 = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.05, width * 0.05), darkMat);
    sq2.position.set(-width * 0.35, height * 0.35, 0.007);
    group.add(sq2);

    // Text bar at bottom (simulated text block)
    const textBar = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, height * 0.08), darkMat);
    textBar.position.set(0, -height * 0.38, 0.008);
    group.add(textBar);

    // White text underline
    const textLine = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.5, height * 0.015), accentMat);
    textLine.position.set(0, -height * 0.42, 0.009);
    group.add(textLine);

    return group;
}

// HEADPHONE STATION - Standing/wall mount
function createHeadphoneStation() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    // Stand
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), metalMat);
    pole.position.set(0, 0.6, 0);
    group.add(pole);
    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), metalMat);
    base.position.set(0, 0.015, 0);
    group.add(base);
    // Headphone hook
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.08), metalMat);
    hook.position.set(0, 1.1, 0.05);
    group.add(hook);
    // Headphones
    const hpMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const hpBand = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI), hpMat);
    hpBand.position.set(0, 1.08, 0.05);
    group.add(hpBand);
    return group;
}

// READING TABLE - Simple, robust, rectangular
function createReadingTable() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xb5906c });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Top
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), woodMat);
    top.position.set(0, 0.72, 0);
    group.add(top);
    // Metal frame legs
    for (let x of [-0.85, 0.85]) {
        const legFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.8), metalMat);
        legFrame.position.set(x, 0.35, 0);
        group.add(legFrame);
    }
    // Cross bar
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.03, 0.03), metalMat);
    crossBar.position.set(0, 0.15, 0);
    group.add(crossBar);
    return group;
}

// STACKABLE CHAIR - Simple, functional
function createStackableChair() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xc4a77d });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.4), woodMat);
    seat.position.set(0, 0.45, 0);
    group.add(seat);
    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.02), woodMat);
    back.position.set(0, 0.7, -0.18);
    group.add(back);
    // Legs (metal tube)
    for (let x of [-0.18, 0.18]) {
        for (let z of [-0.15, 0.15]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), metalMat);
            leg.position.set(x, 0.225, z);
            group.add(leg);
        }
    }
    return group;
}

// WALL SHELF - For archives and books
function createWallShelf() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xb5906c });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.025, 0.25), woodMat);
    shelf.position.set(0, 0, 0);
    group.add(shelf);
    // Brackets
    const bracket1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.2), metalMat);
    bracket1.position.set(-0.5, -0.075, 0);
    group.add(bracket1);
    const bracket2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.2), metalMat);
    bracket2.position.set(0.5, -0.075, 0);
    group.add(bracket2);
    // Some books
    const bookColors = [0x8b0000, 0x1a3a5c, 0x2e7d32, 0xf57c00];
    for (let i = 0; i < 4; i++) {
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.22, 0.03),
            new THREE.MeshLambertMaterial({ color: bookColors[i] })
        );
        book.position.set(-0.4 + i * 0.25, 0.12, 0);
        group.add(book);
    }
    return group;
}

// LOW ARCHIVE CABINET
function createLowArchiveCabinet() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xa08060 });
    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.4), woodMat);
    body.position.set(0, 0.3, 0);
    group.add(body);
    // Drawer lines
    const lineMat = new THREE.MeshLambertMaterial({ color: 0x5a4535 });
    for (let y of [0.15, 0.35, 0.55]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.01, 0.01), lineMat);
        line.position.set(0, y, 0.2);
        group.add(line);
    }
    return group;
}

// SCREEN STAND - For video content
function createScreenStand() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const screenMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), metalMat);
    pole.position.set(0, 0.75, 0);
    group.add(pole);
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.4), metalMat);
    base.position.set(0, 0.015, 0);
    group.add(base);
    // Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.03), screenMat);
    screen.position.set(0, 1.4, 0);
    group.add(screen);
    // Screen content (placeholder)
    const content = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x2a4a6a })
    );
    content.position.set(0, 1.4, 0.02);
    group.add(content);
    return group;
}

// SIMPLE STOOL - For viewing areas
function createSimpleStool() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xb5906c });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    // Seat
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), woodMat);
    seat.position.set(0, 0.45, 0);
    group.add(seat);
    // Legs
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8), metalMat);
        leg.position.set(Math.cos(angle) * 0.1, 0.22, Math.sin(angle) * 0.1);
        group.add(leg);
    }
    return group;
}

// SIMPLE PENDANT LIGHT - Functional, not decorative
function createSimplePendant() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: 0x444422 });
    // Cord
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8), metalMat);
    cord.position.set(0, 0.15, 0);
    group.add(cord);
    // Shade
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.15, 16, 1, true), metalMat);
    shade.position.set(0, -0.05, 0);
    group.add(shade);
    // Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), lightMat);
    bulb.position.set(0, -0.02, 0);
    group.add(bulb);
    return group;
}

// OLIVE VELVET SOFA - Low-profile tufted sofa
function createOliveSofa() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x6b8e23 }); // Olive green
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.9), mat);
    seat.position.set(0, 0.2, 0);
    group.add(seat);
    // Low back
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.15), mat);
    back.position.set(0, 0.45, -0.4);
    group.add(back);
    // Rounded arms
    const armMat = new THREE.MeshLambertMaterial({ color: 0x5a7d1a });
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), armMat);
    armL.rotation.x = Math.PI / 2;
    armL.position.set(-0.95, 0.3, 0);
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), armMat);
    armR.rotation.x = Math.PI / 2;
    armR.position.set(0.95, 0.3, 0);
    group.add(armR);
    // Tufting buttons
    for (let x = -0.6; x <= 0.6; x += 0.4) {
        for (let z = -0.2; z <= 0.2; z += 0.4) {
            const btn = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            btn.position.set(x, 0.34, z);
            group.add(btn);
        }
    }
    return group;
}

// PINK VELVET ARMCHAIR
function createPinkArmchair() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xe91e63 }); // Pink
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), mat);
    seat.position.set(0, 0.25, 0);
    group.add(seat);
    // Back - curved
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), mat);
    back.position.set(0, 0.6, -0.3);
    group.add(back);
    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.6), mat);
    armL.position.set(-0.35, 0.4, 0);
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.6), mat);
    armR.position.set(0.35, 0.4, 0);
    group.add(armR);
    // Legs - wooden
    const legMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    [[-0.25, -0.25], [-0.25, 0.25], [0.25, -0.25], [0.25, 0.25]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.15, 8), legMat);
        leg.position.set(x, 0.075, z);
        group.add(leg);
    });
    return group;
}

// BOOK DISPLAYS & STORAGE
function createWallBookcase() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.03), woodMat);
    back.position.set(0, 0.9, -0.15);
    group.add(back);
    // Shelves
    for (let y = 0.15; y <= 1.65; y += 0.3) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.3), woodMat);
        shelf.position.set(0, y, 0);
        group.add(shelf);
        // Add some books
        const bookColors = [0xc41e3a, 0x1a3a5c, 0xfdd835, 0x4caf50, 0x9c27b0];
        for (let i = 0; i < 5; i++) {
            const book = new THREE.Mesh(
                new THREE.BoxGeometry(0.05 + Math.random() * 0.03, 0.2 + Math.random() * 0.05, 0.15),
                new THREE.MeshLambertMaterial({ color: bookColors[i % bookColors.length] })
            );
            book.position.set(-0.45 + i * 0.2, y + 0.12, 0);
            group.add(book);
        }
    }
    // Sides
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.8, 0.3), woodMat);
    sideL.position.set(-0.6, 0.9, 0);
    group.add(sideL);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.8, 0.3), woodMat);
    sideR.position.set(0.6, 0.9, 0);
    group.add(sideR);
    return group;
}

function createBookCubby() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 }); // Light wood
    // Create cubby grid
    const cubbies = 3;
    const cubbySize = 0.35;
    for (let x = 0; x < cubbies; x++) {
        for (let y = 0; y < cubbies; y++) {
            // Cubby box
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(cubbySize, cubbySize, 0.3),
                woodMat
            );
            box.position.set((x - 1) * (cubbySize + 0.02), y * (cubbySize + 0.02) + cubbySize / 2, 0);
            group.add(box);
            // Random content
            if (Math.random() > 0.3) {
                const content = new THREE.Mesh(
                    new THREE.BoxGeometry(cubbySize * 0.8, cubbySize * 0.7, 0.15),
                    new THREE.MeshLambertMaterial({ color: [0xc41e3a, 0x1a3a5c, 0xfdd835, 0x4caf50][Math.floor(Math.random() * 4)] })
                );
                content.position.set((x - 1) * (cubbySize + 0.02), y * (cubbySize + 0.02) + cubbySize / 2, 0.05);
                group.add(content);
            }
        }
    }
    return group;
}

function createMagazineRack() {
    const group = new THREE.Group();
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Wire frame
    for (let i = 0; i < 4; i++) {
        const wire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8),
            wireMat
        );
        wire.rotation.z = Math.PI / 6;
        wire.position.set(-0.15 + i * 0.1, 0.35, 0);
        group.add(wire);
    }
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.2), wireMat);
    base.position.set(0, 0.02, 0);
    group.add(base);
    // Magazines
    const magColors = [0xff6b6b, 0x45b7d1, 0xfdd835, 0x4caf50];
    for (let i = 0; i < 4; i++) {
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.28, 0.2),
            new THREE.MeshLambertMaterial({ color: magColors[i] })
        );
        mag.rotation.z = Math.PI / 6;
        mag.position.set(-0.12 + i * 0.08, 0.25 + i * 0.03, 0);
        group.add(mag);
    }
    return group;
}

function createBookStack() {
    const group = new THREE.Group();
    const colors = [0xc41e3a, 0x1a3a5c, 0xfdd835, 0x4caf50, 0x9c27b0, 0xff6b6b];
    let y = 0;
    for (let i = 0; i < 5; i++) {
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.2 + Math.random() * 0.05, 0.03 + Math.random() * 0.02, 0.15),
            new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })
        );
        book.position.set((Math.random() - 0.5) * 0.03, y + 0.015, 0);
        book.rotation.y = (Math.random() - 0.5) * 0.2;
        group.add(book);
        y += 0.035;
    }
    return group;
}

function createColorDisplay(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    // Pedestal display
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), mat);
    base.position.set(0, 0.3, 0);
    group.add(base);
    // Books on top
    const bookMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 3; i++) {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.12), bookMat);
        book.position.set(-0.1 + i * 0.1, 0.62 + i * 0.04, 0);
        book.rotation.y = (Math.random() - 0.5) * 0.3;
        group.add(book);
    }
    return group;
}

function createLeaningShelf() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
    // Leaning frame
    const angle = Math.PI / 12;
    for (let side = -1; side <= 1; side += 2) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), woodMat);
        leg.position.set(side * 0.4, 0.7, -0.1);
        leg.rotation.x = -angle;
        group.add(leg);
    }
    // Shelves
    for (let i = 0; i < 4; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.25), woodMat);
        shelf.position.set(0, 0.2 + i * 0.35, -0.05 - i * 0.08);
        group.add(shelf);
    }
    return group;
}



function darkenColor(color, amount) {
    const r = ((color >> 16) & 255) * (1 - amount);
    const g = ((color >> 8) & 255) * (1 - amount);
    const b = (color & 255) * (1 - amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

// NATTE PLASTIQUE - Senegalese woven plastic mat (checkered pattern)
function createAfricanNatte() {
    const group = new THREE.Group();
    const width = 2.2, depth = 1.6;
    // Base mat
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.015, depth), baseMat);
    base.position.set(0, 0.008, 0);
    group.add(base);
    // Checkered pattern (like Senegalese nattes plastiques)
    const colors = [0xff1493, 0x00ced1, 0xffd700, 0xf5f0e8, 0xff6b6b, 0x32cd32];
    const squareSize = 0.15;
    const cols = Math.floor(width / squareSize);
    const rows = Math.floor(depth / squareSize);
    for (let x = 0; x < cols; x++) {
        for (let z = 0; z < rows; z++) {
            if ((x + z) % 2 === 0) {
                const color = colors[(x + z * 2) % colors.length];
                const square = new THREE.Mesh(
                    new THREE.BoxGeometry(squareSize * 0.9, 0.018, squareSize * 0.9),
                    new THREE.MeshLambertMaterial({ color })
                );
                square.position.set(
                    -width / 2 + squareSize / 2 + x * squareSize,
                    0.01,
                    -depth / 2 + squareSize / 2 + z * squareSize
                );
                group.add(square);
            }
        }
    }
    return group;
}

function createCheckeredRug(color1, color2) {
    const group = new THREE.Group();
    const size = 0.3;
    const count = 6;
    for (let x = 0; x < count; x++) {
        for (let z = 0; z < count; z++) {
            const color = (x + z) % 2 === 0 ? color1 : color2;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(size, 0.02, size),
                new THREE.MeshLambertMaterial({ color })
            );
            tile.position.set((x - count / 2 + 0.5) * size, 0.01, (z - count / 2 + 0.5) * size);
            group.add(tile);
        }
    }
    return group;
}

function createWaxPrintRug(color1, color2) {
    const group = new THREE.Group();
    const width = 2.0, depth = 1.5;
    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.02, depth),
        new THREE.MeshLambertMaterial({ color: color1 })
    );
    base.position.set(0, 0.01, 0);
    group.add(base);
    // African wax print pattern - circular motifs
    for (let x = -0.6; x <= 0.6; x += 0.4) {
        for (let z = -0.4; z <= 0.4; z += 0.4) {
            const circle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.025, 16),
                new THREE.MeshLambertMaterial({ color: color2 })
            );
            circle.position.set(x, 0.012, z);
            group.add(circle);
            // Inner circle
            const inner = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 0.027, 12),
                new THREE.MeshLambertMaterial({ color: color1 })
            );
            inner.position.set(x, 0.014, z);
            group.add(inner);
        }
    }
    return group;
}

function createGeometricRug() {
    const group = new THREE.Group();
    const width = 2.2, depth = 1.6;
    // Base - cream
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.02, depth),
        new THREE.MeshLambertMaterial({ color: 0xf5f0e8 })
    );
    base.position.set(0, 0.01, 0);
    group.add(base);
    // Black geometric triangles
    const triMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0.15);
    triShape.lineTo(-0.1, 0);
    triShape.lineTo(0.1, 0);
    triShape.lineTo(0, 0.15);
    const triGeo = new THREE.ShapeGeometry(triShape);
    for (let x = -0.7; x <= 0.7; x += 0.35) {
        for (let z = -0.5; z <= 0.5; z += 0.3) {
            const tri = new THREE.Mesh(triGeo, triMat);
            tri.rotation.x = -Math.PI / 2;
            tri.position.set(x, 0.012, z);
            if (Math.random() > 0.5) tri.rotation.z = Math.PI;
            group.add(tri);
        }
    }
    return group;
}

function createTieDyeCloth() {
    const group = new THREE.Group();
    // Table-sized cloth
    const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.01, 0.8),
        new THREE.MeshLambertMaterial({ color: 0x4169e1 })
    );
    cloth.position.set(0, 0.72, 0);
    group.add(cloth);
    // Tie-dye circles
    const dyeColors = [0xffffff, 0x9c27b0, 0x00bcd4];
    for (let i = 0; i < 5; i++) {
        const circle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1 + Math.random() * 0.1, 0.1, 0.015, 12),
            new THREE.MeshLambertMaterial({ color: dyeColors[i % dyeColors.length] })
        );
        circle.position.set(-0.6 + i * 0.3, 0.725, (Math.random() - 0.5) * 0.4);
        group.add(circle);
    }
    return group;
}

// LIGHTING - Ethiopian & Disco
function createEthiopianLamp() {
    const group = new THREE.Group();
    // Woven basket shade
    const shadeMat = new THREE.MeshLambertMaterial({ color: 0xd4a76a, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.35, 12, 1, true),
        shadeMat
    );
    shade.position.set(0, 0, 0);
    shade.rotation.x = Math.PI;
    group.add(shade);
    // Beaded fringe
    const beadMat = new THREE.MeshLambertMaterial({ color: 0xc41e3a });
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        for (let j = 0; j < 4; j++) {
            const bead = new THREE.Mesh(
                new THREE.SphereGeometry(0.015, 6, 6),
                j % 2 === 0 ? beadMat : new THREE.MeshLambertMaterial({ color: 0xfdd835 })
            );
            bead.position.set(
                Math.cos(angle) * 0.23,
                -0.38 - j * 0.04,
                Math.sin(angle) * 0.23
            );
            group.add(bead);
        }
    }
    // Cord
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    );
    cord.position.set(0, 0.42, 0);
    group.add(cord);
    return group;
}

function createBeadedLamp() {
    const group = new THREE.Group();
    // Cylinder shade
    const shadeMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.3, 12, 1, true),
        shadeMat
    );
    shade.position.set(0, 0, 0);
    group.add(shade);
    // Colorful beads hanging
    const beadColors = [0xc41e3a, 0xfdd835, 0x4caf50, 0x2196f3, 0x9c27b0];
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const color = beadColors[i % beadColors.length];
        for (let j = 0; j < 6; j++) {
            const bead = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 6, 6),
                new THREE.MeshLambertMaterial({ color })
            );
            bead.position.set(
                Math.cos(angle) * 0.18,
                -0.18 - j * 0.025,
                Math.sin(angle) * 0.18
            );
            group.add(bead);
        }
    }
    // Cord
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    cord.position.set(0, 0.35, 0);
    group.add(cord);
    return group;
}

function createDiscoBallCluster() {
    const group = new THREE.Group();
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
    const cordMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Multiple balls at different heights
    const positions = [
        { x: 0, y: 0, z: 0, size: 0.15, cordLen: 0.3 },
        { x: 0.25, y: 0.15, z: 0.1, size: 0.1, cordLen: 0.15 },
        { x: -0.2, y: 0.1, z: -0.1, size: 0.12, cordLen: 0.2 },
        { x: 0.1, y: -0.1, z: 0.2, size: 0.08, cordLen: 0.4 }
    ];
    positions.forEach(p => {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(p.size, 12, 12), ballMat);
        ball.position.set(p.x, p.y, p.z);
        group.add(ball);
        const cord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, p.cordLen, 8),
            cordMat
        );
        cord.position.set(p.x, p.y + p.size + p.cordLen / 2, p.z);
        group.add(cord);
    });
    return group;
}

function createStringLights() {
    const group = new THREE.Group();
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const bulbColors = [0xfdd835, 0xff6b6b, 0x4caf50, 0x2196f3, 0x9c27b0];
    // Wire
    const points = [];
    for (let i = 0; i <= 10; i++) {
        points.push(new THREE.Vector3(
            -1.5 + i * 0.3,
            Math.sin(i * 0.5) * 0.1,
            0
        ));
    }
    // Bulbs along the wire
    for (let i = 0; i < 10; i++) {
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshLambertMaterial({ color: bulbColors[i % bulbColors.length], emissive: bulbColors[i % bulbColors.length], emissiveIntensity: 0.3 })
        );
        bulb.position.set(-1.5 + i * 0.3, Math.sin(i * 0.5) * 0.1 - 0.05, 0);
        group.add(bulb);
        // Wire segment
        if (i < 9) {
            const wire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6),
                wireMat
            );
            wire.position.set(-1.35 + i * 0.3, Math.sin(i * 0.5 + 0.25) * 0.1, 0);
            wire.rotation.z = Math.PI / 2;
            group.add(wire);
        }
    }
    return group;
}

function createPaperLantern() {
    const group = new THREE.Group();
    const lanternMat = new THREE.MeshLambertMaterial({
        color: 0xfff8e1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 12),
        lanternMat
    );
    lantern.scale.set(1, 1.2, 1);
    lantern.position.set(0, 0, 0);
    group.add(lantern);
    // Wire frame rings
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (let i = -0.15; i <= 0.15; i += 0.1) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.005, 8, 16),
            wireMat
        );
        ring.position.set(0, i, 0);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }
    // Cord
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8),
        wireMat
    );
    cord.position.set(0, 0.38, 0);
    group.add(cord);
    return group;
}

// PLANTS & AFRICAN DECOR
function createPalmPlant() {
    const group = new THREE.Group();
    // Pot
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 12), potMat);
    pot.position.set(0, 0.125, 0);
    group.add(pot);
    // Soil
    const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12),
        new THREE.MeshLambertMaterial({ color: 0x3e2723 })
    );
    soil.position.set(0, 0.24, 0);
    group.add(soil);
    // Palm fronds
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.5, 0.01),
            leafMat
        );
        leaf.position.set(
            Math.cos(angle) * 0.1,
            0.5,
            Math.sin(angle) * 0.1
        );
        leaf.rotation.x = -0.5;
        leaf.rotation.y = angle;
        leaf.rotation.z = 0.3;
        group.add(leaf);
    }
    return group;
}

function createHangingPlant() {
    const group = new THREE.Group();
    // Macrame holder
    const cordMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const cord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6),
            cordMat
        );
        cord.position.set(Math.cos(angle) * 0.1, 0.2, Math.sin(angle) * 0.1);
        group.add(cord);
    }
    // Pot
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.15, 12),
        new THREE.MeshLambertMaterial({ color: 0xd4a76a })
    );
    pot.position.set(0, 0, 0);
    group.add(pot);
    // Trailing vines
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        for (let j = 0; j < 4; j++) {
            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 6),
                vineMat
            );
            leaf.position.set(
                Math.cos(angle) * (0.12 + j * 0.03),
                -0.1 - j * 0.08,
                Math.sin(angle) * (0.12 + j * 0.03)
            );
            group.add(leaf);
        }
    }
    return group;
}

function createPothosVine() {
    const group = new THREE.Group();
    // Small pot
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.1, 10),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    pot.position.set(0, 0.05, 0);
    group.add(pot);
    // Trailing vine with heart-shaped leaves
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x66bb6a });
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    for (let v = 0; v < 3; v++) {
        const angle = (v / 3) * Math.PI * 2;
        for (let i = 0; i < 6; i++) {
            // Vine segment
            const vine = new THREE.Mesh(
                new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6),
                vineMat
            );
            vine.position.set(
                Math.cos(angle) * 0.06 + Math.sin(i) * 0.02,
                -i * 0.06,
                Math.sin(angle) * 0.06
            );
            vine.rotation.z = 0.3;
            group.add(vine);
            // Leaf
            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 6),
                leafMat
            );
            leaf.scale.set(1, 0.3, 1.2);
            leaf.position.set(
                Math.cos(angle) * 0.08 + Math.sin(i) * 0.03,
                -i * 0.06 - 0.02,
                Math.sin(angle) * 0.08
            );
            group.add(leaf);
        }
    }
    return group;
}

function createWovenBasket() {
    const group = new THREE.Group();
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xd4a76a });
    const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.25, 16),
        basketMat
    );
    basket.position.set(0, 0.125, 0);
    group.add(basket);
    // Weave pattern stripes
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    for (let i = 0; i < 4; i++) {
        const stripe = new THREE.Mesh(
            new THREE.TorusGeometry(0.17 - i * 0.01, 0.01, 8, 16),
            stripeMat
        );
        stripe.position.set(0, 0.05 + i * 0.05, 0);
        stripe.rotation.x = Math.PI / 2;
        group.add(stripe);
    }
    return group;
}

function createAfricanPottery() {
    const group = new THREE.Group();
    // Rounded pot with narrow neck
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 12, 12),
        potMat
    );
    body.scale.set(1, 0.8, 1);
    body.position.set(0, 0.12, 0);
    group.add(body);
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, 0.1, 12),
        potMat
    );
    neck.position.set(0, 0.27, 0);
    group.add(neck);
    // Geometric pattern
    const patternMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e8 });
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 6, 6),
            patternMat
        );
        dot.position.set(
            Math.cos(angle) * 0.14,
            0.12,
            Math.sin(angle) * 0.14
        );
        group.add(dot);
    }
    return group;
}

function createWoodSculpture() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    // Abstract figure
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.05, 12),
        woodMat
    );
    base.position.set(0, 0.025, 0);
    group.add(base);
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8),
        woodMat
    );
    body.position.set(0, 0.2, 0);
    group.add(body);
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        woodMat
    );
    head.scale.set(1, 1.3, 0.8);
    head.position.set(0, 0.42, 0);
    group.add(head);
    // Arms
    const armL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6),
        woodMat
    );
    armL.position.set(-0.08, 0.25, 0);
    armL.rotation.z = 0.5;
    group.add(armL);
    const armR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6),
        woodMat
    );
    armR.position.set(0.08, 0.25, 0);
    armR.rotation.z = -0.5;
    group.add(armR);
    return group;
}

// ============ NEW PANAFRICAN LIBRARY FURNITURE ============

// BANQUETTE-SHELF UNIT - Integrated wall seating with book display
// Now featuring African textile patterned cushions instead of solid color
function createBanquetteShelfUnit(length = 2.4, startPatternIndex = null) {
    const group = new THREE.Group();

    // Materials
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }); // White structure

    // Base/platform - white
    const baseHeight = 0.08;
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(length, baseHeight, 0.55),
        whiteMat
    );
    base.position.set(0, baseHeight / 2, 0);
    group.add(base);

    // Create individual seat cushions with different African textile patterns
    const cushionWidth = 0.5; // Each cushion is ~50cm wide
    const numCushions = Math.max(1, Math.floor(length / cushionWidth));
    const actualCushionWidth = (length - 0.04) / numCushions;
    const seatHeight = 0.12;

    // Random starting pattern if not specified
    const patternStart = startPatternIndex !== null ? startPatternIndex : Math.floor(Math.random() * 10);

    for (let i = 0; i < numCushions; i++) {
        // Each cushion gets a different pattern
        const patternIndex = (patternStart + i) % 10;
        const texture = getTextileTexture(patternIndex);
        const cushionMat = new THREE.MeshLambertMaterial({
            map: texture
        });

        const cushion = new THREE.Mesh(
            new THREE.BoxGeometry(actualCushionWidth - 0.02, seatHeight, 0.48),
            cushionMat
        );
        const cushionX = -length / 2 + 0.02 + actualCushionWidth / 2 + i * actualCushionWidth;
        cushion.position.set(cushionX, baseHeight + seatHeight / 2, 0);
        group.add(cushion);
    }

    // Backrest cushions - also with textile patterns
    const backrestHeight = 0.4;
    const numBackCushions = Math.max(1, Math.floor(length / 0.6));
    const actualBackWidth = (length - 0.04) / numBackCushions;

    for (let i = 0; i < numBackCushions; i++) {
        // Offset pattern from seat cushions for variety
        const patternIndex = (patternStart + i + 3) % 10;
        const texture = getTextileTexture(patternIndex);
        const backMat = new THREE.MeshLambertMaterial({
            map: texture
        });

        const backCushion = new THREE.Mesh(
            new THREE.BoxGeometry(actualBackWidth - 0.02, backrestHeight, 0.1),
            backMat
        );
        const backX = -length / 2 + 0.02 + actualBackWidth / 2 + i * actualBackWidth;
        backCushion.position.set(backX, baseHeight + seatHeight + backrestHeight / 2, -0.22);
        group.add(backCushion);
    }

    // Shelf bracket/support - white vertical panel
    const shelfSupportHeight = 0.5;
    const shelfSupport = new THREE.Mesh(
        new THREE.BoxGeometry(length, shelfSupportHeight, 0.03),
        whiteMat
    );
    shelfSupport.position.set(0, baseHeight + seatHeight + backrestHeight + shelfSupportHeight / 2, -0.25);
    group.add(shelfSupport);

    // Main shelf for books - white
    const shelfDepth = 0.25;
    const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.025, shelfDepth),
        whiteMat
    );
    const shelfY = baseHeight + seatHeight + backrestHeight + 0.15;
    shelf.position.set(0, shelfY, -0.12);
    group.add(shelf);

    // Add face-out books/magazines on shelf
    const bookColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe91e63, 0x00bcd4];
    const numBooks = Math.floor(length / 0.22);
    const bookSpacing = (length - 0.2) / numBooks;
    const startX = -length / 2 + 0.15;

    for (let i = 0; i < numBooks; i++) {
        const bookColor = bookColors[i % bookColors.length];
        const bookMat = new THREE.MeshLambertMaterial({ color: bookColor });

        // Book/magazine - face out (thin, tall rectangle)
        const bookWidth = 0.16;
        const bookHeight = 0.22;
        const bookDepth = 0.015;
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth),
            bookMat
        );
        book.position.set(startX + i * bookSpacing, shelfY + 0.025 + bookHeight / 2, -0.05);
        group.add(book);
    }

    // Small lip at front of shelf to hold books
    const lip = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.03, 0.02),
        whiteMat
    );
    lip.position.set(0, shelfY + 0.015, 0.01);
    group.add(lip);

    return group;
}

// CARDBOARD CUBE STOOL - Cube covered with printed images
function createCardboardCubeStool(imageType = 'branches') {
    const group = new THREE.Group();

    // Base cardboard color
    const cardboardMat = new THREE.MeshLambertMaterial({ color: 0xc4a76a }); // Tan cardboard

    // Different "printed" patterns based on type
    let topColor, sideColor;
    switch (imageType) {
        case 'branches':
            topColor = 0xd4c4a4; // Cream with brown branches pattern
            sideColor = 0x8b7355; // Brown tones
            break;
        case 'african-pattern':
            topColor = 0x1a1a1a; // Black with white kente pattern
            sideColor = 0xf5f5f5; // White geometric
            break;
        case 'text':
            topColor = 0xfdd835; // Yellow with black text
            sideColor = 0x1a1a1a; // Black text side
            break;
        case 'benin':
            topColor = 0x8b4513; // Bronze color for Benin heads
            sideColor = 0x654321; // Darker bronze
            break;
        default:
            topColor = 0xd4c4a4;
            sideColor = 0xc4a76a;
    }

    const topMat = new THREE.MeshLambertMaterial({ color: topColor });
    const sideMat = new THREE.MeshLambertMaterial({ color: sideColor });

    // Cube dimensions
    const size = 0.4;

    // Main cube body
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        cardboardMat
    );
    cube.position.set(0, size / 2, 0);
    group.add(cube);

    // Top face with pattern
    const topFace = new THREE.Mesh(
        new THREE.PlaneGeometry(size - 0.01, size - 0.01),
        topMat
    );
    topFace.rotation.x = -Math.PI / 2;
    topFace.position.set(0, size + 0.001, 0);
    group.add(topFace);

    // Front face with pattern
    const frontFace = new THREE.Mesh(
        new THREE.PlaneGeometry(size - 0.01, size - 0.01),
        sideMat
    );
    frontFace.position.set(0, size / 2, size / 2 + 0.001);
    group.add(frontFace);

    // Add subtle edge lines to show cardboard construction
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const edgeSize = 0.01;

    // Top edges
    const edgeTop1 = new THREE.Mesh(new THREE.BoxGeometry(size, edgeSize, edgeSize), edgeMat);
    edgeTop1.position.set(0, size, size / 2);
    group.add(edgeTop1);

    const edgeTop2 = new THREE.Mesh(new THREE.BoxGeometry(size, edgeSize, edgeSize), edgeMat);
    edgeTop2.position.set(0, size, -size / 2);
    group.add(edgeTop2);

    return group;
}

// VINYL RECORD TABLE - Square table with African record label graphic
function createVinylRecordTable(labelType = 'ngoma') {
    const group = new THREE.Group();

    // White pedestal base
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });

    // Base foot
    const baseWidth = 0.35;
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(baseWidth, 0.04, baseWidth),
        whiteMat
    );
    base.position.set(0, 0.02, 0);
    group.add(base);

    // Pedestal column
    const columnHeight = 0.65;
    const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, columnHeight, 0.08),
        whiteMat
    );
    column.position.set(0, 0.04 + columnHeight / 2, 0);
    group.add(column);

    // Tabletop - square
    const topSize = 0.6;
    const topThickness = 0.03;
    const tabletop = new THREE.Mesh(
        new THREE.BoxGeometry(topSize, topThickness, topSize),
        whiteMat
    );
    tabletop.position.set(0, 0.04 + columnHeight + topThickness / 2, 0);
    group.add(tabletop);

    // Vinyl record graphic on top
    // Different colors based on label type
    let labelColor, innerColor;
    switch (labelType) {
        case 'ngoma':
            labelColor = 0xc41e3a; // Red Ngoma label
            innerColor = 0x1a1a1a;
            break;
        case 'bantou':
            labelColor = 0x1a3a5c; // Blue Ban Tou label
            innerColor = 0xf5f5f5;
            break;
        case 'african-jazz':
            labelColor = 0xfdd835; // Yellow
            innerColor = 0x1a1a1a;
            break;
        case 'pathe':
            labelColor = 0x2e7d32; // Green
            innerColor = 0xf5f5f5;
            break;
        default:
            labelColor = 0x1a1a1a;
            innerColor = 0xc41e3a;
    }

    const recordMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Black vinyl
    const labelMat = new THREE.MeshLambertMaterial({ color: labelColor });
    const innerMat = new THREE.MeshLambertMaterial({ color: innerColor });

    // Record disc
    const recordRadius = 0.25;
    const record = new THREE.Mesh(
        new THREE.CylinderGeometry(recordRadius, recordRadius, 0.005, 32),
        recordMat
    );
    record.position.set(0, 0.04 + columnHeight + topThickness + 0.003, 0);
    group.add(record);

    // Label circle in center
    const labelRadius = 0.1;
    const label = new THREE.Mesh(
        new THREE.CylinderGeometry(labelRadius, labelRadius, 0.006, 32),
        labelMat
    );
    label.position.set(0, 0.04 + columnHeight + topThickness + 0.005, 0);
    group.add(label);

    // Inner hole
    const holeRadius = 0.015;
    const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(holeRadius, holeRadius, 0.008, 16),
        innerMat
    );
    hole.position.set(0, 0.04 + columnHeight + topThickness + 0.006, 0);
    group.add(hole);

    // Grooves on record (subtle rings)
    for (let r = 0.12; r < recordRadius; r += 0.025) {
        const groove = new THREE.Mesh(
            new THREE.TorusGeometry(r, 0.001, 4, 32),
            new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
        );
        groove.rotation.x = Math.PI / 2;
        groove.position.set(0, 0.04 + columnHeight + topThickness + 0.006, 0);
        group.add(groove);
    }

    return group;
}

// AFRICAN PRINT FABRIC POUF - Soft cube with colorful pattern
function createAfricanPrintPouf(patternType = 'leopard') {
    const group = new THREE.Group();

    let color1, color2;
    switch (patternType) {
        case 'leopard':
            color1 = 0xd4a76a; // Tan
            color2 = 0x4a3728; // Brown spots
            break;
        case 'wax-blue':
            color1 = 0x1a3a5c; // Deep blue
            color2 = 0xfdd835; // Yellow accents
            break;
        case 'wax-pink':
            color1 = 0xc2185b; // Magenta
            color2 = 0xf5f5f5; // White
            break;
        case 'kente':
            color1 = 0xfdd835; // Yellow
            color2 = 0x2e7d32; // Green
            break;
        case 'mudcloth':
            color1 = 0xf5f0e8; // Cream
            color2 = 0x1a1a1a; // Black
            break;
        default:
            color1 = 0xe91e63;
            color2 = 0xfdd835;
    }

    const mat1 = new THREE.MeshLambertMaterial({ color: color1 });
    const mat2 = new THREE.MeshLambertMaterial({ color: color2 });

    // Soft cube shape - slightly rounded edges
    const size = 0.4;
    const height = 0.38;

    // Main body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(size, height, size),
        mat1
    );
    body.position.set(0, height / 2, 0);
    group.add(body);

    // Top cushion (slightly domed)
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(size - 0.02, 0.04, size - 0.02),
        mat1
    );
    top.position.set(0, height + 0.02, 0);
    group.add(top);

    // Pattern stripes/accents
    const stripeWidth = 0.05;
    for (let i = -1; i <= 1; i += 2) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeWidth, height + 0.01, size + 0.01),
            mat2
        );
        stripe.position.set(i * (size / 3), height / 2, 0);
        group.add(stripe);
    }

    return group;
}

// BENIN BRONZE HEAD SCULPTURE
function createBeninHead() {
    const group = new THREE.Group();

    const bronzeMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Bronze color
    const darkBronzeMat = new THREE.MeshLambertMaterial({ color: 0x654321 });

    // Base pedestal
    const baseSize = 0.15;
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(baseSize, 0.05, baseSize),
        darkBronzeMat
    );
    base.position.set(0, 0.025, 0);
    group.add(base);

    // Neck/collar
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12),
        bronzeMat
    );
    neck.position.set(0, 0.1, 0);
    group.add(neck);

    // Head - elongated oval
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        bronzeMat
    );
    head.scale.set(0.85, 1.2, 0.9);
    head.position.set(0, 0.24, 0);
    group.add(head);

    // Crown/headdress
    const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 0.08, 12),
        darkBronzeMat
    );
    crown.position.set(0, 0.35, 0);
    group.add(crown);

    // Crown top ornament
    const ornament = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        bronzeMat
    );
    ornament.position.set(0, 0.41, 0);
    group.add(ornament);

    // Eyes (indented)
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    [-0.025, 0.025].forEach(x => {
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 8, 8),
            eyeMat
        );
        eye.position.set(x, 0.26, 0.065);
        group.add(eye);
    });

    // Nose
    const nose = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.03, 0.02),
        bronzeMat
    );
    nose.position.set(0, 0.23, 0.07);
    group.add(nose);

    // Collar rings
    for (let y = 0.06; y < 0.14; y += 0.015) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.065, 0.004, 6, 24),
            darkBronzeMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, y, 0);
        group.add(ring);
    }

    return group;
}

// ============ MOUSE INTERACTION FOR DECORATOR ============
let isMouseDraggingItem = false;
let mouseDownTime = 0;
let mouseDownPos = { x: 0, y: 0 };

// Mousedown - start potential drag or selection
let dragStartState = null;
container.addEventListener('mousedown', function (event) {
    if (!decoratorMode) return;
    if (event.button !== 0) return; // Left click only

    mouseDownTime = Date.now();
    mouseDownPos = { x: event.clientX, y: event.clientY };
    dragStartState = null;

    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check if clicking on existing placed item
    const itemIntersects = raycaster.intersectObjects(placedItems, true);
    if (itemIntersects.length > 0) {
        let obj = itemIntersects[0].object;
        while (obj.parent && !obj.userData.isPlacedItem) obj = obj.parent;
        if (obj.userData.isPlacedItem) {
            selectedPlacedItem = obj;
            dragStartState = captureItemState(obj); // Capture for undo
            selectedFurnitureType = null;
            document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
            updateSelectedInfo();
            isMouseDraggingItem = true;
            isCameraOrbitBlocked = true; // BLOCK camera orbit while dragging furniture
            container.style.cursor = 'grabbing';
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    }
});

// Mousemove - drag selected item (STRICT: only moves within room bounds)
let mouseDragLastValidPos = null;
container.addEventListener('mousemove', function (event) {
    if (!decoratorMode || !isMouseDraggingItem || !selectedPlacedItem) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, intersectPoint);

    if (intersectPoint) {
        intersectPoint.y = 0;
        const isWall = selectedPlacedItem.userData.isWallArt || selectedPlacedItem.userData.isPoster;
        const constrained = constrainToRoom(intersectPoint, null, isWall);
        if (constrained) {
            // VALID position - move item
            selectedPlacedItem.position.x = constrained.x;
            selectedPlacedItem.position.z = constrained.z;
            if (isWall) {
                // Auto-snap posters/wall art to nearest wall while dragging
                autoSnapToWall(selectedPlacedItem);
            } else {
                selectedPlacedItem.position.y = 0;
            }
            mouseDragLastValidPos = selectedPlacedItem.position.clone();
        }
        // If constrained returns null, item stays at last valid position
    }
});

// Mouseup - end drag or click to place new item
container.addEventListener('mouseup', function (event) {
    const wasDragging = isMouseDraggingItem;
    const clickDuration = Date.now() - mouseDownTime;
    const moveDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPos.x, 2) +
        Math.pow(event.clientY - mouseDownPos.y, 2)
    );

    isMouseDraggingItem = false;
    isCameraOrbitBlocked = false; // UNBLOCK camera orbit
    container.style.cursor = '';

    // If we were dragging an item, record undo and don't place a new one
    if (wasDragging) {
        if (dragStartState && selectedPlacedItem) {
            pushUndo({ type: 'transform', item: selectedPlacedItem, before: dragStartState, after: captureItemState(selectedPlacedItem) });
        }
        dragStartState = null;
        return;
    }

    // Short click with minimal movement = place new item
    if (clickDuration < 300 && moveDistance < 10 && selectedFurnitureType) {
        const rect = container.getBoundingClientRect();
        const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const screenY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        placeItemAtScreenPos(selectedFurnitureType, screenX, screenY);
    }
});

// Click on empty space to deselect
container.addEventListener('click', function (event) {
    if (!decoratorMode) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // If click didn't hit any placed item and we have no furniture selected, deselect
    const itemIntersects = raycaster.intersectObjects(placedItems, true);
    if (itemIntersects.length === 0 && !selectedFurnitureType) {
        selectedPlacedItem = null;
        updateSelectedInfo();
    }
});

// Initialize canvas drag-drop on load
setupCanvasDragDrop();

// ============================================================
// STRICT ROOM BOUNDARY RULES - NO EXCEPTIONS
// Items can ONLY be placed INSIDE rooms. Period.
// ============================================================
function constrainToRoom(pos, assetId = null, forWallItem = false) {
    const x = pos.x;
    const z = pos.z;

    // Wall items (posters, wall art) need zero margin so they can reach walls
    const WALL_MARGIN = forWallItem ? 0.0 : 0.3;

    // STRICT Three Star boundaries (west/left room)
    const threeStarBounds = ROOM_GEOMETRY['THREE_STAR'].bounds;
    const threeStarDoor = ROOM_GEOMETRY['THREE_STAR'].doorZone;
    const threeStarLeft = threeStarBounds.minX + WALL_MARGIN;
    const threeStarRight = threeStarBounds.maxX - WALL_MARGIN;
    const threeStarFront = threeStarBounds.maxZ - WALL_MARGIN;
    const threeStarBack = threeStarBounds.minZ + WALL_MARGIN;

    // STRICT Special Special boundaries (east/right room)
    const specialSpecialBounds = ROOM_GEOMETRY['SPECIAL_SPECIAL'].bounds;
    const specialSpecialDoor = ROOM_GEOMETRY['SPECIAL_SPECIAL'].doorZone;
    const specialSpecialLeft = specialSpecialBounds.minX + WALL_MARGIN;
    const specialSpecialRight = specialSpecialBounds.maxX - WALL_MARGIN;
    const specialSpecialFront = specialSpecialBounds.maxZ - WALL_MARGIN;
    const specialSpecialBack = specialSpecialBounds.minZ + WALL_MARGIN;

    // STRICT CHECK: Is position INSIDE Three Star?
    const inThreeStar = x >= threeStarLeft && x <= threeStarRight &&
        z >= threeStarBack && z <= threeStarFront;

    // STRICT CHECK: Is position INSIDE Special Special?
    const inSpecialSpecial = x >= specialSpecialLeft && x <= specialSpecialRight &&
        z >= specialSpecialBack && z <= specialSpecialFront;

    // RULE: If not inside ANY room, REJECT placement entirely
    if (!inThreeStar && !inSpecialSpecial) {
        console.warn('REJECTED: Placement outside room boundaries at', x.toFixed(2), z.toFixed(2));
        return null; // REJECT - cannot place outside rooms
    }

    // Helper: Check if position is in door zone (blocked area)
    function isInDoorZone(px, pz, doorZone) {
        return px >= doorZone.minX - 0.2 && px <= doorZone.maxX + 0.2 &&
            pz >= doorZone.minZ && pz <= doorZone.maxZ + 0.3;
    }

    // If in Three Star
    if (inThreeStar) {
        if (isInDoorZone(x, z, threeStarDoor)) {
            const safeZ = threeStarDoor.maxZ + 0.4;
            if (safeZ <= threeStarFront) {
                return new THREE.Vector3(x, 0, safeZ);
            }
            console.warn('REJECTED: Too close to Three Star door');
            return null;
        }
        return new THREE.Vector3(x, 0, z);
    }

    // If in Special Special
    if (inSpecialSpecial) {
        if (isInDoorZone(x, z, specialSpecialDoor)) {
            const safeZ = specialSpecialDoor.maxZ + 0.4;
            if (safeZ <= specialSpecialFront) {
                return new THREE.Vector3(x, 0, safeZ);
            }
            console.warn('REJECTED: Too close to Special Special door');
            return null;
        }
        return new THREE.Vector3(x, 0, z);
    }

    // Should never reach here, but safety fallback
    return null;
}

// Check if a new placement would be valid (no collisions)
function wouldCollideWithExisting(newPosition, newAssetId, excludeItem = null) {
    const asset = ASSET_WHITELIST[newAssetId];
    if (!asset) return false; // Unknown asset, allow placement

    // Create temporary placement to check
    const tempPlacement = {
        assetId: newAssetId,
        roomId: getObjectRoom({ position: newPosition }) || 'SPECIAL_SPECIAL',
        x: newPosition.x,
        z: newPosition.z,
        rotation: 0
    };

    const newAABB = getAABBWithClearance(tempPlacement);
    if (!newAABB) return false;

    // Check against all existing placed items
    for (const item of placedItems) {
        if (item === excludeItem) continue;

        const itemAssetId = item.userData.assetId || 'unknown';
        const itemPlacement = objectToPlacement(item, itemAssetId, getObjectRoom(item) || 'SPECIAL_SPECIAL');
        const existingAABB = getAABBWithClearance(itemPlacement);

        if (existingAABB && aabbsOverlap(newAABB, existingAABB)) {
            console.log(`Collision detected: ${newAssetId} would collide with ${itemAssetId}`);
            return true;
        }
    }

    return false;
}

// Visual feedback for invalid placement
let invalidPlacementTimeout = null;
function showInvalidPlacementFeedback(position) {
    // Create a red indicator at the position
    const indicator = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
    );
    indicator.rotation.x = -Math.PI / 2;
    indicator.position.set(position.x, 0.01, position.z);
    scene.add(indicator);

    // Remove after 1 second
    setTimeout(() => {
        scene.remove(indicator);
    }, 1000);
}

// ============ UNDO / REDO SYSTEM (199 steps) ============
const UNDO_MAX = 199;
const undoStack = [];
const redoStack = [];

function pushUndo(action) {
    undoStack.push(action);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0; // Clear redo on new action
}

function captureItemState(item) {
    return {
        px: item.position.x, py: item.position.y, pz: item.position.z,
        rx: item.rotation.x, ry: item.rotation.y, rz: item.rotation.z
    };
}

function restoreItemState(item, state) {
    item.position.set(state.px, state.py, state.pz);
    item.rotation.set(state.rx, state.ry, state.rz);
}

function applyUndoRedo(action, isUndo) {
    switch (action.type) {
        case 'add':
            if (isUndo) {
                scene.remove(action.item);
                placedItems = placedItems.filter(i => i !== action.item);
                if (selectedPlacedItem === action.item) { selectedPlacedItem = null; updateSelectedInfo(); }
            } else {
                scene.add(action.item);
                placedItems.push(action.item);
                selectedPlacedItem = action.item;
                updateSelectedInfo();
            }
            break;

        case 'remove':
            if (isUndo) {
                scene.add(action.item);
                placedItems.push(action.item);
                selectedPlacedItem = action.item;
                updateSelectedInfo();
            } else {
                scene.remove(action.item);
                placedItems = placedItems.filter(i => i !== action.item);
                if (selectedPlacedItem === action.item) { selectedPlacedItem = null; updateSelectedInfo(); }
            }
            break;

        case 'transform':
            // Swap before/after states
            const currentState = captureItemState(action.item);
            restoreItemState(action.item, isUndo ? action.before : action.after);
            if (isUndo) {
                action.after = currentState;
            } else {
                action.before = currentState;
            }
            selectedPlacedItem = action.item;
            updateSelectedInfo();
            break;
    }
}

window.undoAction = function () {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    applyUndoRedo(action, true);
    redoStack.push(action);
    if (redoStack.length > UNDO_MAX) redoStack.shift();
};

window.redoAction = function () {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    applyUndoRedo(action, false);
    undoStack.push(action);
};

window.moveItem = function (dx, dz) {
    if (selectedPlacedItem) {
        const before = captureItemState(selectedPlacedItem);
        const newPos = selectedPlacedItem.position.clone();
        newPos.x += dx;
        newPos.z += dz;
        const isWall = selectedPlacedItem.userData.isWallArt || selectedPlacedItem.userData.isPoster;
        const constrained = constrainToRoom(newPos, null, isWall);
        if (constrained) {
            selectedPlacedItem.position.x = constrained.x;
            selectedPlacedItem.position.z = constrained.z;
            if (!selectedPlacedItem.userData.isWallArt && !selectedPlacedItem.userData.isPoster) {
                selectedPlacedItem.position.y = 0;
            }
            pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
        }
    }
};

window.rotateItem = function (degrees) {
    if (selectedPlacedItem) {
        const before = captureItemState(selectedPlacedItem);
        selectedPlacedItem.rotation.y += degrees * Math.PI / 180;
        pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
    }
};

window.tiltItem = function (degrees) {
    if (selectedPlacedItem) {
        const before = captureItemState(selectedPlacedItem);
        selectedPlacedItem.rotation.z += degrees * Math.PI / 180;
        pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
    }
};

window.moveItemY = function (dy) {
    if (selectedPlacedItem) {
        const before = captureItemState(selectedPlacedItem);
        selectedPlacedItem.position.y = Math.max(0, selectedPlacedItem.position.y + dy);
        pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
    }
};

// Snap item to nearest wall — auto-position flush against wall and face into room
window.snapToWall = function () {
    if (!selectedPlacedItem) return;
    const before = captureItemState(selectedPlacedItem);

    const pos = selectedPlacedItem.position;
    const x = pos.x;
    const z = pos.z;
    const ssZoff = SPECIAL_SPECIAL_Z_OFFSET;

    // Determine which room
    const tsBounds = ROOM_GEOMETRY['THREE_STAR'].bounds;
    const ssBounds = ROOM_GEOMETRY['SPECIAL_SPECIAL'].bounds;
    const inTS = x >= tsBounds.minX && x <= tsBounds.maxX && z >= tsBounds.minZ && z <= tsBounds.maxZ;
    const inSS = x >= ssBounds.minX && x <= ssBounds.maxX && z >= ssBounds.minZ && z <= ssBounds.maxZ;

    let walls = [];
    if (inTS) {
        walls = [
            { name: 'north', dist: Math.abs(z - tsBounds.maxZ), snapZ: tsBounds.maxZ - 0.03, snapX: x, rotY: Math.PI },     // North wall: face south
            { name: 'south', dist: Math.abs(z - tsBounds.minZ), snapZ: tsBounds.minZ + 0.03, snapX: x, rotY: 0 },             // South wall: face north
            { name: 'east', dist: Math.abs(x - tsBounds.maxX), snapX: tsBounds.maxX - 0.03, snapZ: z, rotY: -Math.PI / 2 },  // East wall: face west
            { name: 'west', dist: Math.abs(x - tsBounds.minX), snapX: tsBounds.minX + 0.03, snapZ: z, rotY: Math.PI / 2 }    // West wall: face east
        ];
    } else if (inSS) {
        walls = [
            { name: 'north', dist: Math.abs(z - ssBounds.maxZ), snapZ: ssBounds.maxZ - 0.03, snapX: x, rotY: Math.PI },
            { name: 'south', dist: Math.abs(z - ssBounds.minZ), snapZ: ssBounds.minZ + 0.03, snapX: x, rotY: 0 },
            { name: 'east', dist: Math.abs(x - ssBounds.maxX), snapX: ssBounds.maxX - 0.03, snapZ: z, rotY: -Math.PI / 2 },
            { name: 'west', dist: Math.abs(x - ssBounds.minX), snapX: ssBounds.minX + 0.03, snapZ: z, rotY: Math.PI / 2 }
        ];
    } else {
        return; // Not in a room
    }

    // Find nearest wall
    walls.sort((a, b) => a.dist - b.dist);
    const nearest = walls[0];

    // Snap position
    if (nearest.snapX !== undefined) pos.x = nearest.snapX;
    if (nearest.snapZ !== undefined) pos.z = nearest.snapZ;

    // Set Y rotation to face into room
    selectedPlacedItem.rotation.y = nearest.rotY;

    // Wall art & posters: ensure at eye level if on floor
    if (selectedPlacedItem.userData.isWallArt || selectedPlacedItem.userData.isPoster) {
        if (pos.y < 0.5) pos.y = 1.5;
    }
    pushUndo({ type: 'transform', item: selectedPlacedItem, before, after: captureItemState(selectedPlacedItem) });
};

// Auto-snap posters/wall art to nearest wall on placement
function autoSnapToWall(item) {
    if (!item.userData.isWallArt && !item.userData.isPoster) return;

    const pos = item.position;
    const x = pos.x;
    const z = pos.z;

    const tsBounds = ROOM_GEOMETRY['THREE_STAR'].bounds;
    const ssBounds = ROOM_GEOMETRY['SPECIAL_SPECIAL'].bounds;
    const inTS = x >= tsBounds.minX && x <= tsBounds.maxX && z >= tsBounds.minZ && z <= tsBounds.maxZ;
    const inSS = x >= ssBounds.minX && x <= ssBounds.maxX && z >= ssBounds.minZ && z <= ssBounds.maxZ;

    let walls = [];
    if (inTS) {
        walls = [
            { dist: Math.abs(z - tsBounds.maxZ), snapZ: tsBounds.maxZ - 0.03, snapX: x, rotY: Math.PI },
            { dist: Math.abs(z - tsBounds.minZ), snapZ: tsBounds.minZ + 0.03, snapX: x, rotY: 0 },
            { dist: Math.abs(x - tsBounds.maxX), snapX: tsBounds.maxX - 0.03, snapZ: z, rotY: -Math.PI / 2 },
            { dist: Math.abs(x - tsBounds.minX), snapX: tsBounds.minX + 0.03, snapZ: z, rotY: Math.PI / 2 }
        ];
    } else if (inSS) {
        walls = [
            { dist: Math.abs(z - ssBounds.maxZ), snapZ: ssBounds.maxZ - 0.03, snapX: x, rotY: Math.PI },
            { dist: Math.abs(z - ssBounds.minZ), snapZ: ssBounds.minZ + 0.03, snapX: x, rotY: 0 },
            { dist: Math.abs(x - ssBounds.maxX), snapX: ssBounds.maxX - 0.03, snapZ: z, rotY: -Math.PI / 2 },
            { dist: Math.abs(x - ssBounds.minX), snapX: ssBounds.minX + 0.03, snapZ: z, rotY: Math.PI / 2 }
        ];
    } else {
        return;
    }

    walls.sort((a, b) => a.dist - b.dist);
    const nearest = walls[0];

    if (nearest.snapX !== undefined) pos.x = nearest.snapX;
    if (nearest.snapZ !== undefined) pos.z = nearest.snapZ;
    item.rotation.y = nearest.rotY;
    if (pos.y < 0.5) pos.y = 1.5;
}

window.deleteItem = function () {
    if (selectedPlacedItem) {
        pushUndo({ type: 'remove', item: selectedPlacedItem });
        if (transformControls) transformControls.detach();
        scene.remove(selectedPlacedItem);
        placedItems = placedItems.filter(i => i !== selectedPlacedItem);
        selectedPlacedItem = null;
        updateSelectedInfo();
    }
};

// Keyboard shortcuts for decorator mode
document.addEventListener('keydown', (e) => {
    // Undo/Redo works whenever decorator mode is on (Ctrl/Cmd + Z / Shift+Z)
    if (decoratorMode && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            redoAction();
        } else {
            undoAction();
        }
        return;
    }

    if (!decoratorMode) return;

    switch (e.key.toLowerCase()) {
        case 'g': // Grab/translate mode
            if (transformControls) transformControls.setMode('translate');
            break;
        case 'r': // Rotate Y
            if (selectedPlacedItem) rotateItem(15);
            break;
        case 't': // Tilt (Z-axis rotation)
            if (selectedPlacedItem) tiltItem(e.shiftKey ? -5 : 5);
            break;
        case 'w': // Snap to wall
            if (selectedPlacedItem) snapToWall();
            break;
        case 'delete':
        case 'backspace':
            if (selectedPlacedItem) {
                e.preventDefault();
                deleteItem();
            }
            break;
        case 'escape':
            deselectAll();
            break;
    }
});

window.saveLayout = async function () {
    const layout = placedItems.map(item => ({
        type: item.userData.itemType,
        position: { x: item.position.x, y: item.position.y, z: item.position.z },
        rotation: { x: item.rotation.x || 0, y: item.rotation.y, z: item.rotation.z || 0 }
    }));

    // Save to localStorage as backup
    localStorage.setItem('panafricanLibraryLayout', JSON.stringify(layout));

    // Also save to Vercel Blob for persistent shared storage
    try {
        const response = await fetch('/api/layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        });
        const result = await response.json();
        if (result.success) {
            alert('Layout saved! This layout will be visible to all visitors.');
        } else {
            alert('Layout saved locally. Cloud sync failed: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Cloud save error:', err);
        alert('Layout saved locally. Cloud sync unavailable.');
    }
};

window.loadLayout = async function () {
    try {
        // First try to load from Vercel Blob (shared layout)
        const response = await fetch('/api/layout');
        const result = await response.json();

        if (result.success && result.layout && result.layout.length > 0) {
            applyLayout(result.layout);
            alert('Shared layout loaded from cloud!');
            return;
        }
    } catch (err) {
        console.error('Cloud load error:', err);
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('panafricanLibraryLayout');
    if (saved) {
        const layout = JSON.parse(saved);
        applyLayout(layout);
        alert('Layout loaded from local storage.');
    } else {
        alert('No saved layout found.');
    }
};

function applyLayout(layout) {
    // Clear existing placed items
    placedItems.forEach(item => scene.remove(item));
    placedItems = [];
    // Recreate items
    layout.forEach(data => {
        const item = createFurnitureItem(data.type);
        item.position.set(data.position.x, data.position.y || 0, data.position.z);
        item.rotation.y = data.rotation.y;
        if (data.rotation.x) item.rotation.x = data.rotation.x;
        if (data.rotation.z) item.rotation.z = data.rotation.z;
        scene.add(item);
        placedItems.push(item);
    });
}

// Auto-load shared layout on page load
async function autoLoadLayout() {
    try {
        const response = await fetch('/api/layout');
        const result = await response.json();

        if (result.success && result.layout && result.layout.length > 0) {
            applyLayout(result.layout);
            console.log('Auto-loaded shared layout from cloud');
        }
    } catch (err) {
        // Silently fail - just use empty layout
        console.log('No shared layout available');
    }
}

// Call autoLoadLayout after scene is ready
setTimeout(autoLoadLayout, 1000);

window.resetLayout = function () {
    if (confirm('Reset to default layout? This will remove all placed items.')) {
        placedItems.forEach(item => scene.remove(item));
        placedItems = [];
        deselectAll();
    }
};

window.exportLayout = function () {
    const layout = placedItems.map(item => ({
        type: item.userData.itemType,
        position: { x: item.position.x, y: item.position.y, z: item.position.z },
        rotation: { x: item.rotation.x || 0, y: item.rotation.y, z: item.rotation.z || 0 }
    }));
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panafrican-library-layout.json';
    a.click();
};

// Wall visibility based on camera position
// Hide the wall nearest to the camera so you can see inside the rooms
function updateWallVisibility() {
    if (!hideNearWall) {
        // Show all walls
        Object.values(threeStarRoomWalls).forEach(w => { if (w) w.visible = true; });
        Object.values(specialSpecialRoomWalls).forEach(w => { if (w) w.visible = true; });
        if (northCorridorGroup) northCorridorGroup.visible = true;
        return;
    }

    // Use camera look direction to determine which wall is BEHIND the camera
    // The wall behind the camera should be hidden (camera looking away from it, into the room)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir); // unit vector camera is looking at

    // For each exterior wall, compute dot(cameraForward, wallOutwardNormal)
    // The wall with the MOST NEGATIVE dot product is behind the camera → hide it

    // === THREE STAR (Panafrican Library) ===
    // Exterior walls only (shared left/west wall is never hidden)
    // front (south) outward normal = (0,0,-1)
    // back  (north) outward normal = (0,0,+1)
    // right (east)  outward normal = (+1,0,0)
    const tsCandidates = [
        { key: 'front', score: camDir.z * -1 },      // dot with (0,0,-1)
        { key: 'back', score: camDir.z * 1 },       // dot with (0,0,+1)
        { key: 'right', score: camDir.x * 1 }        // dot with (+1,0,0)
    ];
    tsCandidates.sort((a, b) => a.score - b.score);  // most negative first
    const tsHideKey = tsCandidates[0].key;

    // Show all TS walls, then hide the one behind camera
    if (threeStarRoomWalls.front) threeStarRoomWalls.front.visible = true;
    if (threeStarRoomWalls.back) threeStarRoomWalls.back.visible = true;
    if (threeStarRoomWalls.right) threeStarRoomWalls.right.visible = true;
    if (threeStarRoomWalls.left) threeStarRoomWalls.left.visible = true; // shared — always visible
    if (threeStarRoomWalls[tsHideKey]) threeStarRoomWalls[tsHideKey].visible = false;

    // === SPECIAL SPECIAL (Sound Library) ===
    // Exterior walls only (shared east wall is never hidden)
    // front (south) outward normal = (0,0,-1)
    // back  (north) outward normal = (0,0,+1)
    // left  (west)  outward normal = (-1,0,0)
    const ssCandidates = [
        { key: 'front', score: camDir.z * -1 },      // dot with (0,0,-1)
        { key: 'back', score: camDir.z * 1 },       // dot with (0,0,+1)
        { key: 'left', score: camDir.x * -1 }       // dot with (-1,0,0)
    ];
    ssCandidates.sort((a, b) => a.score - b.score);  // most negative first
    const ssHideKey = ssCandidates[0].key;

    // Show all SS walls, then hide the one behind camera
    if (specialSpecialRoomWalls.front) specialSpecialRoomWalls.front.visible = true;
    if (specialSpecialRoomWalls.back) specialSpecialRoomWalls.back.visible = true;
    if (specialSpecialRoomWalls.left) specialSpecialRoomWalls.left.visible = true;
    if (specialSpecialRoomWalls[ssHideKey]) specialSpecialRoomWalls[ssHideKey].visible = false;

    // === NORTH CORRIDOR ===
    // Only manage corridor visibility when surroundings toggle is on
    if (northCorridorGroup && showSurroundings) {
        const hidingNorthSide = (tsHideKey === 'back' || ssHideKey === 'back');
        northCorridorGroup.visible = !hidingNorthSide;
    }
}

// Ceiling objects cache — avoid scene.traverse() every frame
let ceilingObjects = [];
let ceilingCacheDirty = true;

function buildCeilingCache() {
    ceilingObjects = [];
    scene.traverse((obj) => {
        if (obj.userData.isCeiling) ceilingObjects.push(obj);
    });
    ceilingCacheDirty = false;
}

// Auto ceiling visibility based on camera height
let lastCeilingState = null;
function updateCeilingVisibility() {
    if (!showCeiling) return;
    const isAbove = camera.position.y > CEILING_HEIGHT + 1;
    if (isAbove === lastCeilingState) return; // No change, skip
    lastCeilingState = isAbove;

    if (ceilingCacheDirty) buildCeilingCache();
    for (let i = 0; i < ceilingObjects.length; i++) {
        ceilingObjects[i].visible = !isAbove;
    }
}

// Throttled wall visibility — run max ~30fps instead of every frame
let lastWallUpdate = 0;
function throttledWallVisibility() {
    const now = performance.now();
    if (now - lastWallUpdate < 33) return; // ~30fps
    lastWallUpdate = now;
    updateWallVisibility();
}

function animate() {
    requestAnimationFrame(animate);
    currentRotationX += (targetRotationX - currentRotationX) * 0.05;
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;

    // WASD movement only when no text input is focused
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable);
    if (!isTyping) {
        if (keys['w']) cameraTarget.z -= 0.1;
        if (keys['s']) cameraTarget.z += 0.1;
        if (keys['a']) cameraTarget.x -= 0.1;
        if (keys['d']) cameraTarget.x += 0.1;
    }

    camera.position.x = cameraTarget.x + Math.sin(currentRotationX) * Math.cos(currentRotationY) * cameraDistance;
    camera.position.y = cameraTarget.y + Math.sin(currentRotationY) * cameraDistance;
    camera.position.z = cameraTarget.z + Math.cos(currentRotationX) * Math.cos(currentRotationY) * cameraDistance;
    camera.lookAt(cameraTarget);

    throttledWallVisibility();
    updateCeilingVisibility();

    renderer.render(scene, camera);
}
animate();

// Build ceiling cache after scene is fully loaded
setTimeout(() => { ceilingCacheDirty = true; }, 1000);

// Initialize transform controls for visual editing gizmos
initTransformControls();

// Initialize drag-drop systems
setupCanvasDragDrop();
setupLibraryDragDrop();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== ADMIN SYSTEM ==========
let adminUser = null;
let adminToken = null;
let selectedRenderStyle = 'photorealistic';

// Check for saved admin session
const savedAdmin = localStorage.getItem('panafricanAdmin');
if (savedAdmin) {
    try {
        const data = JSON.parse(savedAdmin);
        adminUser = data.email;
        adminToken = data.token;
        // Hide login button, show profile badge
        document.getElementById('admin-btn').style.display = 'none';
        document.getElementById('admin-profile').style.display = 'flex';
        document.getElementById('admin-name').textContent = '👤 ' + (data.name || 'Admin');
    } catch (e) { }
}

window.toggleAdminLogin = function () {
    if (adminUser) {
        toggleAdminPanel();
    } else {
        document.getElementById('login-modal').classList.add('visible');
        document.getElementById('login-email').focus();
    }
};

window.closeLoginModal = function () {
    document.getElementById('login-modal').classList.remove('visible');
    document.getElementById('login-email').value = '';
    document.getElementById('login-error').textContent = '';
};

window.attemptLogin = async function () {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        document.getElementById('login-error').textContent = 'Please enter your email';
        return;
    }

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();

        if (result.success && result.isAdmin) {
            adminUser = result.email;
            adminToken = result.token;
            localStorage.setItem('panafricanAdmin', JSON.stringify({
                email: result.email,
                token: result.token,
                name: result.name
            }));
            // Hide login button, show profile badge
            document.getElementById('admin-btn').style.display = 'none';
            document.getElementById('admin-profile').style.display = 'flex';
            document.getElementById('admin-name').textContent = '👤 ' + result.name;
            document.getElementById('admin-user-name').textContent = 'Logged in as: ' + result.name;
            closeLoginModal();
            toggleAdminPanel();
            loadAdminConfigs();
        } else {
            document.getElementById('login-error').textContent = 'Not an authorized admin email';
        }
    } catch (err) {
        document.getElementById('login-error').textContent = 'Login failed: ' + err.message;
    }
};

window.logoutAdmin = function () {
    adminUser = null;
    adminToken = null;
    localStorage.removeItem('panafricanAdmin');
    // Show login button, hide profile badge
    document.getElementById('admin-btn').style.display = 'block';
    document.getElementById('admin-profile').style.display = 'none';
    document.getElementById('admin-panel').classList.remove('open');
};

window.toggleAdminPanel = function () {
    if (!adminUser) {
        toggleAdminLogin();
        return;
    }
    const panel = document.getElementById('admin-panel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        initAdminLists(); // Render localStorage-based layouts & views
        updateCameraPositionDisplay();
    }
};

window.switchAdminTab = function (tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.querySelectorAll('.admin-content').forEach(c => c.style.display = 'none');
    document.getElementById('admin-tab-' + tab).style.display = 'block';
};

function updateCameraPositionDisplay() {
    const display = document.getElementById('camera-position-display');
    if (display) {
        display.innerHTML = `Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})<br>Target: (${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)})<br>Distance: ${cameraDistance.toFixed(2)} | RotX: ${currentRotationX.toFixed(2)} | RotY: ${currentRotationY.toFixed(2)}`;
    }
}

setInterval(() => {
    if (document.getElementById('admin-panel').classList.contains('open')) {
        updateCameraPositionDisplay();
    }
}, 500);

async function loadAdminConfigs() {
    try {
        const layoutRes = await fetch('/api/config?type=layout');
        const layoutData = await layoutRes.json();
        renderConfigList('saved-layouts-list', layoutData.configs || [], 'layout');
    } catch (e) {
        document.getElementById('saved-layouts-list').innerHTML = '<div style="color:#666;font-size:12px;padding:10px;">Failed to load</div>';
    }
    try {
        const viewRes = await fetch('/api/config?type=view');
        const viewData = await viewRes.json();
        renderConfigList('saved-views-list', viewData.configs || [], 'view');
    } catch (e) {
        document.getElementById('saved-views-list').innerHTML = '<div style="color:#666;font-size:12px;padding:10px;">Failed to load</div>';
    }
    try {
        const moodRes = await fetch('/api/config?type=mood');
        const moodData = await moodRes.json();
        renderConfigList('saved-mood-list', moodData.configs || [], 'mood');
    } catch (e) {
        document.getElementById('saved-mood-list').innerHTML = '<div style="color:#666;font-size:12px;padding:10px;">Failed to load</div>';
    }
}

function renderConfigList(containerId, configs, type) {
    const container = document.getElementById(containerId);
    if (configs.length === 0) {
        container.innerHTML = '<div style="color:#666;font-size:12px;padding:10px;">No saved ' + type + 's yet</div>';
        return;
    }
    container.innerHTML = configs.map(cfg => `
                <div class="saved-config-item">
                    <div>
                        <div class="saved-config-name">${cfg.name}</div>
                        <div class="saved-config-meta">By ${cfg.author} • ${new Date(cfg.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="saved-config-actions">
                        <button class="saved-config-btn" onclick="loadConfig('${type}', '${cfg.name}')">Load</button>
                        <button class="saved-config-btn danger" onclick="deleteConfig('${type}', '${cfg.name}')">✕</button>
                    </div>
                </div>
            `).join('');
}

// ============ LOCAL STORAGE BASED CONFIG MANAGEMENT ============
// Fallback to localStorage when API is unavailable

let savedLayouts = JSON.parse(localStorage.getItem('savedLayouts')) || [];
let savedViews = JSON.parse(localStorage.getItem('savedViews')) || [];
let draggedConfigIndex = null;
let draggedConfigType = null;

// Default view presets with category and icon for bottom menu grouping
const DEFAULT_VIEW_PRESETS = [
    { name: 'Bird\'s Eye', icon: '🏠', category: 'Overview', description: 'Both rooms from above', rotX: Math.PI, rotY: 0.5, dist: 18, tx: 0, ty: 2, tz: 0 },
    { name: 'Floor Plan View', icon: '📐', category: 'Overview', description: 'Top-down floor plan view', rotX: Math.PI, rotY: 1.5, dist: 14, tx: 0, ty: 0, tz: 0 },
    { name: 'Entry Vestibule', icon: '🚪', category: 'Panafrican Library', description: 'Three Star room from entry door', rotX: Math.PI, rotY: 0.15, dist: 3, tx: THREE_STAR_X, ty: 1.5, tz: THREE_STAR_DEPTH / 2 - 1 },
    { name: 'Inside View', icon: '🔊', category: 'Panafrican Library', description: 'Three Star room interior', rotX: Math.PI, rotY: 0.2, dist: 5, tx: THREE_STAR_X, ty: 1.5, tz: 0 },
    { name: 'Window Wall', icon: '🪟', category: 'Panafrican Library', description: 'Three Star south windows', rotX: Math.PI, rotY: 0.15, dist: 4, tx: THREE_STAR_X, ty: 1.5, tz: -THREE_STAR_DEPTH / 4 },
    { name: 'Display Table', icon: '📚', category: 'Panafrican Library', description: 'Three Star reading table', rotX: Math.PI * 0.8, rotY: 0.25, dist: 4, tx: THREE_STAR_X, ty: 0.8, tz: 0 },
    { name: 'Entry (from door)', icon: '🚪', category: 'Sound Library', description: 'Special Special entry corridor', rotX: Math.PI, rotY: 0.15, dist: 3, tx: SPECIAL_SPECIAL_X, ty: 1.5, tz: SPECIAL_SPECIAL_DEPTH / 2 - 1 },
    { name: 'Inside View', icon: '📖', category: 'Sound Library', description: 'Special Special room interior', rotX: Math.PI, rotY: 0.2, dist: 6, tx: SPECIAL_SPECIAL_X, ty: 1.5, tz: 0 },
    { name: 'Arched Windows', icon: '🪟', category: 'Sound Library', description: 'Special Special south windows', rotX: Math.PI, rotY: 0.15, dist: 4, tx: SPECIAL_SPECIAL_X, ty: 1.5, tz: -SPECIAL_SPECIAL_DEPTH / 4 },
    { name: 'Seating Area', icon: '🛋️', category: 'Sound Library', description: 'Special Special seating area', rotX: Math.PI * 0.7, rotY: 0.2, dist: 4, tx: SPECIAL_SPECIAL_X, ty: 0.5, tz: 0.5 },
    { name: 'Book Displays', icon: '📚', category: 'Sound Library', description: 'Special Special bookshelf wall', rotX: Math.PI * 1.2, rotY: 0.2, dist: 5, tx: SPECIAL_SPECIAL_X, ty: 1.2, tz: SPECIAL_SPECIAL_DEPTH / 3 }
];

function buildViewFromPreset(v, i) {
    return {
        id: Date.now() + i,
        name: v.name,
        icon: v.icon || '📷',
        category: v.category || 'General',
        description: v.description,
        data: {
            rotationX: v.rotX, rotationY: v.rotY, distance: v.dist,
            target: { x: v.tx, y: v.ty, z: v.tz },
            position: { x: 0, y: 0, z: 0 }
        },
        author: 'Default',
        createdAt: new Date().toISOString(),
        isDefault: true
    };
}

// Seed default views if empty OR if old format (no category/icon on any view)
const viewsNeedReseed = savedViews.length === 0 ||
    (savedViews.length > 0 && savedViews.every(v => !v.category || v.category === 'General'));
if (viewsNeedReseed) {
    savedViews = DEFAULT_VIEW_PRESETS.map((v, i) => buildViewFromPreset(v, i));
    saveViewsToStorage();
}

function saveLayoutsToStorage() {
    localStorage.setItem('savedLayouts', JSON.stringify(savedLayouts));
}

function saveViewsToStorage() {
    localStorage.setItem('savedViews', JSON.stringify(savedViews));
    renderBottomMenuViews(); // Keep bottom menu in sync
}

// Render the bottom controls-panel views from savedViews, grouped by category
function renderBottomMenuViews() {
    const container = document.getElementById('views-menu-container');
    if (!container) return;

    // Group views by category (preserve order)
    const groups = [];
    const groupMap = {};
    savedViews.forEach((view, idx) => {
        const cat = view.category || 'General';
        if (!groupMap[cat]) {
            groupMap[cat] = { category: cat, views: [] };
            groups.push(groupMap[cat]);
        }
        groupMap[cat].views.push({ ...view, _idx: idx });
    });

    container.innerHTML = groups.map(g => `
                <div class="control-section">
                    <div class="section-title">${g.category}</div>
                    ${g.views.map(v => `<button class="control-btn" onclick="loadView(${v._idx})"><span class="icon">${v.icon || '📷'}</span>${v.name}</button>`).join('')}
                </div>
            `).join('');
}

// Initial render of bottom menu views
renderBottomMenuViews();

window.saveAdminLayout = function () {
    const name = document.getElementById('layout-name').value.trim();
    const description = document.getElementById('layout-description')?.value.trim() || '';
    if (!name) { alert('Please enter a layout name'); return; }

    const layout = placedItems.map(item => ({
        type: item.userData.itemType,
        position: { x: item.position.x, y: item.position.y, z: item.position.z },
        rotation: { x: item.rotation.x || 0, y: item.rotation.y, z: item.rotation.z || 0 }
    }));

    const layoutEntry = {
        id: Date.now(),
        name: name,
        description: description,
        data: layout,
        author: adminUser || 'Admin',
        createdAt: new Date().toISOString()
    };

    savedLayouts.push(layoutEntry);
    saveLayoutsToStorage();

    document.getElementById('layout-name').value = '';
    if (document.getElementById('layout-description')) {
        document.getElementById('layout-description').value = '';
    }

    renderLayoutsList();
    alert('Layout saved!');
};

window.saveAdminView = function () {
    const name = document.getElementById('view-name').value.trim();
    const description = document.getElementById('view-description').value.trim();
    const icon = document.getElementById('view-icon').value.trim() || '📷';
    const category = document.getElementById('view-category').value || 'Custom';
    if (!name) { alert('Please enter a view name'); return; }

    const viewEntry = {
        id: Date.now(),
        name: name,
        icon: icon,
        category: category,
        description: description,
        data: {
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: cameraTarget.x, y: cameraTarget.y, z: cameraTarget.z },
            distance: cameraDistance,
            rotationX: currentRotationX,
            rotationY: currentRotationY
        },
        author: adminUser || 'Admin',
        createdAt: new Date().toISOString()
    };

    savedViews.push(viewEntry);
    saveViewsToStorage();

    document.getElementById('view-name').value = '';
    document.getElementById('view-description').value = '';
    document.getElementById('view-icon').value = '📷';

    renderViewsList();
    alert('View saved!');
};

window.loadLayout = function (index) {
    const layout = savedLayouts[index];
    if (layout && layout.data) {
        applyLayout(layout.data);
        alert(`Layout "${layout.name}" loaded!`);
    }
};

window.loadView = function (index) {
    const view = savedViews[index];
    if (view && view.data) {
        const data = view.data;
        // Use smooth animation via animateToView
        animateToView({
            rotX: data.rotationX,
            rotY: data.rotationY,
            dist: data.distance,
            target: new THREE.Vector3(data.target.x, data.target.y, data.target.z)
        });
    }
};

window.deleteLayout = function (index, event) {
    event.stopPropagation();
    const layout = savedLayouts[index];
    if (confirm(`Delete layout "${layout.name}"?`)) {
        savedLayouts.splice(index, 1);
        saveLayoutsToStorage();
        renderLayoutsList();
    }
};

window.deleteView = function (index, event) {
    event.stopPropagation();
    const view = savedViews[index];
    if (confirm(`Delete view "${view.name}"?`)) {
        savedViews.splice(index, 1);
        saveViewsToStorage();
        renderViewsList();
    }
};

window.editLayout = function (index, event) {
    event.stopPropagation();
    const layout = savedLayouts[index];
    const newName = prompt('Edit layout name:', layout.name);
    if (newName && newName.trim()) {
        const newDesc = prompt('Edit description:', layout.description || '');
        savedLayouts[index].name = newName.trim();
        savedLayouts[index].description = newDesc || '';
        saveLayoutsToStorage();
        renderLayoutsList();
    }
};

window.editView = function (index, event) {
    event.stopPropagation();
    const view = savedViews[index];
    const newName = prompt('Edit view name:', view.name);
    if (newName && newName.trim()) {
        const newDesc = prompt('Edit description:', view.description || '');
        const newIcon = prompt('Edit icon emoji:', view.icon || '📷');
        const newCat = prompt('Edit category (groups views in menu):', view.category || 'General');
        savedViews[index].name = newName.trim();
        savedViews[index].description = newDesc || '';
        if (newIcon && newIcon.trim()) savedViews[index].icon = newIcon.trim();
        if (newCat && newCat.trim()) savedViews[index].category = newCat.trim();
        saveViewsToStorage();
        renderViewsList();
    }
};

window.updateViewPosition = function (index, event) {
    event.stopPropagation();
    const view = savedViews[index];
    if (confirm(`Update "${view.name}" with current camera position?`)) {
        savedViews[index].data = {
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: cameraTarget.x, y: cameraTarget.y, z: cameraTarget.z },
            distance: cameraDistance,
            rotationX: currentRotationX,
            rotationY: currentRotationY
        };
        saveViewsToStorage();
        renderViewsList();
        alert('View position updated!');
    }
};

function renderLayoutsList() {
    const container = document.getElementById('saved-layouts-list');
    const countEl = document.getElementById('layouts-count');
    if (countEl) countEl.textContent = `(${savedLayouts.length})`;

    if (savedLayouts.length === 0) {
        container.innerHTML = '<div style="color: #666; font-size: 12px; padding: 10px;">No layouts saved yet</div>';
        return;
    }

    container.innerHTML = savedLayouts.map((layout, idx) => `
                <div class="saved-config-item" draggable="true" data-index="${idx}" data-type="layout"
                     onclick="loadLayout(${idx})">
                    <div class="saved-config-info">
                        <div class="saved-config-name">${layout.name}</div>
                        <div class="saved-config-meta">${layout.description || ''} • ${new Date(layout.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="saved-config-actions">
                        <button class="saved-config-btn move" title="Drag to reorder">⋮⋮</button>
                        <button class="saved-config-btn edit" onclick="editLayout(${idx}, event)" title="Edit">✏️</button>
                        <button class="saved-config-btn danger" onclick="deleteLayout(${idx}, event)" title="Delete">✕</button>
                    </div>
                </div>
            `).join('');

    setupConfigDragDrop('layout');
}

function renderViewsList() {
    const container = document.getElementById('saved-views-list');
    const countEl = document.getElementById('views-count');
    if (countEl) countEl.textContent = `(${savedViews.length})`;

    if (savedViews.length === 0) {
        container.innerHTML = '<div style="color: #666; font-size: 12px; padding: 10px;">No views saved yet</div>';
        return;
    }

    container.innerHTML = savedViews.map((view, idx) => `
                <div class="saved-config-item" draggable="true" data-index="${idx}" data-type="view"
                     onclick="loadView(${idx})">
                    <div class="saved-config-info">
                        <div class="saved-config-name">${view.icon || '📷'} ${view.name}</div>
                        <div class="saved-config-meta">${view.category || 'General'} • ${view.description || ''}</div>
                    </div>
                    <div class="saved-config-actions">
                        <button class="saved-config-btn move" title="Drag to reorder">⋮⋮</button>
                        <button class="saved-config-btn" onclick="updateViewPosition(${idx}, event)" title="Update to current camera">📍</button>
                        <button class="saved-config-btn edit" onclick="editView(${idx}, event)" title="Edit name, icon, category">✏️</button>
                        <button class="saved-config-btn danger" onclick="deleteView(${idx}, event)" title="Delete">✕</button>
                    </div>
                </div>
            `).join('');

    setupConfigDragDrop('view');
}

function setupConfigDragDrop(type) {
    const container = document.getElementById(type === 'layout' ? 'saved-layouts-list' : 'saved-views-list');
    const items = container.querySelectorAll('.saved-config-item');

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedConfigIndex = parseInt(item.dataset.index);
            draggedConfigType = type;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedConfigIndex = null;
            draggedConfigType = null;
            items.forEach(i => i.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            items.forEach(i => i.classList.remove('drag-over'));
            item.classList.add('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIndex = parseInt(item.dataset.index);
            if (draggedConfigIndex !== null && draggedConfigIndex !== targetIndex && draggedConfigType === type) {
                reorderConfig(type, draggedConfigIndex, targetIndex);
            }
            items.forEach(i => i.classList.remove('drag-over'));
        });
    });
}

function reorderConfig(type, fromIndex, toIndex) {
    const arr = type === 'layout' ? savedLayouts : savedViews;
    const item = arr.splice(fromIndex, 1)[0];
    arr.splice(toIndex, 0, item);

    if (type === 'layout') {
        saveLayoutsToStorage();
        renderLayoutsList();
    } else {
        saveViewsToStorage();
        renderViewsList();
    }
}

window.exportLayoutFile = function () {
    const layout = placedItems.map(item => ({
        type: item.userData.itemType,
        position: { x: item.position.x, y: item.position.y, z: item.position.z },
        rotation: { x: item.rotation.x || 0, y: item.rotation.y, z: item.rotation.z || 0 }
    }));
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panafrican-library-layout-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
};

window.importLayoutFile = function () {
    document.getElementById('import-layout-input').click();
};

window.handleLayoutImport = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                const name = prompt('Name for imported layout:', file.name.replace('.json', ''));
                if (name) {
                    savedLayouts.push({
                        id: Date.now(),
                        name: name,
                        description: 'Imported from file',
                        data: data,
                        author: adminUser || 'Admin',
                        createdAt: new Date().toISOString()
                    });
                    saveLayoutsToStorage();
                    renderLayoutsList();
                    alert('Layout imported successfully!');
                }
            } else {
                alert('Invalid layout file format');
            }
        } catch (err) {
            alert('Failed to parse layout file: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
};

window.updateCameraDisplay = function () {
    const display = document.getElementById('camera-position-display');
    if (display) {
        display.innerHTML = `
                    Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})<br>
                    Target: (${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)})<br>
                    Distance: ${cameraDistance.toFixed(2)}<br>
                    RotX: ${currentRotationX.toFixed(3)} | RotY: ${currentRotationY.toFixed(3)}
                `;
    }
};

window.resetDefaultViews = function () {
    if (!confirm('Reset views to defaults? This will replace all current views.')) return;
    savedViews = DEFAULT_VIEW_PRESETS.map((v, i) => buildViewFromPreset(v, i));
    saveViewsToStorage();
    renderViewsList();
};

// Initialize lists on admin panel open
function initAdminLists() {
    renderLayoutsList();
    renderViewsList();
    renderAdminRendersList();
    updateCameraDisplay();
}

window.saveMoodEntry = async function () {
    const title = document.getElementById('mood-title').value.trim();
    const imageUrl = document.getElementById('mood-image-url').value.trim();
    const description = document.getElementById('mood-description').value.trim();
    const category = document.getElementById('mood-category').value;
    if (!title || !imageUrl) { alert('Please enter a title and image URL'); return; }

    // Add to moodboard images array
    moodboardImages.push({
        src: imageUrl,
        title: title + (description ? ' - ' + description : ''),
        category: category
    });
    saveMoodboardImages();

    document.getElementById('mood-title').value = '';
    document.getElementById('mood-image-url').value = '';
    document.getElementById('mood-description').value = '';

    alert('Added to mood board!');
};

// ========== AI RENDER SYSTEM ==========
let capturedImageData = null;

window.openRenderModal = function () {
    document.getElementById('render-modal').classList.add('visible');
    populateRenderViewsBar();
    // Defer heavy render capture so click handler returns fast (fixes INP)
    requestAnimationFrame(() => {
        captureForRender();
    });
};

// Populate the quick-view buttons in the render modal from savedViews
function populateRenderViewsBar() {
    const bar = document.getElementById('render-views-bar');
    if (!bar || !savedViews || savedViews.length === 0) return;
    bar.innerHTML = savedViews.map((v, i) => {
        const icon = v.icon || '📷';
        const name = v.name || 'View ' + (i + 1);
        return `<button class="render-view-btn" onclick="renderSwitchView(${i}, this)" title="${name}">${icon} ${name}</button>`;
    }).join('');
}

// Switch to a saved view from the render modal, then recapture
window.renderSwitchView = function (index, btn) {
    const view = savedViews[index];
    if (!view || !view.data) return;

    // Highlight active button
    document.querySelectorAll('.render-view-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Hide the modal briefly so we can see the 3D view animate
    const modal = document.getElementById('render-modal');
    modal.style.opacity = '0.15';
    modal.style.pointerEvents = 'none';

    const data = view.data;
    animateToView({
        rotX: data.rotationX,
        rotY: data.rotationY,
        dist: data.distance,
        target: new THREE.Vector3(data.target.x, data.target.y, data.target.z)
    }, 800);

    // After animation completes, recapture and restore modal
    setTimeout(() => {
        captureForRender();
        // Reset output preview for new view
        document.getElementById('render-output-preview').innerHTML = 'Generated image will appear here';
        const status = document.getElementById('render-status');
        status.style.display = 'none';
        status.innerHTML = '<span class="render-spinner"></span><span id="render-status-text">Generating render...</span>';
        document.getElementById('generate-render-btn').disabled = false;

        modal.style.opacity = '1';
        modal.style.pointerEvents = '';
    }, 900);
};

window.closeRenderModal = function () {
    document.getElementById('render-modal').classList.remove('visible');
    capturedImageData = null;
};

window.selectRenderStyle = function (style, btn) {
    selectedRenderStyle = style;
    document.querySelectorAll('.render-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

function captureForRender() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    capturedImageData = dataURL;
    document.getElementById('render-input-preview').innerHTML = `<img src="${dataURL}" alt="3D Scene">`;
}

window.generateRender = async function () {
    if (!capturedImageData) { alert('Please wait for capture'); return; }
    const btn = document.getElementById('generate-render-btn');
    const status = document.getElementById('render-status');
    const statusText = document.getElementById('render-status-text');
    const outputPreview = document.getElementById('render-output-preview');

    btn.disabled = true;
    status.style.display = 'block';
    statusText.textContent = 'Generating photorealistic render... This may take 10-30 seconds';
    outputPreview.innerHTML = '<span class="render-spinner"></span>';

    try {
        const customPrompt = document.getElementById('render-custom-prompt').value.trim();
        const response = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: capturedImageData,
                style: selectedRenderStyle,
                prompt: customPrompt
            })
        });
        const result = await response.json();
        if (result.success && result.image) {
            outputPreview.innerHTML = `<img src="${result.image}" alt="AI Render">`;
            statusText.textContent = 'Render complete!';
            setTimeout(() => {
                status.innerHTML = `
                            <button class="admin-btn admin-btn-success" onclick="downloadRender()">💾 Download Render</button>
                            <button class="admin-btn admin-btn-secondary" onclick="captureNewView()">🔄 Capture New View</button>
                        `;
            }, 1000);
            window.lastRenderImage = result.image;
            // Save render to localStorage
            saveRenderToHistory(result.image, selectedRenderStyle);
        } else {
            throw new Error(result.error || result.text || 'Unknown error');
        }
    } catch (err) {
        statusText.textContent = 'Error: ' + err.message;
        outputPreview.innerHTML = 'Generation failed';
    } finally {
        btn.disabled = false;
    }
};

window.downloadRender = function () {
    if (!window.lastRenderImage) return;
    const a = document.createElement('a');
    a.href = window.lastRenderImage;
    a.download = 'panafrican-library-render-' + selectedRenderStyle + '-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
    a.click();
};

// Capture a new 3D view and reset render UI so user can generate again
window.captureNewView = function () {
    // Close modal briefly to capture the live 3D view
    const modal = document.getElementById('render-modal');
    modal.classList.remove('visible');
    requestAnimationFrame(() => {
        setTimeout(() => {
            // Re-open and capture fresh view
            modal.classList.add('visible');
            captureForRender();
            // Reset output preview
            document.getElementById('render-output-preview').innerHTML = 'Generated image will appear here';
            // Reset status area
            const status = document.getElementById('render-status');
            status.style.display = 'none';
            status.innerHTML = '<span class="render-spinner"></span><span id="render-status-text">Generating render...</span>';
            // Re-enable generate button
            document.getElementById('generate-render-btn').disabled = false;
        }, 200);
    });
};

// Save render to localStorage history
function saveRenderToHistory(imageData, style) {
    try {
        let renders = JSON.parse(localStorage.getItem('readingroom_renders') || '[]');
        // Store thumbnail (resize to save space) — store up to 20 renders
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            style: style,
            image: imageData  // base64 image
        };
        renders.unshift(entry);
        // Keep only last 20
        if (renders.length > 20) renders = renders.slice(0, 20);
        try {
            localStorage.setItem('readingroom_renders', JSON.stringify(renders));
        } catch (e) {
            // If storage is full, keep fewer renders
            renders = renders.slice(0, 5);
            localStorage.setItem('readingroom_renders', JSON.stringify(renders));
        }
        // Update admin panel if open
        renderAdminRendersList();
    } catch (e) {
        console.warn('Could not save render:', e);
    }
}

// Render the admin panel renders list
function renderAdminRendersList() {
    const list = document.getElementById('saved-renders-list');
    if (!list) return;
    const renders = JSON.parse(localStorage.getItem('readingroom_renders') || '[]');
    if (renders.length === 0) {
        list.innerHTML = '<div style="color: #666; font-size: 12px; padding: 10px;">No renders yet. Click "AI Render" to generate one.</div>';
        return;
    }
    list.innerHTML = renders.map((r, i) => {
        const date = new Date(r.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
                    <div class="saved-config-item" style="display:flex; gap:10px; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <img src="${r.image}" style="width:80px; height:50px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="viewSavedRender(${i})">
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:12px; color:#fff;">${r.style || 'photorealistic'}</div>
                            <div style="font-size:10px; color:#666;">${dateStr}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="item-control-btn" onclick="downloadSavedRender(${i})" title="Download">💾</button>
                            <button class="item-control-btn danger" onclick="deleteSavedRender(${i})" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
    }).join('');
}

window.viewSavedRender = function (index) {
    const renders = JSON.parse(localStorage.getItem('readingroom_renders') || '[]');
    if (!renders[index]) return;
    // Open render modal and show the saved render
    document.getElementById('render-modal').classList.add('visible');
    document.getElementById('render-output-preview').innerHTML = `<img src="${renders[index].image}" alt="Saved Render">`;
    document.getElementById('render-input-preview').innerHTML = 'Viewing saved render';
    window.lastRenderImage = renders[index].image;
    const status = document.getElementById('render-status');
    status.style.display = 'block';
    status.innerHTML = `
                <button class="admin-btn admin-btn-success" onclick="downloadRender()">💾 Download Render</button>
                <button class="admin-btn admin-btn-secondary" onclick="captureNewView()">🔄 Capture New View</button>
            `;
};

window.downloadSavedRender = function (index) {
    const renders = JSON.parse(localStorage.getItem('readingroom_renders') || '[]');
    if (!renders[index]) return;
    const a = document.createElement('a');
    a.href = renders[index].image;
    a.download = 'panafrican-library-render-' + (renders[index].style || 'render') + '-' + new Date(renders[index].date).toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
    a.click();
};

window.deleteSavedRender = function (index) {
    let renders = JSON.parse(localStorage.getItem('readingroom_renders') || '[]');
    renders.splice(index, 1);
    localStorage.setItem('readingroom_renders', JSON.stringify(renders));
    renderAdminRendersList();
};

