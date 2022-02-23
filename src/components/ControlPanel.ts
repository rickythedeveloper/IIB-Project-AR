const createControlPanel = () => {
	const controlPanelWrapper = document.createElement('div')
	controlPanelWrapper.style.position = 'absolute'
	controlPanelWrapper.style.top = '0'
	controlPanelWrapper.style.left = '0'
	controlPanelWrapper.style.width = '100%'
	controlPanelWrapper.style.height = '100%'
	controlPanelWrapper.style.zIndex = '1000'
	controlPanelWrapper.style.display = 'flex'
	controlPanelWrapper.style.flexDirection = 'column'
	controlPanelWrapper.style.pointerEvents = 'none' // allow under layer (renderer) to be clicked

	const controlPanel = document.createElement('div')
	controlPanel.style.margin = '20px'
	controlPanel.style.flexGrow = '1'
	controlPanelWrapper.appendChild(controlPanel)

	return { controlPanelWrapper, controlPanel }
}

export default createControlPanel