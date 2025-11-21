import { Board } from '../models/Board.js';

export class BoardEditor {
  constructor(stateManager, scene3D, materialLibrary) {
    this.stateManager = stateManager;
    this.scene3D = scene3D;
    this.materialLibrary = materialLibrary;

    // Track previous state to detect what actually changed
    this.previousBoardIds = new Set();
    this.previousSelectedBoardId = null;
    this.previousDisplayNames = new Map();
    this.previousBoardProperties = new Map(); // Track board properties to detect changes

    this.stateManager.subscribe((state) => this.render());
    this.render();
  }

  createBoard(dimensions = { width: 100, height: 50, thickness: 20 }) {
    const state = this.stateManager.getState();
    
    // Calculate the next board ID based on existing boards
    let maxId = 0;
    state.boards.forEach((existingBoard, existingId) => {
      const match = existingId.match(/^board-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    });
    const id = `board-${maxId + 1}`;
    const board = new Board(id, dimensions);

    // Create a new Map with all existing boards
    const boards = new Map();
    state.boards.forEach((existingBoard, existingId) => {
      boards.set(existingId, existingBoard);
    });
    // Add the new board
    boards.set(id, board);

    const mesh = board.createMesh(this.materialLibrary);
    this.scene3D.addMesh(mesh);

    this.stateManager.setState({ boards, selectedBoardId: id });
  }

  updateBoard(id, updates) {
    const state = this.stateManager.getState();
    const board = state.boards.get(id);
    if (!board) return;

    const updatedBoard = board.clone();
    Object.assign(updatedBoard, updates);
    updatedBoard.mesh = board.mesh;

    // Check if woodType or grainDirection changed to update material
    const woodTypeChanged = 'woodType' in updates && updates.woodType !== board.woodType;
    // Normalize 'horizontal' to 'width' for backward compatibility
    const currentGrainDirection = board.grainDirection === 'horizontal' ? 'width' : board.grainDirection;
    const newGrainDirection = 'grainDirection' in updates ? updates.grainDirection : currentGrainDirection;
    const grainDirectionChanged = 'grainDirection' in updates && newGrainDirection !== currentGrainDirection;
    const materialNeedsUpdate = woodTypeChanged || grainDirectionChanged;
    
    // Normalize grainDirection if it's 'horizontal'
    if (updatedBoard.grainDirection === 'horizontal') {
      updatedBoard.grainDirection = 'width';
    }

    if (updatedBoard.mesh) {
      // Pass materialLibrary if woodType or grainDirection changed, otherwise just update geometry/transform
      updatedBoard.updateMesh(materialNeedsUpdate ? this.materialLibrary : null);
    } else {
      const mesh = updatedBoard.createMesh(this.materialLibrary);
      this.scene3D.addMesh(mesh);
    }

    const boards = new Map(state.boards);
    boards.set(id, updatedBoard);

    this.stateManager.setState({ boards });
  }

  deleteBoard(id) {
    const state = this.stateManager.getState();
    const board = state.boards.get(id);
    if (!board) return;

    if (board.mesh) {
      this.scene3D.removeMesh(board.mesh);
      board.mesh.geometry.dispose();
    }

    const boards = new Map(state.boards);
    boards.delete(id);

    const newState = { boards };
    if (state.selectedBoardId === id) {
      newState.selectedBoardId = null;
      newState.selectedSide = null;
    }

    this.stateManager.setState(newState);
  }

  selectBoard(id) {
    this.stateManager.setState({ selectedBoardId: id });
  }

  deselectAllBoards() {
    this.stateManager.setState({ selectedBoardId: null, selectedSide: null });
  }

  render() {
    const state = this.stateManager.getState();
    const container = document.getElementById('board-list');
    if (!container) return;

    // Get current board IDs as a sorted array for comparison
    const currentBoardIds = Array.from(state.boards.keys()).sort();
    const previousBoardIdsArray = Array.from(this.previousBoardIds).sort();

    // Check if board list structure changed (add/delete)
    const structureChanged = 
      currentBoardIds.length !== previousBoardIdsArray.length ||
      currentBoardIds.some((id, index) => id !== previousBoardIdsArray[index]);

    if (structureChanged) {
      // Full re-render needed for add/delete
      this.renderFull(container, state);
    } else {
      // Structure unchanged - update in place
      // Update selection if changed
      if (state.selectedBoardId !== this.previousSelectedBoardId) {
        this.updateSelection(container, this.previousSelectedBoardId, state.selectedBoardId);
      }

      // Update display names if changed
      state.boards.forEach((board, id) => {
        const currentDisplayName = board.displayName || board.id;
        const previousDisplayName = this.previousDisplayNames.get(id);
        if (currentDisplayName !== previousDisplayName) {
          this.updateDisplayName(container, id, currentDisplayName);
        }
      });

      // Update input field values if board properties changed
      state.boards.forEach((board, id) => {
        const previousProps = this.previousBoardProperties.get(id);
        if (previousProps) {
          this.updateBoardInputs(container, id, board, previousProps);
        }
      });
    }

    // Update tracked state
    this.previousBoardIds = new Set(currentBoardIds);
    this.previousSelectedBoardId = state.selectedBoardId;
    this.previousDisplayNames.clear();
    this.previousBoardProperties.clear();
    state.boards.forEach((board, id) => {
      this.previousDisplayNames.set(id, board.displayName || board.id);
      // Store a snapshot of board properties for comparison
      this.previousBoardProperties.set(id, {
        dimensions: { ...board.dimensions },
        position: { ...board.position },
        rotation: { ...board.rotation },
        woodType: board.woodType,
        grainDirection: board.grainDirection
      });
    });
  }

  renderFull(container, state) {
    // Clear existing children by removing them one by one
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Convert Map to array and sort by board ID for consistent ordering
    const boardsArray = Array.from(state.boards.entries());
    boardsArray.sort(([idA], [idB]) => idA.localeCompare(idB));
    
    // Use DocumentFragment to batch DOM updates
    const fragment = document.createDocumentFragment();
    
    boardsArray.forEach(([id, board]) => {
      // Ensure we have a valid board object
      if (!board || !board.id) {
        console.warn('Invalid board in render:', { id, board });
        return;
      }
      const boardEl = this.createBoardElement(board, board.id === state.selectedBoardId);
      fragment.appendChild(boardEl);
    });
    
    container.appendChild(fragment);
  }

  updateSelection(container, previousSelectedId, currentSelectedId) {
    // Remove selected class from previous selection
    if (previousSelectedId) {
      const previousElement = container.querySelector(`.board-item[data-id="${previousSelectedId}"]`);
      if (previousElement) {
        previousElement.classList.remove('selected');
      }
    }

    // Add selected class to current selection
    if (currentSelectedId) {
      const currentElement = container.querySelector(`.board-item[data-id="${currentSelectedId}"]`);
      if (currentElement) {
        currentElement.classList.add('selected');
      }
    }
  }

  updateDisplayName(container, boardId, displayName) {
    const boardItem = container.querySelector(`.board-item[data-id="${boardId}"]`);
    if (!boardItem) return;

    const boardIdElement = boardItem.querySelector('.board-id');
    if (boardIdElement) {
      // Only update if not in edit mode (no input field present)
      const nameContainer = boardItem.querySelector('.board-name-container');
      if (nameContainer && !nameContainer.querySelector('.board-name-input')) {
        boardIdElement.textContent = displayName;
      }
    }
  }

  updateBoardInputs(container, boardId, board, previousProps) {
    const boardItem = container.querySelector(`.board-item[data-id="${boardId}"]`);
    if (!boardItem) return;

    // Update dimension inputs
    if (board.dimensions.width !== previousProps.dimensions?.width) {
      const widthInput = boardItem.querySelector('.dim-input[data-prop="width"]');
      if (widthInput && document.activeElement !== widthInput) {
        widthInput.value = board.dimensions.width;
      }
    }
    if (board.dimensions.height !== previousProps.dimensions?.height) {
      const heightInput = boardItem.querySelector('.dim-input[data-prop="height"]');
      if (heightInput && document.activeElement !== heightInput) {
        heightInput.value = board.dimensions.height;
      }
    }
    if (board.dimensions.thickness !== previousProps.dimensions?.thickness) {
      const thicknessInput = boardItem.querySelector('.dim-input[data-prop="thickness"]');
      if (thicknessInput && document.activeElement !== thicknessInput) {
        thicknessInput.value = board.dimensions.thickness;
      }
    }

    // Update position inputs
    if (board.position.x !== previousProps.position?.x) {
      const xInput = boardItem.querySelector('.pos-input[data-axis="x"]');
      if (xInput && document.activeElement !== xInput) {
        xInput.value = board.position.x;
      }
    }
    if (board.position.y !== previousProps.position?.y) {
      const yInput = boardItem.querySelector('.pos-input[data-axis="y"]');
      if (yInput && document.activeElement !== yInput) {
        yInput.value = board.position.y;
      }
    }
    if (board.position.z !== previousProps.position?.z) {
      const zInput = boardItem.querySelector('.pos-input[data-axis="z"]');
      if (zInput && document.activeElement !== zInput) {
        zInput.value = board.position.z;
      }
    }

    // Update rotation inputs
    const rotX = Math.round(board.rotation.x * 180 / Math.PI);
    const rotY = Math.round(board.rotation.y * 180 / Math.PI);
    const rotZ = Math.round(board.rotation.z * 180 / Math.PI);
    const prevRotX = previousProps.rotation?.x ? Math.round(previousProps.rotation.x * 180 / Math.PI) : null;
    const prevRotY = previousProps.rotation?.y ? Math.round(previousProps.rotation.y * 180 / Math.PI) : null;
    const prevRotZ = previousProps.rotation?.z ? Math.round(previousProps.rotation.z * 180 / Math.PI) : null;

    if (rotX !== prevRotX) {
      const xRotInput = boardItem.querySelector('.rot-input[data-axis="x"]');
      if (xRotInput && document.activeElement !== xRotInput) {
        xRotInput.value = rotX;
      }
    }
    if (rotY !== prevRotY) {
      const yRotInput = boardItem.querySelector('.rot-input[data-axis="y"]');
      if (yRotInput && document.activeElement !== yRotInput) {
        yRotInput.value = rotY;
      }
    }
    if (rotZ !== prevRotZ) {
      const zRotInput = boardItem.querySelector('.rot-input[data-axis="z"]');
      if (zRotInput && document.activeElement !== zRotInput) {
        zRotInput.value = rotZ;
      }
    }

    // Update wood type select
    if (board.woodType !== previousProps.woodType) {
      const woodSelect = boardItem.querySelector('.wood-select');
      if (woodSelect && document.activeElement !== woodSelect) {
        woodSelect.value = board.woodType;
      }
    }

    // Update grain direction select
    if (board.grainDirection !== previousProps.grainDirection) {
      const grainSelect = boardItem.querySelector('.grain-select');
      if (grainSelect && document.activeElement !== grainSelect) {
        grainSelect.value = board.grainDirection === 'horizontal' ? 'width' : board.grainDirection;
      }
    }
  }

  createBoardElement(board, isSelected) {
    const div = document.createElement('div');
    div.className = `board-item ${isSelected ? 'selected' : ''}`;
    div.setAttribute('data-id', board.id);

    const displayName = board.displayName || board.id;
    div.innerHTML = `
      <div class="board-header">
        <div class="board-name-container">
          <span class="board-id">${displayName}</span>
          <button class="edit-name-btn" data-id="${board.id}" title="Edit name">✎</button>
        </div>
        <button class="delete-btn" data-id="${board.id}">×</button>
      </div>
      <div class="board-props">
        <label>
          W: <input type="number" class="dim-input" data-prop="width" data-id="${board.id}" value="${board.dimensions.width}" step="1" min="10">
        </label>
        <label>
          H: <input type="number" class="dim-input" data-prop="height" data-id="${board.id}" value="${board.dimensions.height}" step="1" min="10">
        </label>
        <label>
          T: <input type="number" class="dim-input" data-prop="thickness" data-id="${board.id}" value="${board.dimensions.thickness}" step="1" min="5">
        </label>
      </div>
      <div class="board-props">
        <label>
          Wood:
          <select class="wood-select" data-id="${board.id}">
            <option value="ash" ${board.woodType === 'ash' ? 'selected' : ''}>Ash</option>
            <option value="cherry" ${board.woodType === 'cherry' ? 'selected' : ''}>Cherry</option>
          </select>
        </label>
        <label>
          Grain:
          <select class="grain-select" data-id="${board.id}">
            <option value="width" ${(board.grainDirection === 'width' || board.grainDirection === 'horizontal') ? 'selected' : ''}>Width</option>
            <option value="height" ${board.grainDirection === 'height' ? 'selected' : ''}>Height</option>
          </select>
        </label>
      </div>
      <div class="board-transform">
        <div class="transform-group">
          <span>Position</span>
          <label>X: <input type="number" class="pos-input" data-axis="x" data-id="${board.id}" value="${board.position.x}" step="5"></label>
          <label>Y: <input type="number" class="pos-input" data-axis="y" data-id="${board.id}" value="${board.position.y}" step="5"></label>
          <label>Z: <input type="number" class="pos-input" data-axis="z" data-id="${board.id}" value="${board.position.z}" step="5"></label>
        </div>
        <div class="transform-group">
          <span>Rotation (°)</span>
          <label>X: <input type="number" class="rot-input" data-axis="x" data-id="${board.id}" value="${Math.round(board.rotation.x * 180 / Math.PI)}" step="15"></label>
          <label>Y: <input type="number" class="rot-input" data-axis="y" data-id="${board.id}" value="${Math.round(board.rotation.y * 180 / Math.PI)}" step="15"></label>
          <label>Z: <input type="number" class="rot-input" data-axis="z" data-id="${board.id}" value="${Math.round(board.rotation.z * 180 / Math.PI)}" step="15"></label>
        </div>
      </div>
    `;

    div.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteBoard(board.id);
    });

