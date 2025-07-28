class PhotoEditor {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.currentImage = null;
        this.currentTool = 'select';
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.history = [];
        this.historyIndex = -1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        // Current adjustments
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            temperature: 0,
            vibrance: 0
        };
        
        this.currentFilter = 'none';
        
        this.initializeEventListeners();
        this.updateStatus('Ready');
    }
    
    initializeEventListeners() {
        // File handling
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const browseFile = document.getElementById('browseFile');
        const openFile = document.getElementById('openFile');
        
        // Fix file input event listeners
        if (browseFile) {
            browseFile.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }
        
        if (openFile) {
            openFile.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // Drag and drop
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.loadImage(files[0]);
                }
            });
        }
        
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
            });
        });
        
        // Adjustment controls - Fix slider event listeners
        document.querySelectorAll('.slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const adjustment = e.target.id;
                const value = parseInt(e.target.value);
                this.adjustments[adjustment] = value;
                
                // Update display value
                const valueSpan = e.target.parentNode.querySelector('.adjustment-value');
                if (valueSpan) {
                    valueSpan.textContent = value;
                }
                
                if (this.originalImage) {
                    this.applyAdjustments();
                }
            });
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                if (this.originalImage) {
                    this.applyFilter();
                }
            });
        });
        
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const fitBtn = document.getElementById('fitToScreen');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoom(1.2);
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoom(0.8);
            });
        }
        
        if (fitBtn) {
            fitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.fitToScreen();
            });
        }
        
        // Canvas interactions
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        }
        
        // Undo/Redo
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.undo();
            });
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redo();
            });
        }
        
        // Export functionality
        const exportBtn = document.getElementById('exportFile');
        const saveBtn = document.getElementById('saveFile');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExportModal();
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.quickSave();
            });
        }
        
        // Export modal
        const closeExportBtn = document.getElementById('closeExportModal');
        const cancelExportBtn = document.getElementById('cancelExport');
        const confirmExportBtn = document.getElementById('confirmExport');
        
        if (closeExportBtn) {
            closeExportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideExportModal();
            });
        }
        
        if (cancelExportBtn) {
            cancelExportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideExportModal();
            });
        }
        
        if (confirmExportBtn) {
            confirmExportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportImage();
            });
        }
        
        // Export format change
        const exportFormat = document.getElementById('exportFormat');
        if (exportFormat) {
            exportFormat.addEventListener('change', (e) => {
                const qualityGroup = document.getElementById('qualityGroup');
                if (qualityGroup) {
                    qualityGroup.style.display = (e.target.value === 'png') ? 'none' : 'block';
                }
            });
        }
        
        // Quality slider
        const qualitySlider = document.getElementById('exportQuality');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                const qualityValue = document.getElementById('qualityValue');
                if (qualityValue) {
                    qualityValue.textContent = Math.round(e.target.value * 100) + '%';
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Modal backdrop click to close
        const exportModal = document.getElementById('exportModal');
        if (exportModal) {
            exportModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal__backdrop')) {
                    this.hideExportModal();
                }
            });
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }
    
    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            this.updateStatus('Error: Please select a valid image file');
            return;
        }
        
        this.updateStatus('Loading image...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.resetAdjustments();
                this.setupCanvas();
                this.saveState('Image loaded');
                this.updateImageInfo();
                this.updateStatus('Image loaded successfully');
                
                // Hide drop zone and show canvas
                const dropZone = document.getElementById('dropZone');
                if (dropZone) {
                    dropZone.classList.add('hidden');
                }
                if (this.canvas) {
                    this.canvas.classList.remove('hidden');
                }
            };
            img.onerror = () => {
                this.updateStatus('Error: Failed to load image');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.updateStatus('Error: Failed to read file');
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        if (!this.originalImage) return;
        
        const container = document.getElementById('canvasContainer');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        // Calculate optimal canvas size
        const maxWidth = Math.max(containerRect.width - 64, 400);
        const maxHeight = Math.max(containerRect.height - 64, 300);
        
        let canvasWidth = this.originalImage.width;
        let canvasHeight = this.originalImage.height;
        
        // Scale down if image is too large
        const scaleX = maxWidth / canvasWidth;
        const scaleY = maxHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        
        canvasWidth *= scale;
        canvasHeight *= scale;
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        if (!this.currentImage || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(this.panX, this.panY);
        
        // Draw image
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width / this.zoomLevel, this.canvas.height / this.zoomLevel);
        
        this.ctx.restore();
        
        this.updateZoomDisplay();
    }
    
    applyAdjustments() {
        if (!this.originalImage) return;
        
        this.updateStatus('Applying adjustments...');
        
        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        
        // Draw original image
        tempCtx.drawImage(this.originalImage, 0, 0);
        
        // Get image data
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Apply adjustments
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Brightness
            const brightness = this.adjustments.brightness * 2.55;
            r += brightness;
            g += brightness;
            b += brightness;
            
            // Contrast
            const contrast = (this.adjustments.contrast + 100) / 100;
            r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
            
            // Saturation
            const saturation = (this.adjustments.saturation + 100) / 100;
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray + saturation * (r - gray);
            g = gray + saturation * (g - gray);
            b = gray + saturation * (b - gray);
            
            // Temperature adjustment
            const temp = this.adjustments.temperature / 100;
            if (temp > 0) {
                r += temp * 30;
                b -= temp * 30;
            } else {
                r -= Math.abs(temp) * 30;
                b += Math.abs(temp) * 30;
            }
            
            // Clamp values
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        // Put modified data back
        tempCtx.putImageData(imageData, 0, 0);
        
        // Create new image from canvas
        const newImage = new Image();
        newImage.onload = () => {
            this.currentImage = newImage;
            this.redrawCanvas();
            this.updateStatus('Adjustments applied');
        };
        newImage.src = tempCanvas.toDataURL();
    }
    
    applyFilter() {
        if (!this.originalImage) return;
        
        this.updateStatus('Applying filter...');
        
        if (this.currentFilter === 'none') {
            // Start with original, then apply current adjustments
            this.currentImage = this.originalImage;
            if (this.hasAdjustments()) {
                this.applyAdjustments();
            } else {
                this.redrawCanvas();
                this.updateStatus('Filter removed');
            }
            return;
        }
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        
        tempCtx.drawImage(this.originalImage, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        switch (this.currentFilter) {
            case 'grayscale':
                this.applyGrayscaleFilter(data);
                break;
            case 'sepia':
                this.applySepiaFilter(data);
                break;
            case 'blur':
                this.applyBlurFilter(tempCtx, tempCanvas);
                return;
            case 'vintage':
                this.applyVintageFilter(data);
                break;
            case 'cool':
                this.applyCoolFilter(data);
                break;
            case 'warm':
                this.applyWarmFilter(data);
                break;
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        
        const newImage = new Image();
        newImage.onload = () => {
            this.currentImage = newImage;
            // Apply adjustments on top of filter if any exist
            if (this.hasAdjustments()) {
                this.applyAdjustments();
            } else {
                this.redrawCanvas();
                this.updateStatus('Filter applied');
            }
        };
        newImage.src = tempCanvas.toDataURL();
    }
    
    hasAdjustments() {
        return Object.values(this.adjustments).some(value => value !== 0);
    }
    
    applyGrayscaleFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
    }
    
    applySepiaFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
    }
    
    applyBlurFilter(ctx, canvas) {
        // Simple blur implementation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        const width = canvas.width;
        const height = canvas.height;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                
                let r = 0, g = 0, b = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ni = ((y + dy) * width + (x + dx)) * 4;
                        r += data[ni];
                        g += data[ni + 1];
                        b += data[ni + 2];
                    }
                }
                
                newData[i] = r / 9;
                newData[i + 1] = g / 9;
                newData[i + 2] = b / 9;
            }
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
        
        const newImage = new Image();
        newImage.onload = () => {
            this.currentImage = newImage;
            this.redrawCanvas();
            this.updateStatus('Blur filter applied');
        };
        newImage.src = canvas.toDataURL();
    }
    
    applyVintageFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, r * 1.2 + 30);
            data[i + 1] = Math.min(255, g * 1.1 + 20);
            data[i + 2] = Math.max(0, b * 0.8 - 10);
        }
    }
    
    applyCoolFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, data[i] - 20);
            data[i + 1] = Math.min(255, data[i + 1] + 10);
            data[i + 2] = Math.min(255, data[i + 2] + 30);
        }
    }
    
    applyWarmFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] + 30);
            data[i + 1] = Math.min(255, data[i + 1] + 10);
            data[i + 2] = Math.max(0, data[i + 2] - 20);
        }
    }
    
    zoom(factor) {
        if (!this.currentImage) return;
        
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));
        this.redrawCanvas();
    }
    
    fitToScreen() {
        if (!this.currentImage) return;
        
        const container = document.getElementById('canvasContainer');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        const scaleX = (containerRect.width - 64) / this.canvas.width;
        const scaleY = (containerRect.height - 64) / this.canvas.height;
        
        this.zoomLevel = Math.min(scaleX, scaleY, 1);
        this.panX = 0;
        this.panY = 0;
        this.redrawCanvas();
    }
    
    handleMouseDown(e) {
        if (!this.currentImage) return;
        
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.canvas.style.cursor = 'grabbing';
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const deltaX = (currentX - this.dragStart.x) / this.zoomLevel;
        const deltaY = (currentY - this.dragStart.y) / this.zoomLevel;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.dragStart = { x: currentX, y: currentY };
        this.redrawCanvas();
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
        this.updateCursor();
    }
    
    handleWheel(e) {
        if (!this.currentImage) return;
        
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(delta);
    }
    
    updateCursor() {
        if (!this.currentImage || !this.canvas) return;
        
        switch (this.currentTool) {
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'crop':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'zoom':
                this.canvas.style.cursor = 'zoom-in';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    }
    
    updateImageInfo() {
        const imageInfo = document.getElementById('imageInfo');
        if (!imageInfo) return;
        
        if (!this.originalImage) {
            imageInfo.textContent = 'No image loaded';
            return;
        }
        
        const info = `${this.originalImage.width} × ${this.originalImage.height}px`;
        imageInfo.textContent = info;
    }
    
    updateStatus(message) {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }
    
    resetAdjustments() {
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            temperature: 0,
            vibrance: 0
        };
        
        // Reset UI controls
        Object.keys(this.adjustments).forEach(key => {
            const slider = document.getElementById(key);
            if (slider) {
                slider.value = this.adjustments[key];
                const valueSpan = slider.parentNode.querySelector('.adjustment-value');
                if (valueSpan) {
                    valueSpan.textContent = this.adjustments[key];
                }
            }
        });
        
        // Reset filter
        this.currentFilter = 'none';
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'none') {
                btn.classList.add('active');
            }
        });
    }
    
    saveState(action) {
        if (!this.currentImage) return;
        
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        const state = {
            imageData: this.canvas.toDataURL(),
            adjustments: { ...this.adjustments },
            filter: this.currentFilter,
            action: action
        };
        
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 20) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryUI();
    }
    
    updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (index === this.historyIndex) {
                item.classList.add('active');
            }
            item.textContent = state.action;
            item.addEventListener('click', () => this.restoreState(index));
            historyList.appendChild(item);
        });
    }
    
    restoreState(index) {
        if (index < 0 || index >= this.history.length) return;
        
        const state = this.history[index];
        this.historyIndex = index;
        
        // Restore image
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.adjustments = { ...state.adjustments };
            this.currentFilter = state.filter;
            this.redrawCanvas();
            this.updateHistoryUI();
            this.updateStatus('State restored');
        };
        img.src = state.imageData;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.restoreState(this.historyIndex - 1);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.restoreState(this.historyIndex + 1);
        }
    }
    
    showExportModal() {
        if (!this.currentImage) {
            this.updateStatus('No image to export');
            return;
        }
        
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    exportImage() {
        if (!this.currentImage) return;
        
        const format = document.getElementById('exportFormat').value;
        const quality = parseFloat(document.getElementById('exportQuality').value);
        const filename = document.getElementById('exportFilename').value || 'edited-image';
        
        let mimeType, extension;
        switch (format) {
            case 'jpeg':
                mimeType = 'image/jpeg';
                extension = 'jpg';
                break;
            case 'png':
                mimeType = 'image/png';
                extension = 'png';
                break;
            case 'webp':
                mimeType = 'image/webp';
                extension = 'webp';
                break;
        }
        
        const dataURL = this.canvas.toDataURL(mimeType, quality);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${filename}.${extension}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.hideExportModal();
        this.updateStatus(`Image exported as ${filename}.${extension}`);
    }
    
    quickSave() {
        if (!this.currentImage) {
            this.updateStatus('No image to save');
            return;
        }
        
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.updateStatus('Image saved as PNG');
    }
    
    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.quickSave();
                    break;
                case 'o':
                    e.preventDefault();
                    const fileInput = document.getElementById('fileInput');
                    if (fileInput) {
                        fileInput.click();
                    }
                    break;
            }
        }
        
        // Tool shortcuts (only if not in input field)
        if (!e.target.matches('input, textarea, select')) {
            switch (e.key) {
                case 'v':
                    this.selectTool('select');
                    break;
                case 'c':
                    this.selectTool('crop');
                    break;
                case 'r':
                    this.selectTool('rotate');
                    break;
                case 'b':
                    this.selectTool('brush');
                    break;
                case 't':
                    this.selectTool('text');
                    break;
                case 'z':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.selectTool('zoom');
                    }
                    break;
            }
        }
    }
    
    selectTool(toolName) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tool === toolName) {
                btn.classList.add('active');
            }
        });
        this.currentTool = toolName;
        this.updateCursor();
    }
}

// Initialize the photo editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});