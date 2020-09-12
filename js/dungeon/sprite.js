const SPRITE_DIR = '/images/dungeon/sprites/'
const SHADOW_FN = 'shadow.png'
const SHADOW_SPRITE_IMG_DIM = 24

const SpriteDirection = {
    DOWN: 0,
    DOWN_RIGHT: 1,
    RIGHT: 2,
    UP_RIGHT: 3,
    UP: 4,
    UP_LEFT: 5,
    LEFT: 6,
    DOWN_LEFT: 7
}

class SpriteRegistry {
    constructor() {
        this.shadow = null
        this.monsterSprites = {}
    }

    async load() {
        this.shadow = new ShadowSprite(SPRITE_DIR + SHADOW_FN)
        await this.shadow.load()
    }

    /**
     * @param {MonsterInfo} mInfo
     * @returns {MonsterSprite}
     */
    getMonsterSprite(mInfo) {
        if (!this.monsterSprites.hasOwnProperty(mInfo.id)) {
            this.monsterSprites[mInfo.id] = new MonsterSprite(
                SPRITE_DIR + mInfo.id + '.png', this.shadow, mInfo.shadowSize,
                mInfo.idleFrameSize, mInfo.walkFrameSize,
                mInfo.idleDurations, mInfo.walkDurations
            )
        }
        return this.monsterSprites[mInfo.id]
    }
}

class AbstractBaseSprite {
    /**
     * @param {string} spriteSheetUrl
     */
    constructor(spriteSheetUrl) {
        this.spriteSheet = null
        this.loadPromise = loadImage(spriteSheetUrl)
        this.loadPromise.then((img) => {
            console.log("loaded sprite for " + spriteSheetUrl)
            this.spriteSheet = img
        })
        this.spriteFrameDim = 96 * 2
    }

    async load() {
        return await this.loadPromise;
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {number} frameX
     * @param {number} frameY
     * @param {number} imgCenterX
     * @param {number} imgCenterY
     */
    drawSubframe(context, frameX, frameY, imgCenterX, imgCenterY) {
        const frameCoords = this.frameAtIndex(frameX, frameY)
        context.drawImage(
            this.spriteSheet, frameCoords[0], frameCoords[1],
            this.spriteFrameDim, this.spriteFrameDim,
            this.translateCoordX(imgCenterX), this.translateCoordY(imgCenterY),
            this.spriteFrameDim, this.spriteFrameDim
        )
    }

    frameAtIndex(x, y) {
        return [x * this.spriteFrameDim, y * this.spriteFrameDim]
    }

    translateCoordX(centerCoord) {
        return centerCoord - this.spriteFrameDim / 2
    }

    translateCoordY(centerCoord) {
        return centerCoord - this.spriteFrameDim / 2
    }

}


class MonsterSprite extends AbstractBaseSprite {
    /**
     * @param {string} spriteSheetUrl
     * @param {ShadowSprite} shadowSprite
     * @param {number} shadowSize
     * @param {number} idleFrameSize
     * @param {number} walkFrameSize
     * @param {number[]} idleDurations
     * @param {number[]} walkDurations
     */
    constructor(spriteSheetUrl, shadowSprite, shadowSize, idleFrameSize, walkFrameSize, idleDurations, walkDurations) {
        super(spriteSheetUrl)
        this.shadowSprite = shadowSprite
        this.shadowSize = shadowSize
        this.idleFrameSize = idleFrameSize
        this.walkFrameSize = walkFrameSize
        this.idleDurations = idleDurations
        this.walkDurations = walkDurations
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {number} centerX
     * @param {number} centerY
     * @param {boolean} walking
     * @param {number} dir (value of SpriteDirection)
     * @param {number} frame
     */
    draw(context, centerX, centerY, walking, dir, frame) {
        //context.fillStyle = '#f00'
        //context.fillRect(centerX - CHUNK_DIM / 2, centerY - CHUNK_DIM * 0.75, CHUNK_DIM, CHUNK_DIM)
        this.spriteFrameDim = walking ? this.walkFrameSize : this.idleFrameSize
        this.shadowSprite.draw(context, centerX, centerY, this.shadowSize)
        let frameX = dir
        if (walking) {
            frameX += 8
        }
        this.drawSubframe(context, frameX, frame, centerX, centerY)
    }

    frameAtIndex(x, y) {
        let xOff = 0
        for (let i = 0; i < x; i++) {
            if (i < 8) {
                xOff += this.idleFrameSize
            } else {
                xOff += this.walkFrameSize
            }
        }
        return [xOff, y * this.spriteFrameDim]
    }
}

class ShadowSprite extends AbstractBaseSprite {
    constructor(spriteSheetUrl) {
        super(spriteSheetUrl);
        this.spriteFrameDim = SHADOW_SPRITE_IMG_DIM
    }
    /**
     * @param {CanvasRenderingContext2D} context
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} shadowSize
     */
    draw(context, centerX, centerY, shadowSize) {
        this.drawSubframe(context, shadowSize, 0, centerX, centerY)
    }
}
