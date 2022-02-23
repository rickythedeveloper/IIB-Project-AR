import { createOption } from '../utils/elements'
import ColorBarWithScale from './ColorBarWithScale'

interface Property {
	name: string
	min: number
	max: number
}

const BAR_WIDTH = 50
const BAR_HEIGHT = 200
const ELEMENT_WIDTH = 50
const NUM_COLORS = BAR_HEIGHT / 2

export default class PropertyInspector {
	element: HTMLDivElement
	selectElement: HTMLSelectElement
	colorBarWithScale: ColorBarWithScale

	constructor(properties: Property[], getColor: (t: number) => string, onPropertyChange: (newProperty: Property) => void, onRangeChange: (min: number, max: number) => void) {
		this.selectElement = document.createElement('select')
		properties.forEach(p => this.selectElement.appendChild(createOption(p.name, p.name)))
		this.colorBarWithScale = new ColorBarWithScale(getColor, NUM_COLORS, onRangeChange)
		this.colorBarWithScale.colorBar.width = BAR_WIDTH
		this.colorBarWithScale.colorBar.height = BAR_HEIGHT
		const initialProperty = properties[0]
		this.colorBarWithScale.min = initialProperty.min
		this.colorBarWithScale.max = initialProperty.max

		this.selectElement.onchange = (e) => {
			if (e.target) {
				const propertyName = (e.target as HTMLSelectElement).value
				const property = properties.filter(p => p.name === propertyName)[0]
				onPropertyChange(property)
				this.colorBarWithScale.min = property.min
				this.colorBarWithScale.max = property.max
			}
		}
		this.selectElement.selectedIndex = 0

		this.element = document.createElement('div')
		this.element.style.width = `${ELEMENT_WIDTH}px`
		this.element.style.display = 'flex'
		this.element.style.flexDirection = 'column'
		this.element.append(this.selectElement, this.colorBarWithScale.element)
		this.element.style.pointerEvents = 'auto' // enable mouse events for this element
	}
}