    // Edit name functionality
    const nameContainer = div.querySelector('.board-name-container');
    const editBtn = div.querySelector('.edit-name-btn');
    const boardId = board.id;
    
    const setupEditMode = () => {
      const currentBoard = this.stateManager.getState().boards.get(boardId);
      const currentName = currentBoard?.displayName || currentBoard?.id || boardId;
      nameContainer.innerHTML = `<input type="text" class="board-name-input" data-id="${boardId}" value="${currentName}">`;
      const nameInput = nameContainer.querySelector('.board-name-input');
      nameInput.focus();
      nameInput.select();
      
      const saveName = () => {
        const newName = nameInput.value.trim();
        const finalName = newName || boardId;
        this.updateBoard(boardId, { displayName: finalName });
      };
      
      const cancelEdit = () => {
        const currentBoard = this.stateManager.getState().boards.get(boardId);
        const displayName = currentBoard?.displayName || currentBoard?.id || boardId;
        nameContainer.innerHTML = `<span class="board-id">${displayName}</span><button class="edit-name-btn" data-id="${boardId}" title="Edit name">✎</button>`;
        const restoredEditBtn = nameContainer.querySelector('.edit-name-btn');
        restoredEditBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setupEditMode();
        });
        restoredEditBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      };
      
      nameInput.addEventListener('blur', saveName);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveName();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
      nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
      nameInput.addEventListener('click', (e) => e.stopPropagation());
    };
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setupEditMode();
    });
    editBtn.addEventListener('mousedown', (e) => e.stopPropagation());

    div.querySelectorAll('.dim-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const prop = e.target.dataset.prop;
        const value = parseFloat(e.target.value);
        // Get current board from state to avoid stale closure data
        const currentState = this.stateManager.getState();
        const currentBoard = currentState.boards.get(board.id);
        if (!currentBoard) return;
        this.updateBoard(board.id, {
          dimensions: { ...currentBoard.dimensions, [prop]: value }
        });
      });
    });

    const woodSelect = div.querySelector('.wood-select');
    woodSelect.addEventListener('change', (e) => {
      this.updateBoard(board.id, { woodType: e.target.value });
    });
    // Prevent parent div click handler from firing when interacting with select
    woodSelect.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    woodSelect.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Also prevent propagation on the label to prevent any click-through
    const woodLabel = woodSelect.closest('label');
    if (woodLabel) {
      woodLabel.addEventListener('mousedown', (e) => {
        if (e.target === woodSelect || woodSelect.contains(e.target)) {
          e.stopPropagation();
        }
      });
      woodLabel.addEventListener('click', (e) => {
        if (e.target === woodSelect || woodSelect.contains(e.target)) {
          e.stopPropagation();
        }
      });
    }

    const grainSelect = div.querySelector('.grain-select');
    grainSelect.addEventListener('change', (e) => {
      this.updateBoard(board.id, { grainDirection: e.target.value });
    });
    // Prevent parent div click handler from firing when interacting with select
    grainSelect.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    grainSelect.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Also prevent propagation on the label to prevent any click-through
    const grainLabel = grainSelect.closest('label');
    if (grainLabel) {
      grainLabel.addEventListener('mousedown', (e) => {
        if (e.target === grainSelect || grainSelect.contains(e.target)) {
          e.stopPropagation();
        }
      });
      grainLabel.addEventListener('click', (e) => {
        if (e.target === grainSelect || grainSelect.contains(e.target)) {
          e.stopPropagation();
        }
      });
    }

    div.querySelectorAll('.pos-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const axis = e.target.dataset.axis;
        const value = parseFloat(e.target.value);
        // Get current board from state to avoid stale closure data
        const currentState = this.stateManager.getState();
        const currentBoard = currentState.boards.get(board.id);
        if (!currentBoard) return;
        this.updateBoard(board.id, {
          position: { ...currentBoard.position, [axis]: value }
        });
      });
    });

    div.querySelectorAll('.rot-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const axis = e.target.dataset.axis;
        const value = parseFloat(e.target.value) * Math.PI / 180;
        // Get current board from state to avoid stale closure data
        const currentState = this.stateManager.getState();
        const currentBoard = currentState.boards.get(board.id);
        if (!currentBoard) return;
        this.updateBoard(board.id, {
          rotation: { ...currentBoard.rotation, [axis]: value }
        });
      });
    });

    div.addEventListener('click', () => {
      this.selectBoard(board.id);
    });

    return div;
  }
}
