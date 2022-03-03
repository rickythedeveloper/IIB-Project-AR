import { createSlider } from './generic'

const DEFAULT_VALUE = 0, MIN = -1, MAX = 1, STEP = 0.01

export default class SliderControl {
	element: HTMLInputElement
	onChange: (value: number) => void

	constructor(onChange: (value: number) => void) {
		this.onChange = onChange
		this.element = createSlider(MIN, MAX, DEFAULT_VALUE, STEP)
		this.element.oninput = () => {
			this.onChange(Number(this.element.value))
		}
		this.element.onmouseup = this.reset.bind(this)
		this.element.ontouchend = this.reset.bind(this)

	}

	reset() {
		console.log(this.element)
		console.log(this.element.value)
		this.element.value = `${DEFAULT_VALUE}`
		this.onChange(Number(this.element.value))
	}
}