import visualise from "./utils/visualise.js";
import { createControlPanel } from "./utils/elements.js";
import scan from "./utils/scan.js";
const MODES = {
    SCAN: 'scan',
    SHOW: 'show'
};
let mode = MODES.SCAN;
// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel();
document.body.appendChild(controlPanelWrapper);
const markerNumbers = [0, 1, 2, 3, 4, 5];
let markers = [], markerPositions = [], markerQuaternions = [];
let recordValueInterval, setValueInterval;
const onScanComplete = (pos, quats) => {
    console.log('completed');
    markerPositions = pos;
    markerQuaternions = quats;
    clearInterval(recordValueInterval);
    clearInterval(setValueInterval);
    markers.forEach(marker => {
        marker.clear();
        if (marker.parent !== null)
            marker.parent.remove(marker);
    });
    visualise(controlPanel, markerNumbers, markerPositions, markerQuaternions);
};
switch (mode) {
    case MODES.SHOW:
        visualise(controlPanel, markerNumbers, markerPositions, markerQuaternions);
        break;
    case MODES.SCAN:
        const { recordValueInterval: rvInterval, setValueInterval: svInterval, markers: mks } = scan(markerNumbers, undefined, onScanComplete);
        recordValueInterval = rvInterval;
        setValueInterval = svInterval;
        markers = mks;
        break;
    default:
        throw Error('Mode not selected');
}
//# sourceMappingURL=index.js.map