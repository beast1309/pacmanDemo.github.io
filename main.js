import { getRandomFrom, haveCollision } from './additional.js'
import Cinematic from './cinematic.js'
import DisplayObject from './displayObject.js'
import Game from './game.js'
import Group from './group.js'
import { loadImage, loadJSON } from './loader.js'
import Sprite from './sprite.js'
import Text from './text.js'

const scale = 3

export default async function main() {
    const game = new Game({
        width: 492,
        height: 686,
        background: 'black'
    })

    const party = new Group()
    party.offsetY = 50
    game.stage.add(party)

    const status = new Text({
        x: game.canvas.width / 2,
        y: 35,
        content: "0 очков",
        fill: "white"
    })

    status.points = 0
    game.stage.add(status)

    document.body.append(game.canvas)

    const image = await loadImage('./sets/pacman-sets.png')
    const atlas = await loadJSON('./sets/atlas.json')

    const maze = new Sprite({
        image,
        x: 0,
        y: 0,
        width: atlas.maze.width * scale,
        height: atlas.maze.height * scale,
        frame: atlas.maze
    })

    /* game.canvas.width = maze.width
    game.canvas.height = maze.height */

    let foods = atlas.maze.foods
        .map(food => ({
            ...food,
            x: food.x * scale,
            y: food.y * scale,
            width: food.width * scale,
            height: food.height * scale,
        }))
        .map(food => new Sprite({
            image,
            frame: atlas.food,
            ...food
        }))

    const pacman = new Cinematic({
        image,
        x: atlas.position.pacman.x * scale,
        y: atlas.position.pacman.y * scale,
        width: 8 * scale,
        height: 8 * scale,
        animations: atlas.pacman,
        /* debug: true, */
        speedX: 1
    })
    pacman.start('right')

    const ghosts = ['red', 'pink', 'blue', 'brown']
        .map(color => {
            const ghost = new Cinematic({
                image,
                x: atlas.position[color].x * scale,
                y: atlas.position[color].y * scale,
                width: 8 * scale,
                height: 8 * scale,
                animations: atlas[`${color}Ghost`],
                /* debug: true */
            })
            ghost.start(atlas.position[color].direction)
            ghost.nextMove = atlas.position[color].direction
            ghost.isEat = false

            return ghost
        })

    const walls = atlas.maze.walls.map(wall => new DisplayObject({
        x: wall.x * scale,
        y: wall.y * scale,
        width: wall.width * scale,
        height: wall.height * scale,
        /* debug: true, */
    }))

    const leftPortal = new DisplayObject({
        x: atlas.leftPortal.x * scale,
        y: atlas.leftPortal.y * scale,
        width: atlas.leftPortal.width * scale,
        height: atlas.leftPortal.height * scale,
        /* debug: true */
    })

    const rightPortal = new DisplayObject({
        x: atlas.rightPortal.x * scale,
        y: atlas.rightPortal.y * scale,
        width: atlas.rightPortal.width * scale,
        height: atlas.rightPortal.height * scale,
        /* debug: true */
    })

    const tablets = atlas.position.tablets
        .map(tablet => new Sprite({
            image,
            frame: atlas.tablet,
            x: tablet.x * scale,
            y: tablet.y * scale,
            width: tablet.width * scale,
            height: tablet.height * scale,
            /* debug: true */
        }))

    party.add(maze)
    foods.forEach(food => party.add(food))
    party.add(pacman)
    ghosts.forEach(ghost => party.add(ghost))
    walls.forEach(wall => party.add(wall))
    party.add(leftPortal)
    party.add(rightPortal)
    tablets.forEach(tablet => party.add(tablet))

    game.update = () => {
        const eated = []
        for (const food of foods) {
            if (haveCollision(pacman, food)) {
                eated.push(food)
                party.remove(food)
                status.points += 100
                status.content = `${status.points} очков`
            }
        }
        foods = foods.filter(food => !eated.includes(food))

        changeMove(pacman)
        ghosts.forEach(changeMove)

        for (const ghost of ghosts) {
            if (!ghost.play) {
                return
            }

            const wall = getWallColition(ghost.getNextPosition())

            if (wall) {
                ghost.speedX = 0
                ghost.speedY = 0
            }

            if ((ghost.speedX === 0 && ghost.speedY === 0) || Math.random() > .95) {
                if (ghost.animation.name === 'up') {
                    ghost.nextMove = getRandomFrom('left', 'right')
                }

                else if (ghost.animation.name === 'down') {
                    ghost.nextMove = getRandomFrom('left', 'right')
                }

                else if (ghost.animation.name === 'left') {
                    ghost.nextMove = getRandomFrom('up', 'down')
                }

                else if (ghost.animation.name === 'right') {
                    ghost.nextMove = getRandomFrom('down', 'up')
                }
            }

            if (pacman.play && ghost.play && haveCollision(pacman, ghost)) {
                if (ghost.isEat) {
                    ghost.play = false
                    ghost.speedX = 0
                    ghost.speedY = 0
                    party.remove(ghost)
                    ghosts.splice(ghosts.indexOf(ghost), 1)

                    status.points += 1000
                    status.content = `${status.points} очков`
                }

                else {
                    pacman.speedX = 0
                    pacman.speedY = 0
                    pacman.start('die', {
                        onEnd() {
                            pacman.play = false
                            pacman.stop()
                            party.remove(pacman)
                        }
                    })
                }
            }

            if (haveCollision(ghost, leftPortal)) {
                ghost.x = atlas.rightPortal.x * scale - ghost.width - 1
            }

            if (haveCollision(ghost, rightPortal)) {
                ghost.x = atlas.leftPortal.x * scale + ghost.width + 1
            }
        }

        const wall = getWallColition(pacman.getNextPosition())
        if (wall) {
            pacman.start(`wait${pacman.animation.name}`)
            pacman.speedX = 0
            pacman.speedY = 0
        }

        if (haveCollision(pacman, leftPortal)) {
            pacman.x = atlas.rightPortal.x * scale - pacman.width - 1
        }

        if (haveCollision(pacman, rightPortal)) {
            pacman.x = atlas.leftPortal.x * scale + pacman.width + 1
        }

        for (let i = 0; i < tablets.length; i++) {
            const tablet = tablets[i]

            if (haveCollision(pacman, tablet)) {
                tablets.splice(i, 1)
                party.remove(tablet)

                ghosts.forEach(ghost => {
                    ghost.originalAnimations = ghost.animations
                    ghost.animations = atlas.eatGhost
                    ghost.isEat = true
                    ghost.start(ghost.animation.name)
                })

                setTimeout(() => {
                    ghosts.forEach(ghost => {
                        ghost.animations = ghost.originalAnimations
                        ghost.isEat = false
                        ghost.start(ghost.animation.name)
                    })
                }, 5000)

                break
            }
        }
    }

    document.addEventListener('keydown', event => {
        if (!pacman.play) {
            return
        }

        if (event.key === "ArrowLeft") {
            pacman.nextMove = 'left'
        }

        else if (event.key === "ArrowRight") {
            pacman.nextMove = 'right'
        }

        else if (event.key === "ArrowUp") {
            pacman.nextMove = 'up'
        }

        else if (event.key === "ArrowDown") {
            pacman.nextMove = 'down'
        }
    })

    function getWallColition(obj) {
        for (const wall of walls) {
            if (haveCollision(wall, obj)) {
                return wall
            }
        }
        return null
    }

    function changeMove(sprite) {
        if (!sprite.nextMove) {
            return
        }

        if (sprite.nextMove === 'up') {
            sprite.y -= 10
            if (!getWallColition(sprite)) {
                sprite.nextMove = null
                sprite.speedX = 0
                sprite.speedY = -1
                sprite.start('up')
            }
            sprite.y += 10
        }

        else if (sprite.nextMove === 'down') {
            sprite.y += 10
            if (!getWallColition(sprite)) {
                sprite.nextMove = null
                sprite.speedX = 0
                sprite.speedY = 1
                sprite.start('down')
            }
            sprite.y -= 10
        }

        else if (sprite.nextMove === 'left') {
            sprite.x -= 10
            if (!getWallColition(sprite)) {
                sprite.nextMove = null
                sprite.speedX = -1
                sprite.speedY = 0
                sprite.start('left')
            }
            sprite.x += 10
        }

        else if (sprite.nextMove === 'right') {
            sprite.x += 10
            if (!getWallColition(sprite)) {
                sprite.nextMove = null
                sprite.speedX = 1
                sprite.speedY = 0
                sprite.start('right')
            }
            sprite.x -= 10
        }
    }
}