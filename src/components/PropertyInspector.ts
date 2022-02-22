import { createOption } from '../utils/elements'
import ColorBar from './ColorBar'

interface Property {
	name: string
	min: number
	max: number
}

const NUM_COLORS = 75
const BAR_WIDTH = 30
const BAR_HEIGHT = 150
const ELEMENT_WIDTH = 50

export default class PropertyInspector {
	element: HTMLDivElement
	selectElement: HTMLSelectElement
	colorBar: ColorBar

	constructor(properties: Property[], getColor: (t: number) => string, onChange: (newProperty: Property) => void) {
		this.selectElement = document.createElement('select')
		properties.forEach(p => this.selectElement.appendChild(createOption(p.name, p.name)))
		this.colorBar = new ColorBar(getColor, NUM_COLORS, BAR_WIDTH, BAR_HEIGHT)

		this.selectElement.onchange = (e) => {
			if (e.target) {
				const propertyName = (e.target as HTMLSelectElement).value
				const property = properties.filter(p => p.name === propertyName)[0]
				onChange(property)
			}
		}
		this.selectElement.selectedIndex = 0

		this.element = document.createElement('div')
		this.element.style.width = `${ELEMENT_WIDTH}px`
		this.element.style.display = 'flex'
		this.element.style.flexDirection = 'column'
		this.element.append(this.selectElement, this.colorBar.element)
		this.element.style.pointerEvents = 'auto' // enable mouse events for this element
	}
}