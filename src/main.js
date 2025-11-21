import { Scene3D } from './rendering/Scene3D.js';
import { MaterialLibrary } from './rendering/MaterialLibrary.js';
import { JointVisualizer } from './rendering/JointVisualizer.js';
import { StateManager } from './utils/StateManager.js';
import { BoardEditor } from './ui/BoardEditor.js';
import { JointEditor } from './ui/JointEditor.js';
import { Board } from './models/Board.js';
import { JointConfig } from './models/JointConfig.js';

class BoxJointsApp {
  constructor() {
    this.initializeUI();
    this.initializeManagers();
    this.setupKeyboardShortcuts();
    this.loadState();
  }

  initializeUI() {
    const viewport = document.getElementById('viewport');
    this.scene3D = new Scene3D(viewport);
    this.materialLibrary = new MaterialLibrary();
    this.jointVisualizer = new JointVisualizer(this.scene3D, this.materialLibrary);
  }

  initializeManagers() {
    this.stateManager = new StateManager();
    this.boardEditor = new BoardEditor(this.stateManager, this.scene3D, this.materialLibrary);
    this.jointEditor = new JointEditor(this.stateManager, this.boardEditor);

    this.stateManager.subscribe((state) => {
      if (state.boards.size > 0) {
        this.jointVisualizer.visualizeAllBoards(Array.from(state.boards.values()));
      } else {
        this.jointVisualizer.clearAll();
      }
      // Update board selection visuals whenever state changes
      this.updateBoardSelectionVisuals(state);
      // Update toggle state
      const transparencyToggle = document.getElementById('transparency-toggle');
      if (transparencyToggle) {
        transparencyToggle.checked = state.showUnselectedTransparent;
      }
    });

    const addBoardBtn = document.getElementById('add-board-btn');
    addBoardBtn.addEventListener('click', () => {
      this.boardEditor.createBoard();
    });

    const transparencyToggle = document.getElementById('transparency-toggle');
    if (transparencyToggle) {
      transparencyToggle.addEventListener('change', (e) => {
        const state = this.stateManager.getState();
        this.stateManager.setState({ showUnselectedTransparent: e.target.checked });
      });
      // Set initial state of toggle
      const initialState = this.stateManager.getState();
      transparencyToggle.checked = initialState.showUnselectedTransparent;
    }

    const deselectAllBtn = document.getElementById('deselect-all-btn');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        this.boardEditor.deselectAllBoards();
      });
    }

    const undoBtn = document.getElementById('undo-btn');
    undoBtn.addEventListener('click', () => {
      this.stateManager.undo();
      this.refreshScene();
    });

    const redoBtn = document.getElementById('redo-btn');
    redoBtn.addEventListener('click', () => {
      this.stateManager.redo();
      this.refreshScene();
    });

    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', () => {
      this.stateManager.saveToLocalStorage();
      this.showNotification('Project saved');
    });

    const exportBtn = document.getElementById('export-btn');
    exportBtn.addEventListener('click', () => {
      const jsonString = this.stateManager.exportToJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `box-joints-project-${timestamp}.json`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification('Project exported');
    });

    const importBtn = document.getElementById('import-btn');
    importBtn.addEventListener('click', () => {
      const state = this.stateManager.getState();
      const hasBoards = state.boards.size > 0;
      
      if (hasBoards) {
        const confirmed = confirm('This will replace your current project. Continue?');
        if (!confirmed) {
          return;
        }
      }

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
          document.body.removeChild(fileInput);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonString = event.target.result;
            const result = this.stateManager.importFromJSON(jsonString, Board, JointConfig);
            
            if (result.success) {
              this.refreshScene();
              this.showNotification('Project imported');
            } else {
              this.showNotification(`Import failed: ${result.error || 'Unknown error'}`);
            }
          } catch (error) {
            this.showNotification(`Import failed: ${error.message || 'Unknown error'}`);
          } finally {
            document.body.removeChild(fileInput);
          }
        };
        
        reader.onerror = () => {
          this.showNotification('Import failed: Could not read file');
          document.body.removeChild(fileInput);
        };
        
        reader.readAsText(file);
      });

      document.body.appendChild(fileInput);
      fileInput.click();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.stateManager.undo();
        this.refreshScene();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.stateManager.redo();
        this.refreshScene();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.stateManager.saveToLocalStorage();
        this.showNotification('Project saved');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = this.stateManager.getState();
        if (state.selectedBoardId) {
          e.preventDefault();
          this.boardEditor.deleteBoard(state.selectedBoardId);
        }
      }
    });
  }

  refreshScene() {
    this.jointVisualizer.clearAll();

    const state = this.stateManager.getState();
    state.boards.forEach(board => {
      if (board.mesh) {
        this.scene3D.removeMesh(board.mesh);
      }
      const mesh = board.createMesh(this.materialLibrary);
      this.scene3D.addMesh(mesh);
    });

    if (state.boards.size > 0) {
      this.jointVisualizer.visualizeAllBoards(Array.from(state.boards.values()));
    }
    
    // Update selection visuals after refreshing scene
    this.updateBoardSelectionVisuals(state);
  }

  updateBoardSelectionVisuals(state) {
    const { boards, selectedBoardId, showUnselectedTransparent } = state;
    
    boards.forEach((board, id) => {
      if (!board.mesh) return;
      
      const isSelected = id === selectedBoardId;
      
      // Clone material to avoid affecting cached materials
      const currentMaterial = board.mesh.material;
      let material = currentMaterial;
      
      // Check if we need to clone (if material is shared/cached)
      // We'll clone if the material doesn't have our custom property
      const needsClone = !currentMaterial._isClonedForSelection;
      
      if (needsClone) {
        material = currentMaterial.clone();
        // Three.js clone() should clone the texture map automatically,
        // but ensure the cloned texture is properly set up
        if (material.map) {
          // Ensure texture properties are preserved in the clone
          material.map.needsUpdate = true;
        }
        // Mark as cloned so we don't clone again
        material._isClonedForSelection = true;
        // Store reference to original material for potential restoration
        material._originalMaterial = currentMaterial;
        board.mesh.material = material;
      }
      
      // Apply selection state
      if (isSelected) {
        // Selected board: full opacity (always)
        material.opacity = 1.0;
        material.transparent = false;
      } else {
        // Unselected board: opacity based on toggle state
        if (showUnselectedTransparent) {
          // Fully opaque when toggle is ON
          material.opacity = 1.0;
          material.transparent = false;
        } else {
          // 70% opacity (default behavior)
          // CRITICAL: transparent must be true BEFORE setting opacity for it to work
          // This is especially important for materials with textures
          material.transparent = true;
          material.opacity = 0.7;
          // Ensure alphaTest doesn't interfere with transparency
          material.alphaTest = 0;
        }
      }
      
      // Force material to update (important for texture-based materials like cherry)
      material.needsUpdate = true;
    });
  }

  loadState() {
    const loaded = this.stateManager.loadFromLocalStorage('boxJointsState', Board, JointConfig);
    if (loaded) {
      this.refreshScene();
      this.showNotification('Project loaded');
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

new BoxJointsApp();
