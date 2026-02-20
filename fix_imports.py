import os

main_js = 'src/main.js'

with open(main_js, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
"""

content = content.replace('import * as THREE from "three";\n', imports)
content = content.replace('new THREE.GLTFLoader()', 'new GLTFLoader()')
content = content.replace('new THREE.OBJLoader()', 'new OBJLoader()')
content = content.replace('new THREE.TransformControls(', 'new TransformControls(')

with open(main_js, 'w', encoding='utf-8') as f:
    f.write(content)

print("Imports fixed")
