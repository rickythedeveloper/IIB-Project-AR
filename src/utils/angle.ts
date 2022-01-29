
/**
 * atan angle between 0 and 2 pi
 */
export const atanAngle = (x: number, y: number): number => {
	if (x === 0) return (y > 0 ? 1/2 : 3/2) * Math.PI
	const angle = Math.atan(y/x)
	if (x > 0) return angle + (y >= 0 ? 0 : 2 * Math.PI)
	return angle + Math.PI
}