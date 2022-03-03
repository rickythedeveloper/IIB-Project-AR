export const createSlider = (min: number, max: number, initialValue: number, step: number) => {
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = String(min)
	slider.max = String(max)
	slider.value = String(initialValue)
	slider.step = String(step)
	slider.style.pointerEvents = 'auto'
	return slider
}

export const createOption = (value: string, innerText: string) => {
	const option = document.createElement('option')
	option.value = value
	option.innerText = innerText
	return option
}

export interface Option {
	value: string
	label: string
}

export const createDropdown = (options: Option[]): HTMLSelectElement => {
	const select = document.createElement('select')
	options.forEach(option => {
		select.add(createOption(option.value, option.label))
	})
	select.style.pointerEvents = 'auto'
	return select
}

export const createButton = (innerText: string, onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => void)) => {
	const button = document.createElement('button')
	button.innerText = innerText
	button.onclick = onclick
	return button
}