export const createSlider = (min: number, max: number, initialValue: number, step: number) => {
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = String(min)
	slider.max = String(max)
	slider.value = String(initialValue)
	slider.step = String(step)
	return slider
}

export const createControlPanel = () => {
	const controlPanelWrapper = document.createElement('div')
	controlPanelWrapper.style.position = 'absolute'
	controlPanelWrapper.style.top = '0'
	controlPanelWrapper.style.left = '0'
	controlPanelWrapper.style.width = '100%'
	controlPanelWrapper.style.height = '100%'
	controlPanelWrapper.style.zIndex = '1000'
	controlPanelWrapper.style.display = 'flex'
	controlPanelWrapper.style.flexDirection = 'column'

	const controlPanel = document.createElement('div')
	controlPanel.style.margin = '20px'
	controlPanel.style.flexGrow = '1'
	controlPanelWrapper.appendChild(controlPanel)

	return { controlPanelWrapper, controlPanel }
}

export const createOption = (value: string, innerText: string) => {
	const option = document.createElement('option')
	option.value = value
	option.innerText = innerText
	return option
}

export const createButton = (innerText: string, onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => void)) => {
	const button = document.createElement('button')
	button.innerText = innerText
	button.onclick = onclick
	return button
}

export const createBarcodeMarkerElement = (value: number) => {
	const markerElement = document.createElement('a-marker')
	markerElement.setAttribute('type', 'barcode')
	markerElement.setAttribute('value', String(value))
	return markerElement
}