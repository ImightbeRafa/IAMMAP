class MapApp {
    constructor() {
        // Initialize canvas and context
        this.canvas = document.getElementById('draw-layer');
        this.ctx = this.canvas.getContext('2d');
        
        // Basic settings
        this.gridSize = 20;
        this.brushSize = 1;
        this.isDrawing = false;
        this.drawingColor = '#27ae60';
        this.currentSafetyLevel = 'green';
        
        // State tracking
        this.drawingHistory = [];
        this.currentMode = 'hand';
        this.drawings = new Map();
        
        // Map state
        this.mapState = {
            zoom: 7,
            center: { lat: 9.7489, lng: -83.7534 },
            bounds: {
                north: 11.0,
                south: 8.0,
                east: -82.0,
                west: -85.0
            }
        };

        // Initialize everything
        this.initializeCanvas();
        this.setupModeControls();
        this.setupEventListeners();

        // Initial mode setup
        this.setMode('hand');
    }

    // Fixed initializeCanvas method
    initializeCanvas() {
        // Bind the resize handler to preserve 'this' context
        this.handleResize = () => {
            const mapContainer = document.querySelector('.map-container');
            this.canvas.width = mapContainer.offsetWidth;
            this.canvas.height = mapContainer.offsetHeight;
            
            // Calculate grid dimensions
            this.columns = Math.ceil(this.canvas.width / this.gridSize);
            this.rows = Math.ceil(this.canvas.height / this.gridSize);
            
            // Draw grid and existing content
            this.drawInitialGrid();
            if (this.drawings.size > 0) {
                this.redrawAll();
            }
        };

        // Add resize listener and trigger initial resize
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    // Draw grid method
    drawInitialGrid() {
        if (!this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Set grid style
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = 0; x <= width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    setupModeControls() {
        // Get tool elements
        const handTool = document.getElementById('hand-tool');
        const brushTool = document.getElementById('brush-tool');
        const brushControls = document.getElementById('brush-controls');

        if (!handTool || !brushTool || !brushControls) {
            console.error('Required tool elements not found');
            return;
        }

        // Hand tool click handler
        handTool.addEventListener('click', () => {
            this.setMode('hand');
            handTool.classList.add('active');
            brushTool.classList.remove('active');
            brushControls.classList.add('hidden');
            this.canvas.classList.remove('brush-mode');
            this.canvas.classList.add('hand-mode');
        });

        // Brush tool click handler
        brushTool.addEventListener('click', () => {
            console.log('Brush tool activated');
            this.setMode('brush');
            brushTool.classList.add('active');
            handTool.classList.remove('active');
            brushControls.classList.remove('hidden');
            this.canvas.classList.add('brush-mode');
            this.canvas.classList.remove('hand-mode');
        });

        // Set up brush size control
        const brushSizeInput = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        
        if (brushSizeInput && brushSizeValue) {
            brushSizeInput.addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value);
                brushSizeValue.textContent = this.brushSize;
            });
        }
    }

    setMode(mode) {
        this.currentMode = mode;
        this.isDrawing = false;

        // Update canvas pointer events based on mode
        if (mode === 'brush') {
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.cursor = 'grab';
        }

        // Update tool panel visual state
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${mode}-tool`);
        });
    }

    setupEventListeners() {
        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.currentMode !== 'brush') return;
            this.isDrawing = true;
            this.draw(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawing || this.currentMode !== 'brush') return;
            this.draw(e);
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.saveDrawings();
                this.drawingHistory.push(new Map(this.drawings));
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });

        // Safety level controls
        document.querySelectorAll('.safety-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.safety-btn').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSafetyLevel = btn.dataset.level;
                this.updateDrawingColor();
            });
        });

        // Clear and Undo buttons
        const clearBtn = document.getElementById('clear-btn');
        const undoBtn = document.getElementById('undo-btn');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCanvas());
        }
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }
    }

    draw(e) {
        if (!this.ctx || !this.isDrawing || this.currentMode !== 'brush') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Apply brush size
        for (let i = -this.brushSize + 1; i < this.brushSize; i++) {
            for (let j = -this.brushSize + 1; j < this.brushSize; j++) {
                const gridX = Math.floor((x + i * this.gridSize) / this.gridSize) * this.gridSize;
                const gridY = Math.floor((y + j * this.gridSize) / this.gridSize) * this.gridSize;
                
                const key = `${gridX},${gridY}`;
                
                // Draw the cell
                this.ctx.fillStyle = this.drawingColor;
                this.ctx.fillRect(gridX, gridY, this.gridSize, this.gridSize);
                
                // Store the drawing
                this.drawings.set(key, {
                    color: this.drawingColor,
                    safetyLevel: this.currentSafetyLevel
                });
            }
        }
    }

    clearCanvas() {
        this.drawings.clear();
        this.drawingHistory.push(new Map());
        this.redrawAll();
    }

    undo() {
        if (this.drawingHistory.length > 1) {
            this.drawingHistory.pop();
            this.drawings = new Map(this.drawingHistory[this.drawingHistory.length - 1]);
            this.redrawAll();
        }
    }

    redrawAll() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawInitialGrid();

        for (const [key, drawing] of this.drawings) {
            const [x, y] = key.split(',').map(Number);
            this.ctx.fillStyle = drawing.color;
            this.ctx.fillRect(x, y, this.gridSize, this.gridSize);
        }
    }

    updateDrawingColor() {
        const colors = {
            green: '#27ae60',
            yellow: '#f1c40f',
            red: '#e74c3c'
        };
        this.drawingColor = colors[this.currentSafetyLevel];
    }

    saveDrawings() {
        // Implement your save logic here
        console.log('Drawings saved:', this.drawings);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MapApp();
});