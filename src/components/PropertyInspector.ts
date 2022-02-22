import { createOption } from '../utils/elements'
import ColorBar from './ColorBar'

interface Property {
	name: string
	min: number
	max: number
}

const NUM_COLORS = 100

export default class PropertyInspector {
	element: HTMLDivElement
	selectElement: HTMLSelectElement
	colorBar: ColorBar

	constructor(properties: Property[], getColor: (t: number) => string, onChange: (newProperty: Property) => void) {
		this.selectElement = document.createElement('select')
		properties.forEach(p => this.selectElement.appendChild(createOption(p.name, p.name)))
		this.colorBar = new ColorBar(getColor, NUM_COLORS)

		this.selectElement.onchange = (e) => {
			if (e.target) {
				const propertyName = (e.target as HTMLSelectElement).value
				const property = properties.filter(p => p.name === propertyName)[0]
				onChange(property)
			}
		}
		this.selectElement.selectedIndex = 0

		this.element = document.createElement('div')
		this.element.append(this.selectElement, this.colorBar.element)
	}
}