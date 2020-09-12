const PLAYER_WAIT_TIME = 2 * 30

const TurnPhase = {
    WAITING_FOR_PLAYER: 0,
    MOVING_DECIDE: 1,
    MOVING_ANIMATION: 2
}

class TurnManager {
    /**
     * @param {IdlePlayer} player
     */
    constructor(player) {
        this.ticks = 0
        this.turnPhase = TurnPhase.WAITING_FOR_PLAYER
        this.player = player
        this.player.startWaitingForInput()
    }
    tick() {
        this.ticks++
        if (this.ticks === 100000) {
            this.ticks = 0
        }
        if (this.turnPhase === TurnPhase.WAITING_FOR_PLAYER) {
            if (this.player.isDone()) {
                this.turnPhase = TurnPhase.MOVING_DECIDE
            }
        }
    }
    doneWithMovementDecide() {
        this.turnPhase = TurnPhase.MOVING_ANIMATION
    }
    doneWithAnimation() {
        this.turnPhase = TurnPhase.WAITING_FOR_PLAYER
        this.player.startWaitingForInput()
    }
}

/**
 * This is a dummy player that just a fixed waiting time. But the interface could actually be
 * used to implement a real player input!
 */
class IdlePlayer {
    startWaitingForInput() {
        this.inputTimer = PLAYER_WAIT_TIME
    }

    isDone() {
        this.inputTimer--
        return this.inputTimer <= 0
    }

}
