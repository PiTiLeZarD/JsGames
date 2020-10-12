jsWarrior.turn = function(warrior) {
  var run = warrior.run || 0;
  var prev = warrior.previous_health || 0;
  var takingDamage = warrior.getHealth() - prev;
  var goback = warrior.goback || 0;
  var wrongway = warrior.wrongway || false;

  if (!run && (warrior.check('backward') != 'wall')) {
    goback = goback + 1;
  }

  if (warrior.check() == 'wall') {
    warrior.pivot();
    wrongway = false;
    goback = 0;
  } else if (takingDamage < 0) {
    if (warrior.check() == "diamond") {
      goback = goback + 1;
    }
    if (warrior.check() == "enemy") {
        warrior.attack();
    } else {
      if ((warrior.getHealth() < 6) && (warrior.check('backward') != 'wall')) {
        warrior.walk('backward');
      } else {
        warrior.walk();
      }
    }
  } else if (warrior.getHealth() < 20) {
    warrior.rest();
  } else if (warrior.check() == "diamond") {
    warrior.collect();
    if (warrior.wrongway) {
        goback = goback - 1;
    }
  } else if (warrior.check() == "enemy") {
    warrior.attack();
  } else if ((goback > 0) && !wrongway) {
    warrior.pivot();
    wrongway = !wrongway;
  } else {
    warrior.walk();
  }
  warrior.previous_health = warrior.getHealth();
  warrior.goback = goback;
  warrior.wrongway = wrongway;
  warrior.run = run + 1;
}