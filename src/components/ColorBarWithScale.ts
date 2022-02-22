import ColorBar from './ColorBar'

// const generateScaleNumbers = (min: number, max: number): number[] => {
// 	const diff = max - min
// 	const mostSignificantScale = 10 ** Math.floor(Math.log10(diff))
// 	const low = mostSignificantScale * Math.ceil(Math.round(min / mostSignificantScale))
// 	const nums: number[] = [min]
// 	for (let num = low; num < max; num += mostSignificantScale) {
// 		nums.push(num)
// 	}
// 	nums.push(max)
// 	return nums
// }

export default class ColorBarWithScale {
	element: HTMLDivElement
	colorBar: ColorBar
	scale: HTMLDivElement
	maxElement: HTMLLabelElement
	minElement: HTMLLabelElement
	_max: number
	_min: number
	touchValues: { [touchID: number]: number } = {} // 0 = bottom, 1 = top

	constructor(public getColor: (t: number) => string, public numColors: number, public onChange: (min: number, max: number) => void) {
		this.colorBar = new ColorBar(getColor, numColors)

		this.scale = document.createElement('div')
		this.scale.style.display = 'flex'
		this.scale.style.flexDirection = 'column'
		this.scale.style.justifyContent = 'space-between'

		this.maxElement = document.createElement('label')
		this.minElement = document.createElement('label')
		this.scale.append(this.maxElement, this.minElement)

		this._max = 10
		this._min = 0

		this.element = document.createElement('div')
		this.element.style.display = 'flex'
		this.element.style.flexDirection = 'row'
		this.element.style.alignItems = 'stretch'

		this.element.append(this.scale, this.colorBar.element)
		this.colorBar.element.addEventListener('touchstart', (e) => {
			const { y, height } = (e.target as HTMLCanvasElement).getBoundingClientRect()
			const normalizedValue = 1 - (e.touches[0].clientY - y) / height
			this.touchValues[e.touches[0].identifier] = normalizedValue
		})
		this.colorBar.element.addEventListener('touchend', (e) => {
			const touchID = e.touches[0].identifier
			if (touchID in this.touchValues) {
				delete this.touchValues[touchID]
			} else {
				throw Error('touch end for a touch that is not registered')
			}
		})
		this.colorBar.element.addEventListener('touchmove', (e) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0]
				const { y, height } = (e.target as HTMLCanvasElement).getBoundingClientRect()
				const normalizedValue = 1 - (touch.clientY - y) / height
				console.log('normalised', normalizedValue)
				const diff = normalizedValue - this.touchValues[touch.identifier]
				const range = this._max - this._min
				const diffScaled = -range * diff
				this._max += diffScaled
				this._min += diffScaled
				this.touchValues[touch.identifier] = normalizedValue
				this.updateScale()
			} else if (e.touches.length > 1) {
				const touch1 = e.touches[0], touch2 = e.touches[1]
				// TODO
			}
		})

		this.updateScale()
	}

	get min() { return this._min }
	set min(value: number) {
		this._min = value
		this.updateScale()
	}

	get max() { return this._max }
	set max(value: number) {
		this._max = value
		this.updateScale()
	}

	updateScale() {
		this.maxElement.innerText = `${this._max.toPrecision(5)}`
		this.minElement.innerText = `${this._min.toPrecision(5)}`
		this.onChange(this._min, this._max)
	}
}