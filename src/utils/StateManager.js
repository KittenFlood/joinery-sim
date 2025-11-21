export class StateManager {
  constructor() {
    this.state = {
      boards: new Map(),
      selectedBoardId: null,
      selectedSide: null,
      showUnselectedTransparent: false
    };
    this.history = [this.cloneState()];
    this.historyIndex = 0;
    this.listeners = [];
  }

  cloneState() {
    return {
      boards: new Map(this.state.boards),
      selectedBoardId: this.state.selectedBoardId,
      selectedSide: this.state.selectedSide,
      showUnselectedTransparent: this.state.showUnselectedTransparent
    };
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(this.cloneState());
    this.historyIndex = this.history.length - 1;

    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }

    this.notifyListeners();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = this.cloneState();
      this.state = this.history[this.historyIndex];
      this.notifyListeners();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = this.history[this.historyIndex];
      this.notifyListeners();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  saveToLocalStorage(key = 'boxJointsState') {
    const serialized = {
      boards: Array.from(this.state.boards.entries()).map(([id, board]) => [
        id,
        {
          id: board.id,
          dimensions: board.dimensions,
          position: board.position,
          rotation: board.rotation,
          grainDirection: board.grainDirection,
          woodType: board.woodType,
          displayName: board.displayName,
          joints: Array.from(board.joints.entries())
        }
      ]),
      selectedBoardId: this.state.selectedBoardId,
      selectedSide: this.state.selectedSide,
      showUnselectedTransparent: this.state.showUnselectedTransparent
    };
    localStorage.setItem(key, JSON.stringify(serialized));
  }

  exportToJSON() {
    const serialized = {
      boards: Array.from(this.state.boards.entries()).map(([id, board]) => [
        id,
        {
          id: board.id,
          dimensions: board.dimensions,
          position: board.position,
          rotation: board.rotation,
          grainDirection: board.grainDirection,
          woodType: board.woodType,
          displayName: board.displayName,
          joints: Array.from(board.joints.entries())
        }
      ]),
      selectedBoardId: this.state.selectedBoardId,
      selectedSide: this.state.selectedSide,
      showUnselectedTransparent: this.state.showUnselectedTransparent
    };
    return JSON.stringify(serialized, null, 2);
  }

  loadFromLocalStorage(key = 'boxJointsState', BoardClass, JointConfigClass) {
    const data = localStorage.getItem(key);
    if (!data) return false;

    try {
      const parsed = JSON.parse(data);
      const boards = new Map(
        parsed.boards.map(([id, boardData]) => {
          const board = new BoardClass(
            boardData.id,
            boardData.dimensions,
            boardData.position,
            boardData.rotation
          );
          board.grainDirection = boardData.grainDirection;
          board.woodType = boardData.woodType;
          board.displayName = boardData.displayName || boardData.id;
          board.joints = new Map(
            boardData.joints.map(([side, jointData]) => {
              const joint = new JointConfigClass(side);
              Object.assign(joint, jointData);
              return [side, joint];
            })
          );
          return [id, board];
        })
      );

      this.state = {
        boards,
        selectedBoardId: parsed.selectedBoardId,
        selectedSide: parsed.selectedSide,
        showUnselectedTransparent: parsed.showUnselectedTransparent ?? false
      };

      this.history = [this.cloneState()];
      this.historyIndex = 0;
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error('Failed to load state:', e);
      return false;
    }
  }

  importFromJSON(jsonString, BoardClass, JointConfigClass) {
    if (!jsonString) {
      return { success: false, error: 'No data provided' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      if (!parsed.boards || !Array.isArray(parsed.boards)) {
        return { success: false, error: 'Invalid project format: missing boards array' };
      }

      const boards = new Map(
        parsed.boards.map(([id, boardData]) => {
          const board = new BoardClass(
            boardData.id,
            boardData.dimensions,
            boardData.position,
            boardData.rotation
          );
          board.grainDirection = boardData.grainDirection;
          board.woodType = boardData.woodType;
          board.displayName = boardData.displayName || boardData.id;
          board.joints = new Map(
            boardData.joints.map(([side, jointData]) => {
              const joint = new JointConfigClass(side);
              Object.assign(joint, jointData);
              return [side, joint];
            })
          );
          return [id, board];
        })
      );

      this.state = {
        boards,
        selectedBoardId: parsed.selectedBoardId || null,
        selectedSide: parsed.selectedSide || null,
        showUnselectedTransparent: parsed.showUnselectedTransparent ?? false
      };

      this.history = [this.cloneState()];
      this.historyIndex = 0;
      this.notifyListeners();
      return { success: true };
    } catch (e) {
      console.error('Failed to import project:', e);
      return { success: false, error: e.message || 'Failed to parse JSON file' };
    }
  }
}
