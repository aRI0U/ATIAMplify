# ATIAMplify: Real-time effects on voice with Web Audio API

This project has been realized by Joshua Tuckey, Pierre Warion and Alain Riou for the Web Audio course of master ATIAM. It is partially based on [this video](https://www.youtube.com/watch?v=eEeUFB1iIDo&ab_channel=WebDevSimplified).



## Setup

Clone this repository, then open a terminal and run `serve`. Then open [http://localhost:5000](http://localhost:5000) in a navigator that supports Web Audio to play with the different effects.




## Usage

Play with the sliders to change the parameters of the different effects.



## Code description

This project implements the following effects:

- equalizer (bass, mid and treble control)
- distorsion
- delay
- flanger
- reverberation
- "robotic" voice effect

### Real-time pitch detector (aborted)

We tried to implement a real-time pitch detector, however it miserably failed.

In order to estimate the pitch, we tried to use the spectral product method but it did not manage to determine the fundamental frequency of the signal. We assume that the produced is not harmonic enough so that such method works.

In `script.js` one can find several (unused) functions originally written for this purpose: `estimateFundamental()`, `computePitchRatio()` and `refreshPitchRatio()`.

We also tried to use the AMDF implementation from [this repository](https://github.com/peterkhayes/pitchfinder) but it were no more successful. Hence the file `robotic-bundle.js` which is the [browserified](http://browserify.org/) version of `robotic.js`.



## TODOs

*As of now, the different effects lie on various branches. It will be merged as soon as possible.*

