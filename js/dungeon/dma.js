const DmaType = {
    WALL: 0,
    WATER: 1,
    FLOOR: 2
}

const DmaExtraType = {
    FLOOR1: 0,
    WALL_OR_VOID: 1,
    FLOOR2: 2
}

const DmaNeighbor = {
    SOUTH: 0x01,
    SOUTH_EAST: 0x02,
    EAST: 0x04,
    NORTH_EAST: 0x08,
    NORTH: 0x10,
    NORTH_WEST: 0x20,
    WEST: 0x40,
    SOUTH_WEST: 0x80
}

/**
 * See skytemple_files.graphics.dma.model.Dma (Python!) for docs
 */
class Dma {
    /**
     * @param {Uint8Array} data
     */
    constructor(data) {
        this.chunkMappings = data
    }

    /**
     * @param {number} getType (DmaType value)
     * @param {number} neighborsSame
     * @return {ArrayLike<number>}
     */
    get(getType, neighborsSame) {
        let highTwo = 0
        if (getType === DmaType.WATER) {
            highTwo = 0x100
        } else if (getType === DmaType.FLOOR) {
            highTwo = 0x200
        }
        const idx = highTwo + neighborsSame
        return this.chunkMappings.slice(idx * 3, (idx * 3) + 3)
    }

    /**
     * @param {number} extraType (DmaExtraType value)
     * @return {ArrayLike<number>}
     */
    getExtra(extraType) {
        const cms = []
        for (let i = 0x300 * 3; i < this.chunkMappings.length; i++) {
            if (i % 3 === extraType) {
                cms.push(this.chunkMappings[i])
            }
        }
        return cms
    }

    /**
     * @param {number[][]} rules (numbers are DmaType)
     * @param {number?} variationIndex If not set, random
     * @param {boolean} treatOutsideAsWall
     */
    getMappingsForRules(rules, variationIndex, treatOutsideAsWall) {
        // Doing this before and after once is much faster.
        if (treatOutsideAsWall) {
            const newRuleMatrix = [Array(rules[0].length + 2).fill(DmaType.WALL)]
            for (const row of rules) {
                newRuleMatrix.push([DmaType.WALL].concat(row).concat([DmaType.WALL]))
            }
            newRuleMatrix.push(Array(rules[0].length + 2).fill(DmaType.WALL))
            rules = newRuleMatrix
        }

        let mappings = []
        const wallMatrix = []
        const waterMatrix = []
        for (const ruleRow of rules) {
            const activeWall = []
            const activeWater = []
            wallMatrix.push(activeWall)
            waterMatrix.push(activeWater)
            for (const ruleCell of ruleRow) {
                if (ruleCell === DmaType.WALL) {
                    activeWall.push(true)
                    activeWater.push(false)
                } else if (ruleCell === DmaType.WATER) {
                    activeWall.push(false)
                    activeWater.push(true)
                } else {
                    activeWall.push(false)
                    activeWater.push(false)
                }
            }
        }

        for (const ry in rules) {
            const ruleRow = rules[ry]
            const activeRow = []
            mappings.push(activeRow)
            for (const rx in ruleRow) {
                const ruleCell = ruleRow[rx]
                let targetMatrix = wallMatrix
                if (ruleCell === DmaType.WATER) {
                    targetMatrix = waterMatrix
                }
                const solidNeighbors = Dma.getTileNeighbors(
                    targetMatrix, parseInt(rx), parseInt(ry),
                    ruleCell !== DmaType.FLOOR, false
                )
                const variations = this.get(ruleCell, solidNeighbors)
                let variation
                if (variationIndex !== undefined) {
                    variation = variations[variationIndex]
                } else {
                    variation = variations[Math.floor(Math.random() * variations.length)]
                }
                activeRow.push(variation)
            }
        }

        if (treatOutsideAsWall) {
            const newMappings = []
            for (let y = 1; y < mappings.length - 1; y++) {
                const row = []
                newMappings.push(row)
                for (let x = 1; x < mappings[y].length - 1; x++) {
                    row.push(mappings[y][x])
                }
            }
            mappings = newMappings
        }
        return mappings
    }

    /**
     * @param {boolean[][]} wallMatrix
     * @param {number} x
     * @param {number} y
     * @param {boolean} selfIsWallOrWater
     * @param {boolean} treatOutsideAsWall
     */
    static getTileNeighbors(wallMatrix, x, y, selfIsWallOrWater, treatOutsideAsWall) {
        let ns = 0
        if (treatOutsideAsWall) {
            x++
            y++
            const newWallMatrix = [Array(wallMatrix[0].length + 2).fill(true)]
            for (const row of wallMatrix) {
                newWallMatrix.push([true].concat(row).concat([true]))
            }
            newWallMatrix.push(Array(wallMatrix[0].length + 2).fill(true))
            wallMatrix = newWallMatrix
        }
        // SOUTH
        if (y + 1 < wallMatrix.length && wallMatrix[y + 1][x]) {
            ns += DmaNeighbor.SOUTH
        }
        // SOUTH EAST
        if (y + 1 < wallMatrix.length && x + 1 < wallMatrix[y + 1].length && wallMatrix[y + 1][x + 1]) {
            ns += DmaNeighbor.SOUTH_EAST
        }
        // EAST
        if (x + 1 < wallMatrix[y].length && wallMatrix[y][x + 1]) {
            ns += DmaNeighbor.EAST
        }
        // NORTH EAST
        if (y - 1 >= 0 && x + 1 < wallMatrix[y - 1].length && wallMatrix[y - 1][x + 1]) {
            ns += DmaNeighbor.NORTH_EAST
        }
        // NORTH
        if (y - 1 >= 0 && wallMatrix[y - 1][x]) {
            ns += DmaNeighbor.NORTH
        }
        // NORTH WEST
        if (y - 1 >= 0 && x - 1 >= 0 && wallMatrix[y - 1][x - 1]) {
            ns += DmaNeighbor.NORTH_WEST
        }
        // WEST
        if (x - 1 >= 0 && wallMatrix[y][x - 1]) {
            ns += DmaNeighbor.WEST
        }
        // SOUTH WEST
        if (y + 1 < wallMatrix.length && x - 1 >= 0 && wallMatrix[y + 1][x - 1]) {
            ns += DmaNeighbor.SOUTH_WEST
        }

        if (!selfIsWallOrWater) {
            // If we are not solid, we need to invert, since we just checked for us being solid.
            ns ^= 0xFF
        }
        return ns
    }
}