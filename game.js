import Group from "./group.js"

export default class Game {
    constructor(props = {}) {
        this.canvas = document.createElement('canvas')
        this.context = this.canvas.getContext('2d')
        this.stage = new Group

        this.canvas.width = props.width ?? 50
        this.canvas.height = props.height ?? 50
        this.background = props.background ?? 'black'

        this.pTimestamp = 0
        requestAnimationFrame(x => this.render(x))
    }

    update() { }

    clearCanvas() {
        this.canvas.width = this.canvas.width
    }

    drawBackground() {
        this.context.beginPath()
        this.context.rect(0, 0, this.canvas.width, this.canvas.height)
        this.context.fillStyle = this.background
        this.context.fill()
    }

    render(timestamp) {
        requestAnimationFrame(x => this.render(x))

        const delta = timestamp - this.pTimestamp
        this.pTimestamp = timestamp

        this.update()
        this.stage.update(delta)

        this.clearCanvas()
        this.drawBackground()

        this.stage.draw(this.context)
    }
}