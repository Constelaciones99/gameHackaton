import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Corregido: era "dd"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        this.loadingManager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        
        this.assets = {};
        this.environmentGroup = new THREE.Group();
        
        this.init();
    }
    
    async init() {
        // Configurar renderer con HDR
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Configurar cámara y controles
        this.setupCamera();
        this.setupControls();
        
        // Cargar assets
        await this.loadAssets();
        
        // Construir escena
        this.setupScene();
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Posición fija similar a Banished - vista isométrica limitada
        this.camera.position.set(25, 25, 25);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Limitar movimientos como Banished - vista fija con rotación limitada
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minPolarAngle = Math.PI / 4;
        this.controls.maxAzimuthAngle = Math.PI / 4;
        this.controls.minAzimuthAngle = -Math.PI / 4;
        
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;
    }
    
    async loadAssets() {
        this.showLoadingScreen();
        
        try {
            // Cargar texturas de terreno primero (más críticas)
            await this.loadTerrainTextures();
            
            // Cargar modelos 3D
            await this.load3DModels();
            
            // Intentar cargar HDR (opcional)
            await this.loadHDRI();
            
        } catch (error) {
            console.error('Error loading assets:', error);
            this.createFallbackEnvironment();
        }
        
        this.hideLoadingScreen();
    }
    
    async loadHDRI() {
        return new Promise((resolve, reject) => {
            // Primero intentar cargar desde la ruta específica
            const rgbeLoader = new RGBELoader();
            rgbeLoader.load(
                '/assets/textures/sky/sunset.hdr',
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this.scene.environment = texture;
                    this.scene.background = texture;
                    console.log('HDR cargado exitosamente');
                    resolve();
                },
                undefined,
                () => {
                    console.log('HDR no encontrado, usando fallback');
                    resolve(); // No rechazar, solo usar fallback
                }
            );
        });
    }
    
    async loadTerrainTextures() {
        try {
            // Cargar texturas con rutas absolutas desde public/
            const textures = {
                // Usar la textura de arena que tienes
                sand: await this.loadTexture('/assets/textures/ground/coast_sand_rocks_02_diff_4k.jpg'),
                // Para otras texturas, usar colores sólidos como fallback
                grass: await this.createFallbackTexture(0x7CFC00),
                dirt: await this.createFallbackTexture(0x8B4513),
                rock: await this.createFallbackTexture(0x696969)
            };
            
            this.assets.textures = textures;
            console.log('Texturas cargadas:', Object.keys(textures));
            
        } catch (error) {
            console.warn('Error cargando texturas, usando fallbacks:', error);
            this.assets.textures = {
                sand: await this.createFallbackTexture(0xC2B280),
                grass: await this.createFallbackTexture(0x7CFC00),
                dirt: await this.createFallbackTexture(0x8B4513),
                rock: await this.createFallbackTexture(0x696969)
            };
        }
    }
    
    loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    console.log('Textura cargada:', path);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(4, 4); // Repeater para mejor cobertura
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('Error cargando textura:', path, error);
                    reject(error);
                }
            );
        });
    }
    
    createFallbackTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Crear un patrón simple
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, 256, 256);
        
        // Añadir algo de variación
        context.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const size = Math.random() * 10 + 5;
            context.fillRect(x, y, size, size);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return texture;
    }
    
    async load3DModels() {
        try {
            // Cargar modelos GLTF si existen
            await this.loadGLTFModel('/assets/models/environment/scene.gltf', 'mountain');
            await this.loadGLTFModel('/assets/models/clouds/scene.gltf', 'cloud');
            
        } catch (error) {
            console.warn('Modelos 3D no encontrados, usando geometrías básicas:', error);
            // Los crearemos programáticamente en setupScene()
        }
    }
    
    async loadGLTFModel(path, name) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    console.log('Modelo 3D cargado:', name);
                    this.assets[name] = gltf.scene;
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    console.warn('No se pudo cargar el modelo:', path, error);
                    reject(error);
                }
            );
        });
    }
    
    createFallbackEnvironment() {
        console.log('Creando entorno fallback');
        // Skybox fallback simple
        const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    setupScene() {
        this.scene.add(this.environmentGroup);
        
        // Crear terreno extenso con texturas reales
        this.createExtendedTerrain();
        
        // Crear montañas (usando modelo o fallback)
        this.createMountains();
        
        // Crear nubes
        this.createCloudSystem();
        
        // Configurar iluminación
        this.setupAdvancedLighting();
    }
    
    createExtendedTerrain() {
        const terrainSize = 100;
        const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 64, 64);
        
        // Aplicar desplazamiento para terreno irregular
        const vertices = terrainGeometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);
            
            // Usar noise más sofisticado
            const height = this.generateTerrainHeight(x, z, terrainSize) * 5;
            vertices.setY(i, height);
        }
        
        terrainGeometry.computeVertexNormals();
        
        // Usar la textura de arena que tienes disponible
        const terrainMaterial = new THREE.MeshStandardMaterial({
            map: this.assets.textures.sand,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        
        this.environmentGroup.add(terrain);
    }
    
    generateTerrainHeight(x, z, size) {
        // Función de noise más realista
        const scale = 0.1;
        let height = 0;
        
        // Múltiples octavas para terreno más natural
        height += this.simplexNoise(x * scale, z * scale) * 0.5;
        height += this.simplexNoise(x * scale * 2, z * scale * 2) * 0.25;
        height += this.simplexNoise(x * scale * 4, z * scale * 4) * 0.125;
        
        return (height + 1) * 0.5; // Normalizar a 0-1
    }
    
    simplexNoise(x, y) {
        // Implementación mejorada de noise
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        
        // Simulación simple - en producción usar una librería proper
        return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 - Math.floor(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
    }
    
    createMountains() {
        const mountainGroup = new THREE.Group();
        
        // Si tenemos modelos de montañas cargados, usarlos
        if (this.assets.mountain) {
            for (let i = 0; i < 4; i++) {
                const mountain = this.assets.mountain.clone();
                const angle = (i / 4) * Math.PI * 2;
                const distance = 40 + Math.random() * 10;
                
                mountain.position.set(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                mountain.scale.set(3, 3, 3);
                mountainGroup.add(mountain);
            }
        } else {
            // Fallback: crear montañas básicas
            for (let i = 0; i < 8; i++) {
                const mountain = this.createBasicMountain();
                const angle = (i / 8) * Math.PI * 2;
                const distance = 45 + Math.random() * 10;
                
                mountain.position.set(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                mountainGroup.add(mountain);
            }
        }
        
        this.environmentGroup.add(mountainGroup);
    }
    
    createBasicMountain() {
        const height = 10 + Math.random() * 8;
        const radius = 4 + Math.random() * 3;
        
        const geometry = new THREE.ConeGeometry(radius, height, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x5D4037,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.y = height / 2;
        mountain.castShadow = true;
        
        return mountain;
    }
    
    createCloudSystem() {
        this.cloudGroup = new THREE.Group();
        
        // Si tenemos modelos de nubes, usarlos
        if (this.assets.cloud) {
            for (let i = 0; i < 8; i++) {
                const cloud = this.assets.cloud.clone();
                cloud.position.set(
                    -30 + Math.random() * 60,
                    20 + Math.random() * 15,
                    -30 + Math.random() * 60
                );
                cloud.scale.set(0.5, 0.5, 0.5);
                cloud.userData.speed = 0.005 + Math.random() * 0.01;
                this.cloudGroup.add(cloud);
            }
        } else {
            // Fallback: nubes básicas
            for (let i = 0; i < 12; i++) {
                const cloud = this.createBasicCloud();
                cloud.position.set(
                    -40 + Math.random() * 80,
                    15 + Math.random() * 10,
                    -40 + Math.random() * 80
                );
                cloud.userData.speed = 0.01 + Math.random() * 0.02;
                this.cloudGroup.add(cloud);
            }
        }
        
        this.environmentGroup.add(this.cloudGroup);
    }
    
    createBasicCloud() {
        const cloudGroup = new THREE.Group();
        const cloudParts = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < cloudParts; i++) {
            const size = 2 + Math.random() * 1.5;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            const part = new THREE.Mesh(geometry, material);
            part.position.set(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 6
            );
            
            cloudGroup.add(part);
        }
        
        return cloudGroup;
    }
    
    setupAdvancedLighting() {
        // Luz ambiental suave
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Luz directional principal (sol)
        const sunLight = new THREE.DirectionalLight(0xfffbe5, 0.9);
        sunLight.position.set(50, 50, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }
    
    showLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                       background: #000; display: flex; justify-content: center; 
                       align-items: center; z-index: 10000; color: white; font-size: 24px;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 20px;">🌱 Cargando Green Area...</div>
                    <div style="width: 200px; height: 4px; background: #333; border-radius: 2px;">
                        <div id="loadingBar" style="width: 0%; height: 100%; background: #4CAF50; border-radius: 2px; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingScreen);
        
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal) * 100;
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) {
                loadingBar.style.width = `${progress}%`;
            }
        };
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 300);
        }
    }
    
    animateClouds() {
        if (!this.cloudGroup) return;
        
        this.cloudGroup.children.forEach(cloud => {
            cloud.position.x += cloud.userData.speed;
            
            if (cloud.position.x > 50) {
                cloud.position.x = -50;
                cloud.position.z = -40 + Math.random() * 80;
            }
        });
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    render() {
        this.animateClouds();
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}