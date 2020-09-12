const MONSTER_INFO_JSON = '/images/dungeon/sprites/sprites.json'
const MONSTER_COUNT = 536
const MONSTER_AGE_MIN = 30 * 30
const MONSTER_AGE_MAX = 240 * 30

const MInfoIndex = {
    SHADOW_SIZE: 0,
    MOVEMENT_TYPE: 1,
    IDLE_DATA: 2,
    WALK_DATA: 3
}

const MovementType = {
    STANDARD: 0,
    UNKNOWN1: 1,
    HOVERING: 2,
    PHASE_THROUGH_WALLS: 3,
    LAVA: 4,
    WATER: 5
}

class MonsterInfoRegistry {
    constructor(spriteRegistry) {
        this.spriteRegistry = spriteRegistry
        this.monsterInfos = {}
    }
    async load() {
        this.infoMetadata = JSON.parse(await xhr('GET', MONSTER_INFO_JSON))
    }
    get(id) {
        if (!this.monsterInfos.hasOwnProperty(id)) {
            this.monsterInfos[id] = new MonsterInfo(
                id, this.infoMetadata[id - 1], this.spriteRegistry
            )
        }
        return this.monsterInfos[id]
    }
}

class MonsterSpawner {
    /**
     * @param {MonsterInfoRegistry} monsterInfoRegistry
     * @param {number} width
     * @param {number} height
     * @param {Function} collisionCheckFn
     */
    constructor(monsterInfoRegistry, width, height, collisionCheckFn) {
        this.monsterInfoRegistry = monsterInfoRegistry
        this.width = width
        this.height = height
        this.collisionCheckFn = collisionCheckFn
    }

    /**
     * @param {boolean[][]} collision
     */
    initSpawnPoints(collision) {
        this.possibleSpawnLocations = []
        for (let y = 1; y < collision.length - 1; y++) {
            for (let x = 1; x < collision[y].length - 1; x++) {
                let possible = true
                for (let j = -1; j <= 1; j++) {
                    for (let k = -1; k <= 1; k++) {
                        if (!collision[y + j][x + k]) {
                            possible = false
                        }
                    }
                }
                if (possible) {
                    this.possibleSpawnLocations.push([y, x])
                }
            }
        }
    }

    spawn() {
        const monsterInfo = this.monsterInfoRegistry.get(randomInt(1, MONSTER_COUNT))
        const spawnLocation = this._getSpawnLocation()
        if (spawnLocation) {
            return new MonsterEntity(spawnLocation[1], spawnLocation[0], monsterInfo, this.collisionCheckFn)
        }
        return null
    }

    _getSpawnLocation() {
        const leftSpawns = [...this.possibleSpawnLocations]
        while (leftSpawns.length > 0) {
            const index = randomInt(0, leftSpawns.length - 1)
            const y = leftSpawns[index][0]
            const x = leftSpawns[index][1]
            if (this.collisionCheckFn(x, y)) {
                return [y, x]
            }
            leftSpawns.splice(2,1)
        }
        return null
    }
}

class MonsterInfo {
    /**
     * @param {number} id
     * @param {Array} info
     * @param {SpriteRegistry} spriteRegistry
     */
    constructor(id, info, spriteRegistry) {
        this.id = id
        this.shadowSize = info[MInfoIndex.SHADOW_SIZE]
        this.canWalkOnWater = info[MInfoIndex.MOVEMENT_TYPE] === MovementType.WATER
            || info[MInfoIndex.MOVEMENT_TYPE] === MovementType.HOVERING
            || info[MInfoIndex.MOVEMENT_TYPE] === MovementType.PHASE_THROUGH_WALLS
        this.idleFrameSize = info[MInfoIndex.IDLE_DATA][0]
        this.walkFrameSize = info[MInfoIndex.WALK_DATA][0]
        this.idleDurations = []
        this.walkDurations = []

        for (const dir of info[MInfoIndex.IDLE_DATA][1]) {
            const dirFs = []
            this.idleDurations.push(dirFs)
            for (const d of dir) {
                dirFs.push(Math.floor(d * (FPS / REFERENCE_FPS)))
            }
        }
        for (const dir of info[MInfoIndex.WALK_DATA][1]) {
            const dirFs = []
            this.walkDurations.push(dirFs)
            for (const d of dir) {
                dirFs.push(Math.floor(d * (FPS / REFERENCE_FPS)))
            }
        }
        this.sprite = spriteRegistry.getMonsterSprite(this)
    }
}

