import * as THREE from 'three';

export class FieldManager {
    constructor(scene) {
        this.scene = scene;
        this.fieldSize = 8;
        this.squareSize = 3;
        this.squares = [];
        this.fieldGroup = new THREE.Group();
        this.cultivableArea = new THREE.Group();
        
        this.init();
    }
    
    async init() {
        this.scene.add(this.fieldGroup);
        this.fieldGroup.add(this.cultivableArea);
        
        // Crear área cultivable elevada
        await this.createCultivableArea();
        this.createField();
        this.createFieldBorders();
    }
    
    async createCultivableArea() {
        // Plataforma elevada para el área cultivable
        const platformGeometry = new THREE.BoxGeometry(
            this.fieldSize * this.squareSize + 2,
            0.5,
            this.fieldSize * this.squareSize + 2
        );
        
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x5D4037,
            roughness: 0.8
        });
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = 0.25; // Media unidad arriba del terreno
        platform.receiveShadow = true;
        platform.castShadow = true;
        
        this.fieldGroup.add(platform);
        
        // Posicionar el área cultivable encima de la plataforma
        this.cultivableArea.position.y = 0.5;
    }
    
    async createField() {
        // Crear cuadrícula de cuadros con texturas reales
        for (let x = 0; x < this.fieldSize; x++) {
            this.squares[x] = [];
            
            for (let z = 0; z < this.fieldSize; z++) {
                const square = await this.createSquare(x, z);
                this.squares[x][z] = square;
                this.cultivableArea.add(square.mesh);
                
                this.createSquareBorders(x, z);
            }
        }
    }
    
    async createSquare(x, z) {
        // Geometría con más detalle para displacement
        const geometry = new THREE.PlaneGeometry(
            this.squareSize * 0.95, 
            this.squareSize * 0.95,
            8, 8
        );
        
        // Aplicar variación de altura a cada cuadro
        const vertices = geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            const variation = (Math.random() - 0.5) * 0.1; // Pequeña variación
            vertices.setY(i, variation);
        }
        
        geometry.computeVertexNormals();
        
        // Material con texturas PBR (Physically Based Rendering)
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7 + Math.random() * 0.2, // Variación de rugosidad
            metalness: 0.1,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            (x - this.fieldSize/2) * this.squareSize + this.squareSize/2,
            0.02,
            (z - this.fieldSize/2) * this.squareSize + this.squareSize/2
        );
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        
        // Datos del cuadro con más propiedades
        const squareData = {
            mesh: mesh,
            isEmpty: true,
            plant: null,
            moisture: 30 + Math.random() * 40,
            fertility: 50 + Math.random() * 50,
            textureVariation: Math.random(), // Para variación visual
            position: { x: x, z: z },
            lastHarvest: null,
            elevation: Math.random() * 0.1 // Pequeña variación de altura
        };
        
        // Aplicar variación de color basada en fertilidad
        this.updateSquareAppearance(squareData);
        
        mesh.userData = squareData;
        return squareData;
    }
    
    updateSquareAppearance(squareData) {
        const material = squareData.mesh.material;
        
        // Variar color basado en fertilidad y humedad
        const baseColor = new THREE.Color(0x8B4513);
        const fertilityFactor = squareData.fertility / 100;
        const moistureFactor = squareData.moisture / 100;
        
        // Ajustar color (más verde para mayor fertilidad/humedad)
        baseColor.r *= (0.8 + fertilityFactor * 0.2);
        baseColor.g *= (0.9 + fertilityFactor * 0.3);
        
        material.color.copy(baseColor);
        material.roughness = 0.8 - (fertilityFactor * 0.3);
        
        material.needsUpdate = true;
    }
    
    createSquareBorders(x, z) {
        const borderWidth = 0.1;
        const borderHeight = 0.05;
        
        if (x < this.fieldSize - 1) {
            const hBorderGeometry = new THREE.BoxGeometry(this.squareSize * 0.1, borderHeight, this.squareSize * 0.9);
            const hBorderMaterial = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.9 });
            const hBorder = new THREE.Mesh(hBorderGeometry, hBorderMaterial);
            
            hBorder.position.set(
                (x - this.fieldSize/2) * this.squareSize + this.squareSize,
                borderHeight/2,
                (z - this.fieldSize/2) * this.squareSize + this.squareSize/2
            );
            this.cultivableArea.add(hBorder);
        }
        
        if (z < this.fieldSize - 1) {
            const vBorderGeometry = new THREE.BoxGeometry(this.squareSize * 0.9, borderHeight, this.squareSize * 0.1);
            const vBorderMaterial = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.9 });
            const vBorder = new THREE.Mesh(vBorderGeometry, vBorderMaterial);
            
            vBorder.position.set(
                (x - this.fieldSize/2) * this.squareSize + this.squareSize/2,
                borderHeight/2,
                (z - this.fieldSize/2) * this.squareSize + this.squareSize
            );
            this.cultivableArea.add(vBorder);
        }
    }
    
    createFieldBorders() {
        const borderHeight = 0.3;
        const borderWidth = 0.5;
        const fieldWidth = this.fieldSize * this.squareSize;
        
        const borderMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3E2723,
            roughness: 0.8
        });
        
        // Bordes norte/sur
        const nsBorderGeometry = new THREE.BoxGeometry(fieldWidth + borderWidth*2, borderHeight, borderWidth);
        const northBorder = new THREE.Mesh(nsBorderGeometry, borderMaterial);
        northBorder.position.set(0, borderHeight/2, -fieldWidth/2 - borderWidth/2);
        this.fieldGroup.add(northBorder);
        
        const southBorder = new THREE.Mesh(nsBorderGeometry, borderMaterial);
        southBorder.position.set(0, borderHeight/2, fieldWidth/2 + borderWidth/2);
        this.fieldGroup.add(southBorder);
        
        // Bordes este/oeste
        const ewBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, fieldWidth + borderWidth*2);
        const eastBorder = new THREE.Mesh(ewBorderGeometry, borderMaterial);
        eastBorder.position.set(fieldWidth/2 + borderWidth/2, borderHeight/2, 0);
        this.fieldGroup.add(eastBorder);
        
        const westBorder = new THREE.Mesh(ewBorderGeometry, borderMaterial);
        westBorder.position.set(-fieldWidth/2 - borderWidth/2, borderHeight/2, 0);
        this.fieldGroup.add(westBorder);
    }
    
    selectSquare(x, z) {
        this.resetSquareColors();
        
        if (this.squares[x] && this.squares[x][z]) {
            const square = this.squares[x][z];
            
            // Resaltar con efecto de selección
            square.mesh.material.emissive = new THREE.Color(0x224422);
            square.mesh.material.emissiveIntensity = 0.3;
            
            document.dispatchEvent(new CustomEvent('squareSelected', {
                detail: square
            }));
        }
    }
    
    resetSquareColors() {
        for (let x = 0; x < this.fieldSize; x++) {
            for (let z = 0; z < this.fieldSize; z++) {
                if (this.squares[x] && this.squares[x][z]) {
                    const square = this.squares[x][z];
                    square.mesh.material.emissive = new THREE.Color(0x000000);
                    square.mesh.material.emissiveIntensity = 0;
                }
            }
        }
    }
    
    // Método para cambiar la textura cuando se cultiva
    cultivateSquare(x, z, plantType) {
        if (this.squares[x] && this.squares[x][z]) {
            const square = this.squares[x][z];
            square.isEmpty = false;
            square.plant = plantType;
            
            // Cambiar apariencia cuando está cultivado
            square.mesh.material.color.set(0x6B8E23); // Verde oliva
            square.mesh.material.roughness = 0.6;
        }
    }
}