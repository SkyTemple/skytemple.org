const FPS = 30
const REFERENCE_FPS = 60

const ROT_BOUND = 0.087
const ROT_SPEED = 0.00008
const ROT_START = 0.04

const CANVAS_WIDTH = Math.min(1920, window.innerWidth)
const CANVAS_HEIGHT = Math.min(1080, window.innerHeight)
const WORLD_SCALE_WIDTH = CANVAS_WIDTH * 2
const WORLD_SCALE_HEIGHT = CANVAS_HEIGHT * 2

const CAM_SPEED = 0.08
const CAM_SPEED_X = CAM_SPEED * (CANVAS_WIDTH / CANVAS_HEIGHT)
const CAM_SPEED_Y = CAM_SPEED * (CANVAS_HEIGHT / CANVAS_WIDTH)

// The corner offset coordination that the camera can move so that everything is
// still visible, even when fully rotated
const IBB_VISIBLE_OFFSET_X = 36
const IBB_VISIBLE_OFFSET_Y = 80

const CamDirection = {
    TOP_LEFT: 0,
    TOP_RIGHT: 1,
    BOTTOM_LEFT: 2,
    BOTTOM_RIGHT: 3,
    CENTER: 4,
}

class Bg {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = this.canvas.getContext("2d")

        this.canvas.width = CANVAS_WIDTH
        this.canvas.height = CANVAS_HEIGHT

        this.interval = null
        this.camHeadingTo = CamDirection.TOP_LEFT
        this.camPos = [
            WORLD_SCALE_WIDTH - IBB_VISIBLE_OFFSET_X - CANVAS_WIDTH,
            WORLD_SCALE_HEIGHT - IBB_VISIBLE_OFFSET_Y - CANVAS_HEIGHT
        ]
        this.rot = -ROT_START
        this.rotClockwise = false
        this.dungeon = null

        this.fpsTimes = []
        this.fps = 0
        this.fpsStrikes = 0
    }

    async start() {
        if (!this.interval) {
        await this._init()
        this._loop()
        this.interval = setInterval(this._loop.bind(this), 1000 / FPS)
        }
    }

    stop() {
        clearInterval(this.interval)
        this.interval = null
    }

    async _init() {
        this.dungeon = new Dungeon(
            Math.ceil(CANVAS_WIDTH / CHUNK_DIM / CELL_DIMENSIONS),
            Math.ceil(CANVAS_HEIGHT / CHUNK_DIM / CELL_DIMENSIONS)
        )
        await this.dungeon.load()
    }

    _loop() {
        this._checkFps()
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        const img = this.dungeon.render()

        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        this.ctx.rotate(this.rot)
        this.ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2)
        this.ctx.drawImage(
            img, 0, 0,
            CANVAS_WIDTH, CANVAS_HEIGHT,
            -this.camPos[0], -this.camPos[1],
            WORLD_SCALE_WIDTH, WORLD_SCALE_HEIGHT
        )
        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        this.ctx.rotate(-this.rot)
        this.ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2)
        if (this.rotClockwise) {
            this.rot += ROT_SPEED
            if (this.rot > ROT_BOUND) {
                this.rotClockwise = false
            }
        } else {
            this.rot -= ROT_SPEED
            if (this.rot < -ROT_BOUND) {
                this.rotClockwise = true
            }
        }
        let target
        switch (this.camHeadingTo) {
            case CamDirection.CENTER:
            default:
                target = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2]
                break
            case CamDirection.TOP_LEFT:
                target = [IBB_VISIBLE_OFFSET_X, IBB_VISIBLE_OFFSET_Y]
                break
            case CamDirection.TOP_RIGHT:
                target = [WORLD_SCALE_WIDTH - IBB_VISIBLE_OFFSET_X - CANVAS_WIDTH, IBB_VISIBLE_OFFSET_Y]
                break
            case CamDirection.BOTTOM_LEFT:
                target = [IBB_VISIBLE_OFFSET_X, WORLD_SCALE_HEIGHT - IBB_VISIBLE_OFFSET_Y - CANVAS_HEIGHT]
                break
            case CamDirection.BOTTOM_RIGHT:
                target = [
                    WORLD_SCALE_WIDTH - IBB_VISIBLE_OFFSET_X - CANVAS_WIDTH,
                    WORLD_SCALE_HEIGHT - IBB_VISIBLE_OFFSET_Y - CANVAS_HEIGHT
                ]
                break
        }
        if (Math.abs(this.camPos[0] - target[0]) > CAM_SPEED_X) {
            if (this.camPos[0] > target[0]) {
                this.camPos[0] -= CAM_SPEED_X
            } else if (this.camPos[0] < target[0]) {
                this.camPos[0] += CAM_SPEED_X
            }
        }
        if (Math.abs(this.camPos[1] - target[1]) > CAM_SPEED_Y) {
            if (this.camPos[1] > target[1]) {
                this.camPos[1] -= CAM_SPEED_Y
            } else if (this.camPos[1] < target[1]) {
                this.camPos[1] += CAM_SPEED_Y
            }
        }
        if (Math.abs(this.camPos[0] - target[0]) <= CAM_SPEED_X &&
            Math.abs(this.camPos[1] - target[1]) <= CAM_SPEED_Y) {
            if (this.camHeadingTo !== CamDirection.CENTER) {
                this.camHeadingTo = CamDirection.CENTER
            } else {
                this.camHeadingTo = Math.floor(Math.random() * 4)
            }
        }

        this.ctx.fillStyle = "rgba(253, 247, 238, 0.5)";
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    _checkFps() {
        const now = performance.now()
        while (this.fpsTimes.length > 0 && this.fpsTimes[0] <= now - 1000) {
            //console.log(this.fps)
            if (this.fps < 10) {
                this.fpsStrikes += 1
                if (this.fpsStrikes === 20) {
                    this.stop()
                    console.warn('Background animation stopped for performance reasons.')
                }
            }
            this.fpsTimes.shift()
        }
        this.fpsTimes.push(now)
        this.fps = this.fpsTimes.length
    }
}