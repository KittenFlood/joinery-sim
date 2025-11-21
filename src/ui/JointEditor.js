import { JointConfig } from '../models/JointConfig.js';
import { BoxJointGenerator } from '../generators/BoxJointGenerator.js';
import { ValidationUtils } from '../generators/ValidationUtils.js';

export class JointEditor {
  constructor(stateManager, boardEditor) {
    this.stateManager = stateManager;
    this.boardEditor = boardEditor;
    this.adaptingJoint = null; // Track joint being adapted to prevent loops

    this.stateManager.subscribe(() => this.render());
    this.render();
  }

  getSelectedBoard() {
    const state = this.stateManager.getState();
    if (!state.selectedBoardId) return null;
    return state.boards.get(state.selectedBoardId);
  }

  updateJoint(side, updates) {
    const board = this.getSelectedBoard();
    if (!board) return;

    let joint = board.joints.get(side);
    if (!joint) {
      joint = new JointConfig(side);
      joint.grooveDepth = board.dimensions.thickness;
    }
    const updatedJoint = joint.clone();
    Object.assign(updatedJoint, updates);

    const newJoints = new Map(board.joints);
    newJoints.set(side, updatedJoint);

    this.boardEditor.updateBoard(board.id, { joints: newJoints });
  }

  selectSide(side) {
    this.stateManager.setState({ selectedSide: side });
  }

