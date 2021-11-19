# Marker-Based Augmented Reality for the Visualisation of Simulation Results

## Structure
- intro / motivation
	- not easy to demonstrate your simulation (show your screen)
	- at a conference, 
	- or to show your friends and colleagues
	- your computer screen might not cut it
- Solution
	- we can use browser-baded AR!
	- browser-based makes it more accessible
	- technology that doesnt rely on lidar sensors.
	- what is AR? just like IKEA app
	- users interact with and explore the simulation results 
	- users understand the big picture
- Solution pt 2
	- The difference between this and IKEA is that the chair can appear anywhere in your room, but we want the sim results to always appear in the right place
	- We can use marker-based AR to ensure this!
- Visualisation - how it started
	- pic of cube on a marker
	- AR.js to detect marker positions
	- three.js: a JS library that makes it easy to draw 3D content on a webpage. Allows me to avoid most of WebGL.
- Visualisation - how it's going (demo video)
- Visualisation - assumptions / limitations
	- given marker positions and orientations
	- given object position and orientation
- Scanning
	- scan the markers 
	- store the relative positions and orientations w.r.t. marker 0 (show marker 0)
	- done only once by the researcher
- Scanning (demo video)
- Workflow
	- Scanning - marker positions and orientations
	- Calibration - object position and orientation
		- explain what this would do
	- Visualisation - visualise
- What's next
	- Calibration
	- Use raycasting to hide data behind the model
	- Admin...
		- storing data
		- make it into an actually usable website
		- user interface for exploring different kinds of data (pressure, velocity etc)
		- cope with different file formats for simulation results

## intro
## motivation
- easier to show to non-technical people / people who are not familiar with your model

## challenges
- native function to preserve the world coordinates not working as we would've liked

## demo
## more challanges / work
- marker positions - scanning would be a good idea?
- inaccuracy?
- save callibration data / server stuff
- hiding data behind the model

