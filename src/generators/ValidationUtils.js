export class ValidationUtils {
  /**
   * Calculates the optimal finger width that fills the entire board dimension.
   * Both fingers and grooves use this same width.
   * @param {number} fingerCount - Number of fingers
   * @param {number} boardDimension - Board dimension to fill
   * @returns {number} Optimal width for fingers and grooves
   */
  static calculateOptimalFingerWidth(fingerCount, boardDimension) {
    if (fingerCount < 1 || boardDimension <= 0) {
      return 0;
    }
    // Total segments = fingerCount + (fingerCount - 1) = fingerCount * 2 - 1
    const totalSegments = fingerCount * 2 - 1;
    const calculatedWidth = boardDimension / totalSegments;
    // Round to nearest 0.5mm step to match input field step value
    return Math.round(calculatedWidth * 2) / 2;
  }

  static validateFixedJoint(config, boardDimension) {
    const { fingerWidth, fingerCount, centerKeyed } = config;

    if (fingerWidth <= 0) {
      return { valid: false, error: 'Finger width must be positive' };
    }

    if (fingerCount < 1) {
      return { valid: false, error: 'Finger count must be at least 1' };
    }

    // Calculate optimal width that fills the entire board dimension
    // Both fingers and grooves use the same width
    const optimalWidth = this.calculateOptimalFingerWidth(fingerCount, boardDimension);
    
    // Check if current width matches optimal width (within 0.01mm tolerance)
    const tolerance = 0.01;
    const widthDifference = Math.abs(fingerWidth - optimalWidth);
    
    if (widthDifference > tolerance) {
      return { 
        valid: false, 
        error: `Finger width (${fingerWidth.toFixed(2)}) doesn't match board dimension. Optimal width: ${optimalWidth.toFixed(2)}`,
        suggestedWidth: optimalWidth
      };
    }

    return { valid: true };
  }

  static validateVariableJoint(geometry, boardDimension) {
    if (!Array.isArray(geometry) || geometry.length === 0) {
      return { valid: false, error: 'Geometry array cannot be empty' };
    }

    if (geometry.some(w => w <= 0)) {
      return { valid: false, error: 'All widths must be positive' };
    }

    const totalWidth = geometry.reduce((sum, w) => sum + w, 0);

    if (Math.abs(totalWidth - boardDimension) > 0.001) {
      return { valid: false, error: `Sum (${totalWidth.toFixed(2)}) must equal dimension (${boardDimension})` };
    }

    return { valid: true };
  }

  static parseGeometryArray(input) {
    const values = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseFloat(s));

    if (values.some(v => isNaN(v))) {
      return { valid: false, error: 'Invalid number in geometry array' };
    }

    return { valid: true, values };
  }
}
