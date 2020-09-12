const CHUNK_DIM = 3 * 8
const DUNGEON_IMAGE_SRC = '/images/dungeon/dungeon.png'
const DUNGEON_IMAGE_ROW_SIZE = 16
const DUNGEON_DMA_SRC = '/images/dungeon/dungeon.dma'
const CELL_DIMENSIONS = 10

const INITIAL_MONSTER_MIN = 5
const INITIAL_MONSTER_MAX = 15
const MAX_MONSTERS = 25
const RESPAWN_INTERVAL = 5 * 30

//const DUNGEON_SERVICE_ENDPOINT = '/generateDungeon/'
const DUNGEON_SERVICE_ENDPOINT = 'http://localhost:5000/'

class Dungeon {
    /**
     * Create a new dungeon, width and height are in cells.
     * @param {number} widthInCells
     * @param {number} heightInCells
     */
    constructor(widthInCells, heightInCells) {
        this.bgCanvas = document.createElement('canvas')
        this.bgCtx = this.bgCanvas.getContext("2d")
        this.renderCanvas = document.createElement('canvas')
        this.renderCtx = this.renderCanvas.getContext("2d")
        this.widthInCells = widthInCells
        this.heightInCells = heightInCells
        this.width = this.widthInCells * CELL_DIMENSIONS + 1
        this.height = this.heightInCells * CELL_DIMENSIONS + 1
        this.bgCanvas.width = this.width * CHUNK_DIM
        this.bgCanvas.height = this.height * CHUNK_DIM
        this.renderCanvas.width = this.width * CHUNK_DIM
        this.renderCanvas.height = this.height * CHUNK_DIM
        this.map = null;
        this.mapCollision = null
        this.opacity = 0

        this.turnManager = new TurnManager(new IdlePlayer())
        this.spriteRegistry = new SpriteRegistry()
        this.monsterInfoRegistry = new MonsterInfoRegistry(this.spriteRegistry)
        this.monsterSpawner = new MonsterSpawner(
            this.monsterInfoRegistry, this.width, this.height,
            this.checkCollision.bind(this)
        )
        /**
         * @type {MonsterEntity[]}
         */
        this.monsters = []

        this.moveAnimCounter = 0
    }

    async load() {
        let promises = []
        promises.push(this._loadBackgroundImage())
        promises.push(this.monsterInfoRegistry.load())
        promises.push(this.spriteRegistry.load())
        await Promise.all(promises)
        promises = []
        this.monsterSpawner.initSpawnPoints(this.getBaseCollision())
        const initialPoke = randomInt(INITIAL_MONSTER_MIN, INITIAL_MONSTER_MAX)
        for (let i = 0; i < initialPoke; i++) {
            this.spawn()
        }

        promises.push(new Promise(resolve => setTimeout(() => resolve(), 350)))
        await Promise.all(promises)
    }

    getBackgroundImage() {
        return this.bgCanvas
    }

    render() {
        this.turnManager.tick()
        if (this.opacity < 1) {
            this.opacity += 0.04
        }
        this.renderCtx.globalAlpha = this.opacity
        this.renderCtx.drawImage(this.getBackgroundImage(), 0, 0)

        this._processTurn()

        const newMonsters = []
        for (let monster of this.monsters) {
            if (monster.checkAlive()) {
                monster.render(this.renderCtx)
                newMonsters.push(monster)
            }
        }
        this.monsters = newMonsters
        if (this.monsters.length < MAX_MONSTERS && this.turnManager.ticks % RESPAWN_INTERVAL === 0) {
            this.spawn()
        }
        return this.renderCanvas
    }

    getBaseCollision() {
        return this.mapCollision
    }

    checkCollision(x, y, allowWater) {
        if (!this.mapCollision[y][x]) {
            if (!allowWater) {
                return false
            }
            if (this.map[y][x] === DmaType.WALL) {
                return false
            }
        }
        for (const monster of this.monsters) {
            if (monster.x === x && monster.y === y && monster.hasMovedThisTurn) {
                return false
            }
        }
        return true
    }

    /**
     * @returns {MonsterEntity|null}
     */
    spawn() {
        const monster = this.monsterSpawner.spawn()
        if (monster) {
            this.monsters.push(monster)
            this.monsters.sort((a, b) => a.y < b.y ? -1 : 1)
        }
        return monster
    }

