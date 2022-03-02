# Augmented Reality Visualisation of Simulation Results

## Overview
This software is being produced as part of my fourth year project. The aim of the project is to enable direct comparison between flow simulation and experiments through AR on a browser.

## Website
The latest version of the project (see `gh-pages` branch) is currently published [here](https://rickythedeveloper.github.io/IIB-Project-AR/) using GitHub Pages. Very much incomplete right now.

## Structure
The entry point of the website is `index.html` in the top directory. This HTML file will use the `bundle.js` files in the `build` folder, generated from the `.ts` files in the `src` folder.

## How to Start Developing
1. Clone this repo
2. In the project directory on Terminal, do `npm install` to install all dependencies including Typescript and the type declarations for Three.js etc.
3. `npm run build` to compile `.ts` files in `src` folder into `bundle.js` in `build` folder.