export default class ColorBar {
	element: HTMLCanvasElement

	constructor(public getColor: (t: number) => string, public numColors: number, width = 50, height = 200) {
		this.element = document.createElement('canvas')
		this.element.width = width
		this.element.height = height

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
		for (let i = 0; i < this.numColors; i++) {
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