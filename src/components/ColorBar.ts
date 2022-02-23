export default class ColorBar {
	element: HTMLCanvasElement = document.createElement('canvas')

	constructor(public getColor: (t: number) => string, public numColors: number) {}

	get width() { return this.element.width }
	set width(value: number) {
		this.element.width = value
		this.update()
	}
	get height() { return this.element.height }
	set height(value: number) {
		this.element.height = value
		this.update()
	}

	updateColorFunction = (getColor: (t: number) => string) => {
		this.getColor = getColor
		this.update()
	}

	update = () => {
		const canvas = this.element
		const ctx = canvas.getContext('2d')
		if (ctx === null) {
			console.error('ctx is null')
			return
		}
		for (let i = 1; i <= this.numColors; i++) {
			const y = canvas.height * (1 - i / this.numColors) // canvas origin at top left
			const t = i / this.numColors
			ctx.beginPath()
			ctx.fillStyle = this.getColor(t)
			ctx.fillRect(0, y, canvas.width, canvas.height / this.numColors)
			ctx.closePath()
			ctx.fill()
		}
	}
}