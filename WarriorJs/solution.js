class Player {

  constructor() {
    this.previousHealth = 20;
    this.direction = null;
    this.shouldRest = false;
  }

  oppositeDirection() {
    return (this.direction == 'forward') ? 'backward' : 'forward';
  }

  isInDanger(warrior) {
    return warrior.health() < warrior.maxHealth() / 2;
  }

  startingDirection(warrior) {
    var forward = warrior.feel('forward');
    var backward = warrior.feel('backward');
    if (backward.isWall()) return 'forward';
    return 'backward';
  }

  playTurn(warrior) {
    if (this.direction == null) {
      this.direction = this.startingDirection(warrior);
    }
    var takingDamage = warrior.health() < this.previousHealth;
    this.previousHealth = warrior.health();

    var nextPos = warrior.feel(this.direction);

    if (takingDamage && this.isInDanger(warrior)) {
      this.shouldRest = true;
      return warrior.walk(this.oppositeDirection());
    }

    if (!nextPos.isEmpty()) {
      var unit = warrior.feel(this.direction).getUnit();

      if (unit) {
        if (unit.isEnemy()) {
          return warrior.attack(this.direction);
        }
        if (unit.isBound()) {
          return warrior.rescue(this.direction);
        }
      }
    } 

    if (nextPos.isStairs()) {
      return warrior.walk(this.direction);
    }

    if (nextPos.isWall()) {
      this.direction = this.oppositeDirection();
      return warrior.walk(this.direction);
    }

    if (this.shouldRest) {
      this.shouldRest = warrior.health() != warrior.maxHealth();
      return warrior.rest();
    }

    return warrior.walk(this.direction);
  }
}