class MonsterEntity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {MonsterInfo} monsterInfo
     * @param {Function} collisionCheckFn
     */
    constructor(x, y, monsterInfo, collisionCheckFn) {
        this.x = x
        this.y = y
        this.monsterInfo = monsterInfo
        this.collisionCheckFn = collisionCheckFn

        this.hasMovedThisTurn = true
        this.alive = true
        this.age = 0
        this.diesAt = randomInt(MONSTER_AGE_MIN, MONSTER_AGE_MAX)
        this.dir = randomInt(0, 7)
        this.isWalking = false

        this.prevMovement = [0, 0]
        this.animMovePrevX = this.x
        this.animMovePrevY = this.y
        this.animMoveProgress = 0

        this.animationFrame = 0
        this.animationCounter = 0
    }

    /** Preloads the sprite */
    async preload() {
        await this.monsterInfo.sprite.load()
    }

    checkAlive() {
        if (!this.monsterInfo.sprite.spriteSheet) {
            // Don't process until sprite loaded.
            return this.alive
        }
        this.age++
        if (this.age > this.diesAt) {
            this.alive = false
        }
        return this.alive
    }

    /**
     * Let the entity randomly walk to a new position.
     * This does not handle the animation, see setMoveAnim and finishMoveAnim for this.
     */
    move() {
        const movementOptions = []
        const cwow = this.monsterInfo.canWalkOnWater
        // Up
        if (this.collisionCheckFn(this.x, this.y - 1, cwow)) {
            movementOptions.push([-1, 0, SpriteDirection.UP])
        }
        // Left
        if (this.collisionCheckFn(this.x - 1, this.y, cwow)) {
            movementOptions.push([0, -1, SpriteDirection.LEFT])
        }
        // Right
        if (this.collisionCheckFn(this.x + 1, this.y, cwow)) {
            movementOptions.push([0, 1, SpriteDirection.RIGHT])
        }
        // Down
        if (this.collisionCheckFn(this.x, this.y + 1, cwow)) {
            movementOptions.push([1, 0, SpriteDirection.DOWN])
        }
        // Up-Left
        if (this.collisionCheckFn(this.x, this.y - 1, cwow)
            && this.collisionCheckFn(this.x - 1, this.y, cwow)
            && this.collisionCheckFn(this.x - 1, this.y - 1, cwow)) {
            movementOptions.push([-1, -1, SpriteDirection.UP_LEFT])
        }
        // Up-Right
        if (this.collisionCheckFn(this.x, this.y - 1, cwow)
            && this.collisionCheckFn(this.x + 1, this.y, cwow)
            && this.collisionCheckFn(this.x + 1, this.y - 1, cwow)) {
            movementOptions.push([-1, 1, SpriteDirection.UP_RIGHT])
        }
        // Down-Left
        if (this.collisionCheckFn(this.x, this.y + 1, cwow)
            && this.collisionCheckFn(this.x - 1, this.y, cwow)
            && this.collisionCheckFn(this.x - 1, this.y + 1, cwow)) {
            movementOptions.push([1, -1, SpriteDirection.DOWN_LEFT])
        }
        // Down-Right
        if (this.collisionCheckFn(this.x, this.y + 1, cwow)
            && this.collisionCheckFn(this.x + 1, this.y, cwow)
            && this.collisionCheckFn(this.x + 1, this.y + 1, cwow)) {
            movementOptions.push([1, 1, SpriteDirection.DOWN_RIGHT])
        }
        // noinspection EqualityComparisonWithCoercionJS

        if (movementOptions.length < 1) {
            // Really shouldn't happen
            this.alive = false
        } else {
            if (movementOptions.length > 1) {
                const idx = movementOptions.findIndex((v) => v == [this.prevMovement[0] * -1, this.prevMovement[1] * -1])
                if (idx > -1) {
                    movementOptions.splice(idx, 1)
                }
            }
            const movement = movementOptions[randomInt(0, movementOptions.length - 1)]
            this.x += movement[1]
            this.y += movement[0]
            this.prevMovement = [movement[0], movement[1]]
            this.dir = movement[2]
        }
        this.hasMovedThisTurn = true
    }

    setWalking(value) {
        if (value !== this.isWalking) {
        this.isWalking = value
        this.animationFrame = 0
        this.animationCounter = 0
        }
    }

    setMoveAnim(pos) {
        this.setWalking(true)
        this.animMoveProgress = pos
    }

    finishMoveAnim() {
        this.animMovePrevX = this.x
        this.animMovePrevY = this.y
        this.animMoveProgress = 0
        this.setWalking(false)
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this.monsterInfo.sprite.spriteSheet) {

            const frameInfo = this.isWalking ? this.monsterInfo.walkDurations[this.dir] : this.monsterInfo.idleDurations[this.dir]
            if (this.animationCounter > frameInfo[this.animationFrame]) {
                this.animationCounter = 0
                this.animationFrame++
                if (this.animationFrame >= frameInfo.length) {
                    this.animationFrame = 0
                }
            }
            this.animationCounter++

            let moveAnimX = 0
            let useX = this.x
            if (this.animMovePrevX < this.x) {
                moveAnimX = this.animMoveProgress
                useX = this.animMovePrevX
            } else if (this.animMovePrevX > this.x) {
                moveAnimX = -this.animMoveProgress
                useX = this.animMovePrevX
            }

            let moveAnimY = 0
            let useY = this.y
            if (this.animMovePrevY < this.y) {
                moveAnimY = this.animMoveProgress
                useY = this.animMovePrevY
            } else if (this.animMovePrevY > this.y) {
                moveAnimY = -this.animMoveProgress
                useY = this.animMovePrevY
            }

            this.monsterInfo.sprite.draw(
                ctx,
                getTileCenterX(useX) + moveAnimX, getTileCenterY(useY) + moveAnimY,
                this.isWalking, this.dir, this.animationFrame
            )
        }
    }
}
