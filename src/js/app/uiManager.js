export class UIManager {
    constructor(game) {
        this.game = game;
        this.currentPopup = null;
        this.activeTool = null;
        
        // Asignar a global para acceso desde HTML
        window.uiManager = this;
        
        this.init();
    }
    
    init() {
        this.setupToolbarEventListeners();
        this.updateResourceDisplay();
        this.updateTimeDisplay();
    }
    
    setupToolbarEventListeners() {
        // Esperar a que el DOM esté listo
        setTimeout(() => {
            const tools = document.querySelectorAll('.icon-tool');
            console.log('Encontrados', tools.length, 'iconos de herramientas');
            
            tools.forEach(tool => {
                tool.addEventListener('click', (e) => {
                    const toolName = e.currentTarget.dataset.tool;
                    console.log('Clic en herramienta:', toolName);
                    this.showToolPanel(toolName);
                });
            });
            
            // Botón cerrar panel
            const closeBtn = document.getElementById('closePanel');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideToolPanel();
                });
            }
        }, 100);
    }
    
    showToolPanel(toolName) {
        const panel = document.getElementById('toolPanel');
        const title = document.getElementById('panelTitle');
        const content = document.getElementById('panelContent');
        
        if (!panel || !title || !content) {
            console.error('Elementos del panel no encontrados');
            return;
        }
        
        // Remover activo de todos los iconos
        document.querySelectorAll('.icon-tool').forEach(t => t.classList.remove('active'));
        
        // Activar icono clickeado
        const activeTool = document.querySelector(`[data-tool="${toolName}"]`);
        if (activeTool) {
            activeTool.classList.add('active');
        }
        
        this.activeTool = toolName;
        
        // Actualizar contenido según la herramienta
        let panelTitle = 'Bienvenido';
        let panelContent = '<p>Selecciona una herramienta para comenzar</p>';
        
        switch (toolName) {
            case 'user':
                panelTitle = 'Datos del Usuario';
                panelContent = this.getUserPanelContent();
                break;
            case 'environment':
                panelTitle = 'Condiciones Ambientales';
                panelContent = this.getEnvironmentPanelContent();
                break;
            case 'terrain':
                panelTitle = 'Información del Terreno';
                panelContent = this.getTerrainPanelContent();
                break;
            case 'maps':
                panelTitle = 'Mapas Disponibles';
                panelContent = this.getMapsPanelContent();
                break;
            case 'inventory':
                panelTitle = 'Inventario y Tienda';
                panelContent = this.getInventoryPanelContent();
                break;
            case 'progress':
                panelTitle = 'Progreso del Juego';
                panelContent = this.getProgressPanelContent();
                break;
        }
        
        title.textContent = panelTitle;
        content.innerHTML = panelContent;
        
        panel.classList.add('active');
        console.log('Panel activado para:', toolName);
    }
    
    hideToolPanel() {
        const panel = document.getElementById('toolPanel');
        if (panel) {
            panel.classList.remove('active');
        }
        document.querySelectorAll('.icon-tool').forEach(t => t.classList.remove('active'));
        this.activeTool = null;
    }
    
    getUserPanelContent() {
        const player = this.game.gameState.player;
        return `
            <div class="user-info">
                <div class="info-item">
                    <label>Nombre:</label>
                    <span>${player.name || 'No definido'}</span>
                </div>
                <div class="info-item">
                    <label>Edad:</label>
                    <span>${player.age || 'No definido'}</span>
                </div>
                <div class="info-item">
                    <label>Género:</label>
                    <span>${player.gender || 'No definido'}</span>
                </div>
                <div class="info-item">
                    <label>País:</label>
                    <span>${player.country}</span>
                </div>
                <button onclick="window.uiManager.showEditUserPopup()" 
                        style="margin-top: 15px; background: #4CAF50; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
                    Editar Datos
                </button>
            </div>
        `;
    }
    
    getEnvironmentPanelContent() {
        const loc = this.game.gameState.location;
        const temp = loc.temperature;
        let tempFeeling = 'Templado';
        let tempIcon = '🌡️';
        
        if (temp < 15) {
            tempFeeling = 'Frío';
            tempIcon = '❄️';
        } else if (temp > 28) {
            tempFeeling = 'Caluroso';
            tempIcon = '🔥';
        }
        
        return `
            <div class="environment-info">
                <div class="info-item">
                    <label>Ubicación:</label>
                    <span>${loc.name}</span>
                </div>
                <div class="info-item">
                    <label>Hora:</label>
                    <span id="panelTime">${this.formatTime(this.game.gameTime.hours, this.game.gameTime.minutes, this.game.gameTime.seconds)}</span>
                </div>
                <div class="info-item temperature-display">
                    <label>Temperatura:</label>
                    <span>${temp}°C <span class="weather-icon">${tempIcon}</span> (${tempFeeling})</span>
                </div>
                <div class="info-item">
                    <label>Estación:</label>
                    <span class="season-badge">${loc.season}</span>
                </div>
                <div class="info-item">
                    <label>Humedad:</label>
                    <span>${loc.humidity}%</span>
                </div>
                <div class="info-item">
                    <label>Presión:</label>
                    <span>${loc.pressure} hPa</span>
                </div>
            </div>
        `;
    }
    
    getTerrainPanelContent() {
        const available = this.getAvailableSquares();
        const total = this.game.fieldManager.fieldSize * this.game.fieldManager.fieldSize;
        
        return `
            <div class="terrain-info">
                <div class="info-item">
                    <label>Terreno:</label>
                    <span>${this.game.fieldManager.fieldSize}x${this.game.fieldManager.fieldSize}</span>
                </div>
                <div class="info-item">
                    <label>Cuadros libres:</label>
                    <span>${available}/${total}</span>
                </div>
                <div class="info-item">
                    <label>Fertilidad media:</label>
                    <span>${this.calculateAverageFertility()}%</span>
                </div>
                <div class="info-item">
                    <label>Humedad media:</label>
                    <span>${this.calculateAverageMoisture()}%</span>
                </div>
            </div>
        `;
    }
    
    getAvailableSquares() {
        let available = 0;
        for (let x = 0; x < this.game.fieldManager.fieldSize; x++) {
            for (let z = 0; z < this.game.fieldManager.fieldSize; z++) {
                if (this.game.fieldManager.squares[x] && this.game.fieldManager.squares[x][z] && this.game.fieldManager.squares[x][z].isEmpty) {
                    available++;
                }
            }
        }
        return available;
    }
    
    calculateAverageFertility() {
        let total = 0;
        let count = 0;
        
        for (let x = 0; x < this.game.fieldManager.fieldSize; x++) {
            for (let z = 0; z < this.game.fieldManager.fieldSize; z++) {
                if (this.game.fieldManager.squares[x] && this.game.fieldManager.squares[x][z]) {
                    total += this.game.fieldManager.squares[x][z].fertility || 50;
                    count++;
                }
            }
        }
        
        return count > 0 ? Math.round(total / count) : 50;
    }
    
    calculateAverageMoisture() {
        let total = 0;
        let count = 0;
        
        for (let x = 0; x < this.game.fieldManager.fieldSize; x++) {
            for (let z = 0; z < this.game.fieldManager.fieldSize; z++) {
                if (this.game.fieldManager.squares[x] && this.game.fieldManager.squares[x][z]) {
                    total += this.game.fieldManager.squares[x][z].moisture || 50;
                    count++;
                }
            }
        }
        
        return count > 0 ? Math.round(total / count) : 50;
    }
    
    getMapsPanelContent() {
        return `
            <div class="maps-info">
                <h4>Mapas Disponibles</h4>
                <div class="map-item" style="padding: 10px; background: #f0f0f0; margin: 5px 0; border-radius: 5px;">
                    <strong>Valle Verde</strong> - <span style="color: green;">✅ Desbloqueado</span>
                </div>
                <div class="map-item" style="padding: 10px; background: #f0f0f0; margin: 5px 0; border-radius: 5px;">
                    <strong>Montaña Azul</strong> - <span style="color: red;">🔒 100 monedas</span>
                </div>
                <div class="map-item" style="padding: 10px; background: #f0f0f0; margin: 5px 0; border-radius: 5px;">
                    <strong>Lago Serena</strong> - <span style="color: red;">🔒 200 monedas</span>
                </div>
            </div>
        `;
    }
    
    getInventoryPanelContent() {
        return `
            <div class="inventory-info">
                <h4>Inventario</h4>
                <div class="inventory-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>Semillas Básicas</span>
                    <span>${this.game.gameState.resources.seeds}</span>
                </div>
                <div class="inventory-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>Fertilizante</span>
                    <span>0</span>
                </div>
                <div class="inventory-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>Agua</span>
                    <span>∞</span>
                </div>
                
                <h4 style="margin-top: 20px;">Tienda</h4>
                <div style="color: #666; font-style: italic;">
                    La tienda estará disponible pronto...
                </div>
            </div>
        `;
    }
    
    getProgressPanelContent() {
        const totalSquares = this.game.fieldManager.fieldSize * this.game.fieldManager.fieldSize;
        const usedSquares = totalSquares - this.getAvailableSquares();
        const progress = Math.round((usedSquares / totalSquares) * 100);
        
        return `
            <div class="progress-info">
                <div class="progress-item">
                    <label>Progreso del Terreno:</label>
                    <div style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 5px 0;">
                        <div style="background: #4CAF50; width: ${progress}%; height: 100%; border-radius: 10px; transition: width 0.3s;"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
                
                <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center;">
                        <div style="font-size: 24px;">${this.game.gameTime.day}</div>
                        <div style="font-size: 12px; color: #666;">Días</div>
                    </div>
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center;">
                        <div style="font-size: 24px;">${usedSquares}</div>
                        <div style="font-size: 12px; color: #666;">Cuadros usados</div>
                    </div>
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center;">
                        <div style="font-size: 24px;">${this.game.gameState.resources.coins}</div>
                        <div style="font-size: 12px; color: #666;">Monedas</div>
                    </div>
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center;">
                        <div style="font-size: 24px;">${this.game.gameState.resources.happiness}%</div>
                        <div style="font-size: 12px; color: #666;">Felicidad</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    formatTime(hours, minutes, seconds) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displaySeconds = Math.floor(seconds);
        return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')} ${period}`;
    }
    
    updateResourceDisplay() {
        const res = this.game.gameState.resources;
        document.getElementById('coinCount').textContent = res.coins;
        document.getElementById('seedCount').textContent = res.seeds;
        document.getElementById('happinessPercent').textContent = `${res.happiness}%`;
    }
    
    updateTimeDisplay() {
        document.getElementById('gameTime').textContent = 
            this.formatTime(this.game.gameTime.hours, this.game.gameTime.minutes, this.game.gameTime.seconds);
        
        if (this.activeTool === 'environment') {
            const panelTime = document.getElementById('panelTime');
            if (panelTime) {
                panelTime.textContent = 
                    this.formatTime(this.game.gameTime.hours, this.game.gameTime.minutes, this.game.gameTime.seconds);
            }
        }
    }
    
    updateEnvironmentDisplay() {
        if (this.activeTool === 'environment') {
            this.showToolPanel('environment');
        }
    }
    
    showEditUserPopup() {
        const player = this.game.gameState.player;
        const popupHTML = `
            <div class="popup" id="editUserPopup">
                <h2>Editar Datos del Usuario</h2>
                
                <label>Nombre:</label>
                <input type="text" id="editUserName" value="${player.name || ''}" placeholder="Tu nombre">
                
                <label>Edad:</label>
                <input type="number" id="editUserAge" value="${player.age || ''}" placeholder="Tu edad" min="1" max="120">
                
                <label>Género:</label>
                <select id="editUserGender">
                    <option value="">Seleccionar</option>
                    <option value="Masculino" ${player.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                    <option value="Femenino" ${player.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                    <option value="Otro" ${player.gender === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
                
                <label>País:</label>
                <input type="text" id="editUserCountry" value="${player.country || ''}" placeholder="Tu país">
                
                <button onclick="window.uiManager.saveUserData()">Guardar Cambios</button>
                <button onclick="window.uiManager.hidePopup()" style="background: #ccc; margin-top: 5px;">Cancelar</button>
            </div>
        `;
        
        this.showPopup(popupHTML);
    }
    
    saveUserData() {
        const name = document.getElementById('editUserName').value.trim();
        const age = parseInt(document.getElementById('editUserAge').value);
        const gender = document.getElementById('editUserGender').value;
        const country = document.getElementById('editUserCountry').value.trim();
        
        if (!name) {
            alert('Por favor, ingresa tu nombre.');
            return;
        }
        
        this.game.gameState.player = {
            ...this.game.gameState.player,
            name,
            age: isNaN(age) ? null : age,
            gender,
            country: country || 'Perú'
        };
        
        this.hidePopup();
        this.showToolPanel('user'); // Actualizar el panel
    }
    
    // ... resto de métodos de popup existentes
    showWelcomePopup() {
        const popupHTML = `
            <div class="popup" id="welcomePopup">
                <h2>¡Bienvenido a Green Area!</h2>
                <p>Escribe tu nombre:</p>
                <input type="text" id="playerNameInput" placeholder="Tu nombre aquí">
                <button onclick="window.uiManager.handleNameSubmit()">Continuar</button>
            </div>
        `;
        this.showPopup(popupHTML);
        setTimeout(() => {
            const input = document.getElementById('playerNameInput');
            if (input) input.focus();
        }, 100);
    }
    
    showPopup(html) {
        const popupSystem = document.getElementById('popupSystem');
        if (popupSystem) {
            popupSystem.innerHTML = html;
            this.currentPopup = popupSystem.firstElementChild;
        }
    }
    
    hidePopup() {
        const popupSystem = document.getElementById('popupSystem');
        if (popupSystem) {
            popupSystem.innerHTML = '';
            this.currentPopup = null;
        }
    }
    
    handleNameSubmit() {
        const nameInput = document.getElementById('playerNameInput');
        if (!nameInput) return;
        
        const name = nameInput.value.trim();
        
        if (name === '') {
            alert('Por favor, ingresa tu nombre.');
            return;
        }
        
        this.game.gameState.player.name = name;
        document.getElementById('playerNameDisplay').textContent = name;
        
        document.dispatchEvent(new CustomEvent('playerDataUpdated', {
            detail: this.game.gameState.player
        }));
        
        this.hidePopup();
        this.showAgePopup();
    }
    
    showAgePopup() {
        const popupHTML = `
            <div class="popup" id="agePopup">
                <h2>¡Excelente, ${this.game.gameState.player.name}!</h2>
                <p>Ahora dinos tu edad:</p>
                <input type="number" id="playerAgeInput" placeholder="Tu edad" min="1" max="120">
                <button onclick="window.uiManager.handleAgeSubmit()">Continuar</button>
            </div>
        `;
        
        this.showPopup(popupHTML);
        setTimeout(() => {
            const input = document.getElementById('playerAgeInput');
            if (input) input.focus();
        }, 100);
    }
    
    handleAgeSubmit() {
        const ageInput = document.getElementById('playerAgeInput');
        if (!ageInput) return;
        
        const age = parseInt(ageInput.value);
        
        if (isNaN(age) || age < 1 || age > 120) {
            alert('Por favor, ingresa una edad válida.');
            return;
        }
        
        this.game.gameState.player.age = age;
        
        document.dispatchEvent(new CustomEvent('playerDataUpdated', {
            detail: this.game.gameState.player
        }));
        
        this.hidePopup();
        this.showIntroductionPopup();
    }
    
    showIntroductionPopup() {
        const popupHTML = `
            <div class="popup" id="introPopup">
                <h2>¡${this.game.gameState.player.name} el mundo necesita tu ayuda!</h2>
                <p>Al parecer, hoy en día muy pocos conocen lo valiosa que es la información antes de sembrar.</p>
                <p>¿Podrás ser un genio de la agricultura? Empiezas con una población pequeña a la cual debes dar alimento.</p>
                <p>Pero cuidado que plantes mal y pierdas toda tu producción.</p>
                <p>Lo aprendido aquí lo puedes usar en el mundo real, así que ¡Listo para volverte un genio?!</p>
                <button onclick="window.uiManager.handleIntroSubmit()">¡Comenzar!</button>
            </div>
        `;
        
        this.showPopup(popupHTML);
    }
    
    handleIntroSubmit() {
        this.hidePopup();
        console.log('Juego iniciado para:', this.game.gameState.player);
    }
}