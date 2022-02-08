# Augmented Reality Visualisation of Simulation Results

## Overview
This software is being produced as part of my fourth year project. The aim of the project is to enable direct comparison between flow simulation and experiments through AR on a browser.

## Website
The latest version of the project (see `gh-pages` branch) is currently published [here](https://rickythedeveloper.github.io/IIB-Project-AR/) using GitHub Pages. Very much incomplete right now.

## Structure
The entry point of the website is `index.html` in the top directory. This HTML file will use the `bundle.js` files in the `build` folder, generated from the `.ts` files in the `src` folder.

## How to Start Developing
1. Clone this repo
1. download part of the simulation data `https://dl.dropboxusercontent.com/s/0mmd7dczala0ljd/values_sch_all.bin` into the `data` folder as `values_sch_all.bin`. This file was too large to store on Git.
1. In the project directory on Terminal, do `npm install` to install Typescript and the type declarations for Three.js
1. `npm run compile` to compile `.ts` files in `src` folder into `.js` files in `build` folder