import * as THREE from 'three';
import { SceneManager } from './sceneManager.js';
import { CameraController } from './cameraController.js';
import { FieldManager } from './fieldManager.js';
import { UIManager } from './uiManager.js';

let gameInstance = null;

class GreenAreaGame {
    constructor() {
        this.sceneManager = null;
        this.cameraController = null;
        this.fieldManager = null;
        this.uiManager = null;
        
        this.gameState = {
            player: {
                name: '',
                age: null,
                gender: '',
                country: 'Perú'
            },
            location: {
                name: 'Loreto, Perú',
                temperature: 25,
                humidity: 60,
                pressure: 1013,
                season: 'Verano'
            },
            resources: {
                coins: 100,
                seeds: 5,
                happiness: 100
            },
            currentSeed: null,
            selectedSquare: null
        };
        
        this.gameTime = {
            hours: 6,
            minutes: 0,
            seconds: 0,
            day: 1,
            season: 'Verano'
        };
        
        this.timeSpeed = 2;
        this.lastTimeUpdate = Date.now();
        
        // Asignar a global después de que todo esté inicializado
        setTimeout(() => {
            window.game = this;
        }, 100);
        
        this.init();
    
    }
    
    async init() {
        try {
            console.log('Inicializando Green Area Game...');
            
            this.sceneManager = new SceneManager('gameContainer');
            this.cameraController = new CameraController(this.sceneManager);
            this.fieldManager = new FieldManager(this.sceneManager.scene);
            this.uiManager = new UIManager(this);
            
            this.setupEventListeners();
            this.animate();
            
            setTimeout(() => {
                this.uiManager.showWelcomePopup();
            }, 500);
            
        } catch (error) {
            console.error('Error inicializando el juego:', error);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        document.addEventListener('playerDataUpdated', (e) => {
            this.gameState.player = e.detail;
        });
        
        document.addEventListener('squareSelected', (e) => {
            this.gameState.selectedSquare = e.detail;
            this.uiManager.updateSquareDetails(e.detail);
        });
    }
    
    updateGameTime() {
    const now = Date.now();
    const delta = now - this.lastTimeUpdate;
    
    if (delta > this.timeSpeed * 1000) {
        this.lastTimeUpdate = now;
        this.gameTime.seconds += 60; // 60 segundos de juego = 1 minuto
        
        if (this.gameTime.seconds >= 60) {
            this.gameTime.minutes += 1;
            this.gameTime.seconds = 0;
            
            if (this.gameTime.minutes >= 60) {
                this.gameTime.hours += 1;
                this.gameTime.minutes = 0;
                
                if (this.gameTime.hours >= 24) {
                    this.gameTime.hours = 0;
                    this.gameTime.day += 1;
                    this.updateSeason();
                }
            }
        }
        
        this.updateEnvironment();
        this.uiManager.updateTimeDisplay();
    }
}
    
    updateSeason() {
        const seasons = ['Verano', 'Otoño', 'Invierno', 'Primavera'];
        const seasonIndex = Math.floor(this.gameTime.day / 7) % 4; // Cambio cada 7 días
        this.gameTime.season = seasons[seasonIndex];
        this.gameState.location.season = this.gameTime.season;
    }
    
    updateEnvironment() {
        // Temperatura basada en hora y estación
        let baseTemp = 25;
        switch (this.gameTime.season) {
            case 'Verano': baseTemp = 30; break;
            case 'Invierno': baseTemp = 15; break;
            case 'Otoño': baseTemp = 20; break;
            case 'Primavera': baseTemp = 25; break;
        }
        
        // Variación diurna (más frío en la noche/madrugada)
        const hour = this.gameTime.hours;
        const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 10;
        this.gameState.location.temperature = Math.round(baseTemp + tempVariation);
        
        this.uiManager.updateEnvironmentDisplay();
    }
    
    onWindowResize() {
        if (this.cameraController && this.sceneManager) {
            this.cameraController.onWindowResize();
            this.sceneManager.onWindowResize();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateGameTime();
        
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        if (this.sceneManager) {
            this.sceneManager.render();
        }
    }
}

// Funciones globales para UI
window.handleNameSubmit = () => window.uiManager?.handleNameSubmit();
window.handleAgeSubmit = () => window.uiManager?.handleAgeSubmit();
window.handleIntroSubmit = () => window.uiManager?.handleIntroSubmit();
window.handleEditNameSubmit = () => window.uiManager?.handleEditNameSubmit();
window.hidePopup = () => window.uiManager?.hidePopup();

window.addEventListener('DOMContentLoaded', () => {
    new GreenAreaGame();
});