{
    initElevator: function(elevator, id) {
        var self = this;

        elevator.id = id;
        elevator.status = 'stopped';
        elevator.mode = 'speed'; /* speed or move */

        elevator.debug = function(msg) {
            console.log('|e:'+elevator.id+'|', elevator.status, elevator.loadFactor(), elevator.destinationQueue, elevator.getPressedFloors(), msg);
        };

        elevator.distanceTo = function (floorNum) {
            return Math.abs(elevator.currentFloor() - floorNum);
        };

        elevator.directionTo = function (floorNum) {
            if (elevator.currentFloor() == floorNum) return 'current';
            return floorNum > elevator.currentFloor() ? 'up' : 'down';
        };

        elevator.goesTo = function (floorNum) {
            return (-1 !== elevator.destinationQueue.indexOf(floorNum)) || (-1 !== elevator.getPressedFloors().indexOf(floorNum));
        };

        elevator.getScore = function(floor, direction) {
            var load = 1.0 - elevator.loadFactor();
            var distance = self.floors.length - elevator.distanceTo(floor.floorNum());
            var score = distance * load;

            /* add a check to see if we can take everyone on that floor */

            if ((elevator.status != 'stopped') && (elevator.status != direction)) {
                score = score * -1.0;
            }

            /*
            if (elevator.goesTo(floor.floorNum())) {
                score = Math.abs(score) * 2.0;
            }
            */

            return score;
        };

        elevator.updateIndicators = function() {
            var up = elevator.mode == 'speed';
            var down = up;
            if (elevator.status == 'stopped') {
                up = true;
                down = true;
            }
            if (elevator.status == 'up') {
                up = true;
            }
            if (elevator.status == 'down') {
                down = true;
            }
            elevator.goingUpIndicator(up);
            elevator.goingDownIndicator(down);
        };

        elevator.requestStopAt = function(floorNum) {
            if (elevator.status != 'stopped' && (elevator.directionTo(floorNum) != elevator.status)) {
                elevator.debug('Ignoring request for ' + floorNum);
                return;
            }

            if ((elevator.status == 'stopped') && (elevator.directionTo(floorNum) != 'current')) {
                elevator.status = elevator.directionTo(floorNum);
            }

            if (-1 === elevator.destinationQueue.indexOf(floorNum)) {
                elevator.goToFloor(floorNum);
            }

            elevator.updateIndicators();
        };

        elevator.updateQueue = function () {
            elevator.destinationQueue.sort(function (a, b) {return a - b});
            if (elevator.status == 'down') {
                elevator.destinationQueue.reverse();
            }
            elevator.debug("update destinationQueue ["+elevator.destinationQueue.join(',')+"]");
            elevator.checkDestinationQueue();
        };

        elevator.fetch = function() {
            if (elevator.destinationQueue.length == 0) {
                if (elevator.getPressedFloors().length > 0) {
                    elevator.destinationQueue = elevator.getPressedFloors();
                    elevator.status = elevator.directionTo(elevator.destinationQueue[0]);
                    elevator.updateQueue();
                } else {
                    elevator.status = 'stopped';
                }
                elevator.updateIndicators();
            }

            if (elevator.status == 'stopped') {
                var floor = self.floors.filter(function (floor) {
                    if (elevator.mode == 'speed') {
                        return floor.isSomoneWaiting();
                    }
                    return floor.isSomoneWaiting() && !floor.isAnElevatorStoppingThere();
                }).reduce(function (s, floor) {
                    if (s === null) return floor;
                    return elevator.distanceTo(floor.floorNum()) < elevator.distanceTo(s.floorNum()) ? floor : s;
                }, null);

                if (floor !== null) {
                    elevator.requestStopAt(floor.floorNum());
                } else if (elevator.mode !== 'speed') {
                    /* elevator.requestStopAt(Math.ceil(self.floors.length / self.elevators.length) * elevator.id); */
                    elevator.requestStopAt(0);
                }
            }
        };

        elevator.on("passing_floor", function(floorNum, direction) {
            var floor = self.getFloor(floorNum);
            elevator.debug('passing_floor: ' + floorNum + ' going ' + direction + ' with ' + floor.status[direction] + ' people waiting');

            if (elevator.goesTo(floorNum)) {
                elevator.debug('--> going there, overriding!');
                return elevator.goToFloor(floorNum, true);
            }

            if ((floor.status[direction] > 0) && (elevator.loadFactor() <= 0.8)) {
                if ((elevator.mode !== 'speed') && floor.isAnElevatorStoppingThere()) return;
                elevator.debug('--> someone waiting, not attended and we have space, overriding');
                return elevator.goToFloor(floorNum, true);
            }

        });

        elevator.on("stopped_at_floor", function(floorNum) {
            elevator.debug('stopped_at_floor: ' + floorNum);
            self.getFloor(floorNum).reset(elevator.mode === 'speed' ? 'both' : elevator.status);

            var newQueue = elevator.destinationQueue.filter(function (f, i, arr) {
                return self.getFloor(f).isSomoneWaiting() && (f !== floorNum) && (arr.indexOf(f) === i);
            });
            if (newQueue.length !== elevator.destinationQueue.length) {
                elevator.destinationQueue = newQueue;
                elevator.updateQueue();
            }

            elevator.fetch();
        });

        elevator.on("idle", function() {
            elevator.debug('idle');
            elevator.fetch();
        });

        elevator.on("floor_button_pressed", function(floorNum) {
            elevator.debug('floor_button_pressed: ' + floorNum);
            elevator.requestStopAt(floorNum);
        });
    },

    initFloor: function(floor) {
        var self = this;

        floor.status = {'up': 0, 'down': 0};

        floor.debug = function(msg) {
            console.log('|f:'+floor.floorNum()+'|', floor.status, msg);
        };

        floor.reset = function(direction) {
            if (direction === 'both') {
                floor.status['up'] = 0;
                floor.status['down'] = 0;
            } else {
                floor.status[direction] = 0;
            }
        };

        floor.isSomoneWaiting = function() {
            return floor.status['up'] + floor.status['down'] > 0;
        };

        floor.isAnElevatorStoppingThere = function() {
            return self.elevators.reduce(function(acc, elevator) {
                return acc || elevator.goesTo(floor.floorNum());
            }, false);
        };

        floor.on("up_button_pressed", function () {
            floor.status['up'] = floor.status['up'] + 1;
            self.requestElevator(floor, 'up');
        });

        floor.on("down_button_pressed", function () {
            floor.status['down'] = floor.status['down'] + 1;
            self.requestElevator(floor, 'down');
        });
    },

    init: function(elevators, floors) {
        console.clear();
        var self = this;

        self.elevators = elevators;
        self.floors = floors;

        for (var f = 0; f < floors.length; f++) {
            (function () {
                self.initFloor(floors[f]);
            }());
        }

        for (var e = 0; e < elevators.length; e++) {
            (function () {
                self.initElevator(elevators[e], e);
            }());
        }
    },

    getFloor: function(floorNum) {
        var self = this;

        return self.floors.reduce(function(s, floor) {
            return floor.floorNum() == floorNum ? floor : s;
        }, null);
    },

    requestElevator: function(floor, direction) {
        var self = this;

        var selected = self.elevators.reduce(function(result, elevator) {
            if (result === null) return elevator;
            return elevator.getScore(floor, direction) > result.getScore(floor, direction) ? elevator : result;
        }, null);

        floor.debug('('+direction+'): '+self.elevators.map(function (e) {
            return '|e:'+e.id+'|('+e.getScore(floor, direction)+')';
        }).join(', ')+' -> selected: ' + selected.id);
        selected.requestStopAt(floor.floorNum());
    },

    update: function(dt, elevators, floors) {}
}