export class JointConfig {
  constructor(side) {
    this.side = side;
    this.mode = 'fixed';
    this.fingerWidth = 10;
    this.fingerCount = 5;
    this.centerKeyed = false;
    this.start = 0;
    this.geometry = [];
    this.grooveDepth = null;
  }

  clone() {
    const cloned = new JointConfig(this.side);
    cloned.mode = this.mode;
    cloned.fingerWidth = this.fingerWidth;
    cloned.fingerCount = this.fingerCount;
    cloned.centerKeyed = this.centerKeyed;
    cloned.start = this.start;
    cloned.geometry = [...this.geometry];
    cloned.grooveDepth = this.grooveDepth;
    return cloned;
  }
}
