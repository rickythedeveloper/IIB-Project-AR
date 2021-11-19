import { scan, show } from "./utils/index.js";

const MODES = {
	SCAN: 'scan',
	SHOW: 'show'
};

let mode = MODES.SHOW

switch (mode) {
	case MODES.SHOW:
		show()
		break
	case MODES.SCAN:
		scan()
		break
	default:
		throw Error('Mode not selected')
}
