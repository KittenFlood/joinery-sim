export class BoxJointGenerator {
  /**
   * Generates fixed joint segments that fill the entire board dimension.
   * IMPORTANT: In fixed mode, fingers and grooves MUST be the same width.
   * The width is calculated to perfectly fill the board: width = boardDimension / totalSegments
   * @param {Object} config - Joint configuration with fingerWidth, fingerCount, centerKeyed
   * @param {number} boardDimension - Board dimension to fill
   * @returns {Object} Result with valid flag and segments array
   */
  static generateFixedJoints(config, boardDimension) {
    const { fingerWidth, fingerCount, centerKeyed } = config;

    // fingerCount is the number of FINGERS only
    // Pattern alternates: finger, groove, finger, groove... etc
    // So total segments = fingerCount + (fingerCount - 1) = fingerCount * 2 - 1
    const totalSegments = fingerCount * 2 - 1;
    
    // Calculate optimal width to fill entire board dimension
    // CRITICAL: Both fingers and grooves use the same width to ensure proper fit
    // This prevents rendering issues where first/last segments appear double-width
    const optimalWidth = boardDimension / totalSegments;

    const segments = [];

    if (centerKeyed) {
      // Center the pattern within the board
      // Since we're using optimal width, pattern fills exactly, so offset is 0
      for (let i = 0; i < totalSegments; i++) {
        const start = i * optimalWidth;
        const type = i % 2 === 0 ? 'finger' : 'groove';
        // Both fingers and grooves use the same width
        segments.push({ start, width: optimalWidth, type });
      }
    } else {
      // Start from edge, no centering
      for (let i = 0; i < totalSegments; i++) {
        const start = i * optimalWidth;
        const type = i % 2 === 0 ? 'finger' : 'groove';
        // Both fingers and grooves use the same width
        segments.push({ start, width: optimalWidth, type });
      }
    }

    return { valid: true, segments };
  }

  static generateVariableJoints(config, boardDimension) {
    const { start, geometry } = config;

    const totalWidth = geometry.reduce((sum, w) => sum + w, 0);

    if (Math.abs(totalWidth - boardDimension) > 0.001) {
      return { valid: false, error: `Geometry sum (${totalWidth}) must equal dimension (${boardDimension})` };
    }

    const segments = [];
    let currentPos = 0;

    geometry.forEach((width, index) => {
      const type = (index + start) % 2 === 0 ? 'finger' : 'groove';
      segments.push({ start: currentPos, width, type });
      currentPos += width;
    });

    return { valid: true, segments };
  }

  static distributeEvenly(boardDimension, count, startWithFinger = true) {
    if (count < 1) return [];

    const width = boardDimension / count;
    return new Array(count).fill(width);
  }

  static mirrorPattern(pattern) {
    return [...pattern, ...pattern.slice().reverse()];
  }
}
