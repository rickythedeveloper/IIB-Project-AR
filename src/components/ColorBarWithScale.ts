import ColorBar from './ColorBar'

const generateScaleNumbers = (min: number, max: number): number[] => {
	const diff = max - min
	const mostSignificantScale = 10 ** Math.floor(Math.log10(diff))
	const low = mostSignificantScale * Math.ceil(min / mostSignificantScale)
	const nums: number[] = [min]
	for (let num = low; num < max; num += mostSignificantScale) {
		nums.push(num)
	}
	nums.push(max)
	return nums
}

const LINE_LENGTH = 20

export default class ColorBarWithScale {
	element: HTMLDivElement
	colorBar: ColorBar
	scale: HTMLDivElement
	lineElements: HTMLDivElement[]
	maxElement: HTMLLabelElement
	minElement: HTMLLabelElement
	_max: number
	_min: number
	touchValues: { [touchID: number]: number } = {} // 0 = bottom, 1 = top

	constructor(public getColor: (t: number) => string, public numColors: number, public onChange: (min: number, max: number) => void) {
		this.colorBar = new ColorBar(getColor, numColors)

		this.scale = document.createElement('div')
		this.scale.style.position = 'relative'
		this.scale.style.display = 'flex'
		this.scale.style.flexDirection = 'column'
		this.scale.style.justifyContent = 'space-between'
		this.scale.style.backgroundColor = 'white'

		this.maxElement = document.createElement('label')
		this.minElement = document.createElement('label')
		this.scale.append(this.maxElement, this.minElement)

		this.lineElements = []
		for (let i = 0; i < 10; i++) {
			const line = document.createElement('div')
			this.lineElements.push(line)
			this.scale.append(line)
			line.style.borderBottom = '1px solid black'
			line.style.position = 'absolute'
			line.style.bottom = '0'
			line.style.right = '0'
			line.style.width = `${LINE_LENGTH}px`
			line.style.visibility = 'hidden'
		}

		this._max = 1
		this._min = 0

		this.element = document.createElement('div')
		this.element.style.display = 'flex'
		this.element.style.flexDirection = 'row'
		this.element.style.alignItems = 'stretch'

		this.element.append(this.scale, this.colorBar.element)
		this.colorBar.element.addEventListener('touchstart', (e) => {
			const { y, height } = (e.target as HTMLCanvasElement).getBoundingClientRect()
			for (const touch of e.touches) {
				this.touchValues[touch.identifier] = 1 - (touch.clientY - y) / height
			}
		})
		this.colorBar.element.addEventListener('touchend', (e) => {
			for (const touch of e.changedTouches) {
				const touchID = touch.identifier
				if (touchID in this.touchValues) {
					delete this.touchValues[touchID]
				} else {
					throw Error('touch end for a touch that is not registered')
				}
			}
		})
		this.colorBar.element.addEventListener('touchmove', (e) => {
			const relevantTouches = []
			for (const touch of e.touches) { if (touch.identifier in this.touchValues) relevantTouches.push(touch) }

			if (relevantTouches.length === 1) {
				const touch = relevantTouches[0]
				const { y, height } = (e.target as HTMLCanvasElement).getBoundingClientRect()
				const normalizedValue = 1 - (touch.clientY - y) / height
				const diff = normalizedValue - this.touchValues[touch.identifier]
				const range = this.max - this.min
				const diffScaled = -range * diff
				this.max += diffScaled
				this.min += diffScaled
				this.touchValues[touch.identifier] = normalizedValue
			} else if (relevantTouches.length > 1) {
				const touch1 = relevantTouches[0], touch2 = relevantTouches[1]
				const { y, height } = (e.target as HTMLCanvasElement).getBoundingClientRect()
				const current1 = 1 - (touch1.clientY - y) / height, current2 = 1 - (touch2.clientY - y) / height
				const previous1 = this.touchValues[touch1.identifier], previous2 = this.touchValues[touch2.identifier]
				const normalizedMin = previous1 - (previous2 - previous1) * current1 / (current2 - current1)
				const normalizedMax = previous1 + (previous2 - previous1) * (1 - current1) / (current2 - current1)
				this.min = this.denormalize(normalizedMin)
				this.max = this.denormalize(normalizedMax)
				this.touchValues[touch1.identifier] = current1
				this.touchValues[touch2.identifier] = current2
			}
		})

		setTimeout(() => {
			this.updateScale()
		}, 100)
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

	denormalize = (normalizedValue: number) => this.min + (this.max - this.min) * normalizedValue
	normalize = (value: number) => (value - this.min) / (this.max - this.min)

	updateScale() {
		const nums = generateScaleNumbers(this.min, this.max)
		const normalizedNums = nums.map(n => this.normalize(n))
		const { height } = this.colorBar.element.getBoundingClientRect()
		for (let i = 0; i < this.lineElements.length; i++) {
			this.lineElements[i].style.visibility = i < normalizedNums.length ? 'visible' : 'hidden'
			this.lineElements[i].style.bottom = `${height * normalizedNums[i]}px`
		}

		this.maxElement.innerText = `${this._max.toPrecision(5)}`
		this.minElement.innerText = `${this._min.toPrecision(5)}`
		this.onChange(this._min, this._max)
	}
}