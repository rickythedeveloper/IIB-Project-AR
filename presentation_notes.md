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
<!-- - Components
	1. Calibration
		- register the positions of the markers
		- adjust the position of the simulation result
		- only once
	1. Data storage
	1. Projection
		- project the simulation result on the camera feed correctly
	1. Exploration
		- allow users to explore different kinds of data -->

- How it started
	- pic of cube on a marker
- How it's going
	- demo video
- Challenges
	- 
- Tech Deep Dive
	- AR.js to detect marker positions
	- three.js: a JS library that makes it easy to draw 3D content on a webpage. Allows me to avoid most of WebGL.
- What's next
	- calibration
	- save data
	- option to hide data behind the model

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

