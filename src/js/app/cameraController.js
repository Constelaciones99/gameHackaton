import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.camera = null;
        this.controls = null;
        
        this.init();
    }
    
    init() {
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV más reducido para vista más natural
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Posición de cámara más alta y angular
        this.camera.position.set(15, 20, 15);
        this.camera.lookAt(0, 0, 0);
        
        this.sceneManager.camera = this.camera;
        this.setupOrbitControls();
    }
    
    setupOrbitControls() {
        this.controls = new OrbitControls(this.camera, this.sceneManager.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2.5; // Limitar ángulo para vista aérea
        this.controls.minPolarAngle = Math.PI / 6; // Evitar vista desde abajo
        
        // Suavizar los movimientos
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;
        this.controls.panSpeed = 0.5;
    }
    
    onWindowResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
    
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }
}