    async _loadBackgroundImage() {
        const mapPromise = this._loadMap()
        const dpcPromise = loadImage(DUNGEON_IMAGE_SRC)
        const dmaBin = new Uint8Array(await xhr('GET', DUNGEON_DMA_SRC, 'arraybuffer'))
        const dpc = await dpcPromise
        const dma = new Dma(dmaBin)
        this.map = await mapPromise
        this.mapCollision = []

        let mapMappings = dma.getMappingsForRules(this.map, 0, true)

        for (let y = 0; y < this.height; y++) {
            const colRow = []
            this.mapCollision.push(colRow)
            for (let x = 0; x < this.width; x++) {
                colRow.push(this.map[y][x] === DmaType.FLOOR)
                const dpcIndex = mapMappings[y][x]
                const dpcY = Math.floor(dpcIndex / DUNGEON_IMAGE_ROW_SIZE)
                const dpcX = dpcIndex % DUNGEON_IMAGE_ROW_SIZE
                this.bgCtx.drawImage(
                    dpc,
                    dpcX * CHUNK_DIM, dpcY * CHUNK_DIM,
                    CHUNK_DIM, CHUNK_DIM,
                    x * CHUNK_DIM, y * CHUNK_DIM,
                    CHUNK_DIM, CHUNK_DIM
                )
            }
        }
    }

    /**
     * @return {Promise<number[][]>} Rules (numbers are DmaType)
     * @private
     */
    async _loadMap() {
        try {
            const result = await xhr(
                'GET', DUNGEON_SERVICE_ENDPOINT + '?w=' + this.widthInCells + '&h=' + this.heightInCells
            )
            console.log(result)
            const lines = result.split('\n')
            if (lines[lines.length - 1] === '') {
                lines.pop()
            }
            if (lines.length !== this.height || lines[0].length !== this.width) {
                throw new Error("Response had invalid dims.")
            }
            const rules = []
            for (let y = 0; y < lines.length; y++) {
                const row = []
                rules.push(row)
                for (let x = 0; x < lines[y].length; x++) {
                    switch (lines[y][x]) {
                        case '#':
                        default:
                            row.push(DmaType.WALL)
                            break
                        case '~':
                            row.push(DmaType.WATER)
                            break
                        case '.':
                            row.push(DmaType.FLOOR)
                            break
                    }
                }
            }
            return rules
        } catch (err) {
            console.warn('Failed loading dungeon from backend. Falling back to random.')
            console.warn(err)
            return this._fallbackMapGenerator()
        }
    }

    /**
     * A very stupid fallback generator, just in case.
     * @return {Promise<number[][]>} Rules (numbers are DmaType)
     * @private
     */
    _fallbackMapGenerator() {
        const rules = []
        for (let y = 0; y < this.height; y++) {
            const row = []
            rules.push(row)
            for (let x = 0; x < this.width; x++) {
                switch (Math.floor(Math.random() * 11)) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                        row.push(DmaType.FLOOR)
                        break
                    case 6:
                    case 7:
                    case 8:
                        row.push(DmaType.WALL)
                        break
                    case 9:
                    case 10:
                    default:
                        row.push(DmaType.WATER)
                        break
                }
            }
        }
        return rules;
    }

    _processTurn() {
        switch (this.turnManager.turnPhase) {
            case TurnPhase.WAITING_FOR_PLAYER:
            default:
                break
            case TurnPhase.MOVING_DECIDE:
                for (const monster of this.monsters) {
                    monster.hasMovedThisTurn = false
                }
                for (const monster of this.monsters) {
                    monster.move()
                }
                this.moveAnimCounter = 0
                this.turnManager.doneWithMovementDecide()
                break
            case TurnPhase.MOVING_ANIMATION:
                if (this.moveAnimCounter >= CHUNK_DIM) {
                    for (const monster of this.monsters) {
                        monster.finishMoveAnim()
                    }
                    this.turnManager.doneWithAnimation()
                } else {
                    for (const monster of this.monsters) {
                        monster.setMoveAnim(this.moveAnimCounter)
                    }
                }
                this.moveAnimCounter += 1
        }
    }
}

/* Utilities */

function getTileCenterX(chunkX) {
    return CHUNK_DIM * chunkX + CHUNK_DIM / 2
}

function getTileCenterY(chunkY) {
    return CHUNK_DIM * chunkY + CHUNK_DIM * 0.75
}
