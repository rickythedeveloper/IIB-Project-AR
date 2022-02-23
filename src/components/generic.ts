export const createSlider = (min: number, max: number, initialValue: number, step: number) => {
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = String(min)
	slider.max = String(max)
	slider.value = String(initialValue)
	slider.step = String(step)
	return slider
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