  render() {
    const container = document.getElementById('joint-editor');
    if (!container) return;

    const board = this.getSelectedBoard();
    const state = this.stateManager.getState();

    if (!board) {
      container.innerHTML = '<div class="placeholder">Select a board to edit joints</div>';
      return;
    }

    container.innerHTML = `
      <div class="joint-editor-content">
        <div class="side-selector">
          <button class="side-btn ${state.selectedSide === 'top' ? 'active' : ''}" data-side="top">Top</button>
          <button class="side-btn ${state.selectedSide === 'bottom' ? 'active' : ''}" data-side="bottom">Bottom</button>
          <button class="side-btn ${state.selectedSide === 'left' ? 'active' : ''}" data-side="left">Left</button>
          <button class="side-btn ${state.selectedSide === 'right' ? 'active' : ''}" data-side="right">Right</button>
        </div>

        ${state.selectedSide ? this.renderJointConfig(board, state.selectedSide) : '<div class="placeholder">Select a side</div>'}
      </div>
    `;

    container.querySelectorAll('.side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectSide(btn.dataset.side);
      });
    });

    this.attachJointConfigListeners(board, state.selectedSide);
  }

  renderJointConfig(board, side) {
    let joint = board.joints.get(side);
    if (!joint) {
      joint = new JointConfig(side);
      joint.grooveDepth = board.dimensions.thickness;
    }
    const dimension = this.getSideDimension(board, side);

    let validationHtml = '';
    let result;

    if (joint.mode === 'fixed') {
      const validation = ValidationUtils.validateFixedJoint(joint, dimension);
      
      // Auto-adapt if validation fails and suggested width is available
      // Use deferred adaptation to avoid render loops
      if (!validation.valid && validation.suggestedWidth !== undefined) {
        const optimalWidth = validation.suggestedWidth;
        const jointKey = `${board.id}-${side}`;
        
        // Only adapt if the difference is significant and we're not already adapting this joint
        if (Math.abs(joint.fingerWidth - optimalWidth) > 0.01 && this.adaptingJoint !== jointKey) {
          // Defer adaptation to next tick to avoid render loop
          setTimeout(() => {
            this.adaptingJoint = jointKey;
            this.updateJoint(side, { fingerWidth: optimalWidth });
            // Clear adapting flag after a short delay
            setTimeout(() => {
              if (this.adaptingJoint === jointKey) {
                this.adaptingJoint = null;
              }
            }, 100);
          }, 0);
          
          // Show warning message
          validationHtml = `<div class="warning-msg">Adjusting finger width to ${optimalWidth.toFixed(2)}mm to fit board dimension...</div>`;
          result = BoxJointGenerator.generateFixedJoints(
            { ...joint, fingerWidth: optimalWidth }, 
            dimension
          );
        } else {
          validationHtml = `<div class="error-msg">${validation.error}</div>`;
          result = BoxJointGenerator.generateFixedJoints(joint, dimension);
        }
      } else {
        result = BoxJointGenerator.generateFixedJoints(joint, dimension);

        if (!validation.valid) {
          validationHtml = `<div class="error-msg">${validation.error}</div>`;
        } else if (result.valid) {
          validationHtml = `<div class="info-msg">${result.segments.length} segments, ${result.segments.filter(s => s.type === 'finger').length} fingers</div>`;
        }
      }
    } else {
      const validation = ValidationUtils.validateVariableJoint(joint.geometry, dimension);
      result = BoxJointGenerator.generateVariableJoints(joint, dimension);

      if (!validation.valid) {
        validationHtml = `<div class="error-msg">${validation.error}</div>`;
      } else if (result.valid) {
        validationHtml = `<div class="info-msg">${result.segments.length} segments, sum: ${joint.geometry.reduce((s, w) => s + w, 0).toFixed(2)}</div>`;
      }
    }

    // Check grooveDepth against board thickness
    const boardThickness = board.dimensions.thickness;
    const currentGrooveDepth = joint.grooveDepth ?? boardThickness;
    if (currentGrooveDepth > boardThickness) {
      // Auto-adjust grooveDepth to board thickness
      const jointKey = `${board.id}-${side}-grooveDepth`;
      if (this.adaptingJoint !== jointKey) {
        setTimeout(() => {
          this.adaptingJoint = jointKey;
          this.updateJoint(side, { grooveDepth: boardThickness });
          setTimeout(() => {
            if (this.adaptingJoint === jointKey) {
              this.adaptingJoint = null;
            }
          }, 100);
        }, 0);
        validationHtml = `<div class="warning-msg">Adjusting groove depth to ${boardThickness.toFixed(2)}mm (board thickness)...</div>`;
      }
    }

    return `
      <div class="joint-config">
        <div class="joint-header">
          <span class="side-label">${side.toUpperCase()}</span>
          <span class="dimension-label">${dimension}mm</span>
        </div>

        <div class="mode-selector">
          <label>
            <input type="radio" name="mode" value="fixed" ${joint.mode === 'fixed' ? 'checked' : ''}> Fixed
          </label>
          <label>
            <input type="radio" name="mode" value="variable" ${joint.mode === 'variable' ? 'checked' : ''}> Variable
          </label>
        </div>

        ${joint.mode === 'fixed' ? this.renderFixedMode(joint, board.dimensions.thickness) : this.renderVariableMode(joint, dimension, board.dimensions.thickness)}

        ${validationHtml}
      </div>
    `;
  }

  renderFixedMode(joint, boardThickness) {
    const grooveDepth = joint.grooveDepth ?? boardThickness;
    return `
      <div class="fixed-config">
        <label>
          Finger width:
          <input type="number" class="finger-width-input" value="${joint.fingerWidth}" step="0.5" min="1">
        </label>
        <label>
          Finger count:
          <input type="number" class="finger-count-input" value="${joint.fingerCount}" step="1" min="1">
        </label>
        <label>
          <input type="checkbox" class="center-keyed-input" ${joint.centerKeyed ? 'checked' : ''}> Center-keyed
        </label>
        <label>
          Groove depth:
          <input type="number" class="groove-depth-input" value="${grooveDepth}" step="0.5" min="0.1" max="${boardThickness}">
        </label>
      </div>
    `;
  }

  renderVariableMode(joint, dimension, boardThickness) {
    const geometryStr = joint.geometry.join(', ');
    const grooveDepth = joint.grooveDepth ?? boardThickness;

    return `
      <div class="variable-config">
        <label>
          Start with:
          <select class="start-select">
            <option value="0" ${joint.start === 0 ? 'selected' : ''}>Finger</option>
            <option value="1" ${joint.start === 1 ? 'selected' : ''}>Groove</option>
          </select>
        </label>
        <label>
          Geometry (comma-separated):
          <textarea class="geometry-input" rows="3" placeholder="10, 15, 10, 15...">${geometryStr}</textarea>
        </label>
        <label>
          Groove depth:
          <input type="number" class="groove-depth-input" value="${grooveDepth}" step="0.5" min="0.1" max="${boardThickness}">
        </label>
        <div class="helper-buttons">
          <button class="helper-btn" data-action="distribute">Distribute evenly</button>
          <button class="helper-btn" data-action="mirror">Mirror pattern</button>
        </div>
      </div>
    `;
  }

  getSideDimension(board, side) {
    switch (side) {
      case 'top':
      case 'bottom':
        return board.dimensions.width;
      case 'left':
      case 'right':
        return board.dimensions.height;
      default:
        return 0;
    }
  }

  attachJointConfigListeners(board, side) {
    if (!side) return;

    const container = document.getElementById('joint-editor');
    const joint = board.joints.get(side) || new JointConfig(side);

    container.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateJoint(side, { mode: e.target.value });
      });
    });

    const fingerWidthInput = container.querySelector('.finger-width-input');
    if (fingerWidthInput) {
      fingerWidthInput.addEventListener('change', (e) => {
        const newWidth = parseFloat(e.target.value);
        this.updateJoint(side, { fingerWidth: newWidth });
        // Auto-adapt after update
        this.autoAdaptFixedJoint(board, side);
      });
    }

    const fingerCountInput = container.querySelector('.finger-count-input');
    if (fingerCountInput) {
      fingerCountInput.addEventListener('change', (e) => {
        const newCount = parseInt(e.target.value);
        this.updateJoint(side, { fingerCount: newCount });
        // Auto-adapt after update
        this.autoAdaptFixedJoint(board, side);
      });
    }

    const centerKeyedInput = container.querySelector('.center-keyed-input');
    if (centerKeyedInput) {
      centerKeyedInput.addEventListener('change', (e) => {
        this.updateJoint(side, { centerKeyed: e.target.checked });
      });
    }

    const grooveDepthInput = container.querySelector('.groove-depth-input');
    if (grooveDepthInput) {
      grooveDepthInput.addEventListener('change', (e) => {
        const board = this.getSelectedBoard();
        if (!board) return;
        
        const newDepth = parseFloat(e.target.value);
        const boardThickness = board.dimensions.thickness;
        
        // Clamp to board thickness if exceeded
        if (newDepth > boardThickness) {
          this.updateJoint(side, { grooveDepth: boardThickness });
        } else if (newDepth > 0) {
          this.updateJoint(side, { grooveDepth: newDepth });
        }
      });
    }

    const startSelect = container.querySelector('.start-select');
    if (startSelect) {
      startSelect.addEventListener('change', (e) => {
        this.updateJoint(side, { start: parseInt(e.target.value) });
      });
    }

    const geometryInput = container.querySelector('.geometry-input');
    if (geometryInput) {
      geometryInput.addEventListener('change', (e) => {
        const parsed = ValidationUtils.parseGeometryArray(e.target.value);
        if (parsed.valid) {
          this.updateJoint(side, { geometry: parsed.values });
        }
      });
    }

    container.querySelectorAll('.helper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const dimension = this.getSideDimension(board, side);

        if (action === 'distribute') {
          const count = prompt('Enter number of segments:', '5');
          if (count) {
            const geometry = BoxJointGenerator.distributeEvenly(dimension, parseInt(count));
            this.updateJoint(side, { geometry });
          }
        } else if (action === 'mirror') {
          if (joint.geometry.length > 0) {
            const half = joint.geometry.slice(0, Math.ceil(joint.geometry.length / 2));
            const geometry = BoxJointGenerator.mirrorPattern(half);
            this.updateJoint(side, { geometry });
          }
        }
      });
    });
  }

  /**
   * Auto-adapts fixed joint finger width to match board dimension.
   * Shows warning if adjustment is made.
   */
  autoAdaptFixedJoint(board, side) {
    const joint = board.joints.get(side);
    if (!joint || joint.mode !== 'fixed') return;

    const dimension = this.getSideDimension(board, side);
    const validation = ValidationUtils.validateFixedJoint(joint, dimension);

    if (!validation.valid && validation.suggestedWidth !== undefined) {
      const optimalWidth = validation.suggestedWidth;
      if (Math.abs(joint.fingerWidth - optimalWidth) > 0.01) {
        this.updateJoint(side, { fingerWidth: optimalWidth });
      }
    }
  }
}
