{
    initElevator: function (elevator, id) {
        const self = this;

        elevator.id = id;
        elevator.status = "stopped";
        elevator.mode = "speed"; /* speed or move */

        elevator.debug = (msg) => {
            console.log(
                `|e:${elevator.id}|${elevator.status}|${elevator.currentFloor()}|`,
                `${Math.round(elevator.loadFactor() * 100)}%`,
                "q",
                elevator.destinationQueue,
                "dest",
                elevator.getPressedFloors(),
                msg
            );
        };

        elevator.distanceTo = (floorNum) => {
            return Math.abs(elevator.currentFloor() - floorNum);
        };

        elevator.directionTo = (floorNum) => {
            if (elevator.currentFloor() == floorNum) return "current";
            return floorNum > elevator.currentFloor() ? "up" : "down";
        };

        elevator.goesTo = (floorNum) => {
            return elevator.destinationQueue.includes(floorNum) || elevator.getPressedFloors().includes(floorNum);
        };

        elevator.getScore = (floor, direction) => {
            const load = 1.0 - elevator.loadFactor();
            const distance = self.floors.length - elevator.distanceTo(floor.floorNum());
            let score = distance * load;

            /* add a check to see if we can take everyone on that floor */

            const floorDirection = floor.floorNum() > elevator.currentFloor() ? "up" : "down";

            if (elevator.status != "stopped" && elevator.status != floorDirection) {
                score = (1 / score) * -1.0;
            }

            /*
            if (elevator.goesTo(floor.floorNum())) {
                score = Math.abs(score) * 2.0;
            }
            */

            return score;
        };

        elevator.updateIndicators = () => {
            let up = elevator.mode == "speed";
            let down = up;
            if (elevator.status == "stopped") {
                up = true;
                down = true;
            }
            if (elevator.status == "up") {
                up = true;
            }
            if (elevator.status == "down") {
                down = true;
            }
            elevator.goingUpIndicator(up);
            elevator.goingDownIndicator(down);
        };

        elevator.requestStopAt = (floorNum) => {
            if (elevator.status != "stopped" && elevator.directionTo(floorNum) != elevator.status) {
                elevator.debug("Ignoring request for " + floorNum);
                return;
            }

            if (elevator.status == "stopped" && elevator.directionTo(floorNum) != "current") {
                elevator.status = elevator.directionTo(floorNum);
            }

            if (!elevator.destinationQueue.includes(floorNum)) {
                elevator.goToFloor(floorNum);
            }

            elevator.updateIndicators();
        };

        elevator.updateQueue = () => {
            elevator.destinationQueue.sort((a, b) => a - b);
            if (elevator.status == "down") {
                elevator.destinationQueue.reverse();
            }
            elevator.debug("update destinationQueue [" + elevator.destinationQueue.join(",") + "]");
            elevator.checkDestinationQueue();
        };

        elevator.fetch = () => {
            if (elevator.destinationQueue.length == 0) {
                if (elevator.getPressedFloors().length > 0) {
                    elevator.destinationQueue = elevator.getPressedFloors();
                    elevator.status = elevator.directionTo(elevator.destinationQueue[0]);
                    elevator.updateQueue();
                } else {
                    elevator.status = "stopped";
                }
                elevator.updateIndicators();
            }

            if (elevator.status == "stopped") {
                const floor = self.floors
                    .filter((floor) => {
                        if (elevator.mode == "speed") {
                            return floor.isSomoneWaiting();
                        }
                        return floor.isSomoneWaiting() && !floor.isAnElevatorStoppingThere();
                    })
                    .reduce((acc, floor) => {
                        if (acc === null) return floor;
                        return elevator.distanceTo(floor.floorNum()) < elevator.distanceTo(acc.floorNum())
                            ? floor
                            : acc;
                    }, null);

                if (floor !== null) {
                    elevator.requestStopAt(floor.floorNum());
                } else if (elevator.mode !== "speed") {
                    /* elevator.requestStopAt(Math.ceil(self.floors.length / self.elevators.length) * elevator.id); */
                    elevator.requestStopAt(0);
                }
            }
        };

        elevator.on("passing_floor", (floorNum, direction) => {
            var floor = self.getFloor(floorNum);
            elevator.debug(
                `passing_floor: ${floorNum} going ${direction} with ${floor.status[direction]} people waiting`
            );

            if (elevator.goesTo(floorNum)) {
                elevator.debug("--> going there, overriding!");
                return elevator.goToFloor(floorNum, true);
            }

            if (floor.status[direction] > 0 && elevator.loadFactor() <= 0.8) {
                if (elevator.mode !== "speed" && floor.isAnElevatorStoppingThere()) return;
                elevator.debug("--> someone waiting, not attended and we have space, overriding");
                return elevator.goToFloor(floorNum, true);
            }
        });

        elevator.on("stopped_at_floor", (floorNum) => {
            elevator.debug("stopped_at_floor: " + floorNum);
            self.getFloor(floorNum).reset(elevator.mode === "speed" ? "both" : elevator.status);

            var newQueue = elevator.destinationQueue.filter(function (f, i, arr) {
                return self.getFloor(f).isSomoneWaiting() && f !== floorNum && arr.indexOf(f) === i;
            });
            if (newQueue.length !== elevator.destinationQueue.length) {
                elevator.destinationQueue = newQueue;
                elevator.updateQueue();
            }

            elevator.fetch();
        });

        elevator.on("idle", () => {
            elevator.debug("idle");
            elevator.fetch();
        });

        elevator.on("floor_button_pressed", (floorNum) => {
            elevator.debug("floor_button_pressed: " + floorNum);
            elevator.requestStopAt(floorNum);
        });
    },

    initFloor: function (floor) {
        const self = this;

        floor.status = { up: 0, down: 0 };

        floor.debug = (msg) => {
            console.log("|f:" + floor.floorNum() + "|", floor.status, msg);
        };

        floor.reset = (direction) => {
            if (direction === "both") {
                floor.status["up"] = 0;
                floor.status["down"] = 0;
            } else {
                floor.status[direction] = 0;
            }
        };

        floor.isSomoneWaiting = () => {
            return floor.status["up"] + floor.status["down"] > 0;
        };

        floor.isAnElevatorStoppingThere = () => {
            return self.elevators.reduce((acc, elevator) => acc || elevator.goesTo(floor.floorNum()), false);
        };

        floor.on("up_button_pressed", () => {
            floor.status["up"] = floor.status["up"] + 1;
            self.requestElevator(floor, "up");
        });

        floor.on("down_button_pressed", () => {
            floor.status["down"] = floor.status["down"] + 1;
            self.requestElevator(floor, "down");
        });
    },

    init: function (elevators, floors) {
        console.clear();
        const self = this;

        self.elevators = elevators;
        self.floors = floors;

        floors.forEach((f) => self.initFloor(f));
        elevators.forEach((e, i) => self.initElevator(e, i));
    },

    getFloor: function (floorNum) {
        const self = this;
        return self.floors.reduce((acc, floor) => (floor.floorNum() == floorNum ? floor : acc), null);
    },

    requestElevator: function (floor, direction) {
        const self = this;

        var selected = self.elevators.reduce((acc, elevator) => {
            if (acc === null) return elevator;
            return elevator.getScore(floor, direction) > acc.getScore(floor, direction) ? elevator : acc;
        }, null);

        floor.debug(
            `(${direction}): ` +
                self.elevators
                    .map((e) => `|e:${e.id}|floor:${e.currentFloor()}|score:${e.getScore(floor, direction)}|`)
                    .join(", ") +
                " -> selected: " +
                selected.id
        );

        selected.requestStopAt(floor.floorNum());
    },

    update: function (dt, elevators, floors) {},
}
