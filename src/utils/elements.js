export const createSlider = (min, max, initialValue, step) => {
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = min
	slider.max = max
	slider.value = initialValue
	slider.step = step
	return slider
}

export const createControlPanel = () => {
	const controlPanelWrapper = document.createElement('div')
	controlPanelWrapper.style.position = 'absolute'
	controlPanelWrapper.style.top = 0
	controlPanelWrapper.style.left = 0
	controlPanelWrapper.style.width = '100%'
	controlPanelWrapper.style.height = '100%'
	controlPanelWrapper.style.zIndex = 1000
	controlPanelWrapper.style.display = 'flex'
	controlPanelWrapper.style.flexDirection = 'column'

	const controlPanel = document.createElement('div')
	controlPanel.style.margin = '20px'
	controlPanel.style.flexGrow = 1;
	controlPanelWrapper.appendChild(controlPanel)

	return { controlPanelWrapper, controlPanel }
}

export const createOption = (value, innerText) => {
	const option = document.createElement('option')
	option.value = value
	option.innerText = innerText
	return option
}

export const createButton = (innerText, onclick) => {
	const button = document.createElement('button')
	button.innerText = innerText
	button.onclick = onclick
	return button
}

export const createBarcodeMarkerElement = (value) => {
	const markerElement = document.createElement('a-marker')
	markerElement.setAttribute('type', 'barcode')
	markerElement.setAttribute('value', value)
	return markerElement
}