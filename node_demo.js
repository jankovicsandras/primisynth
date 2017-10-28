"use strict";

// filesystem
var fs = require('fs');

// primisynth_core
var ps = require( __dirname + '/primisynth_core.js' );

// synth definition
var syn = {
	waveforms:[  [0, [[0,1],[0.001,1],[0.999,-1],[1,-1]] ]  ],
	voices : [ [0.33, [[0.5,0]]], [0.33, [[0.5,0.01]]], [0.33, [[0.5,-0.01]]] ],
	pan:[[0.125,0.5],[0.375,-0.5],[0.625,0.5],[0.875,-0.5]]
};

// generating sequence
var seq = ps.getsequence('goa2','rnd_1/2_1/4');

// effects
var fx = ps.effectpresets['test'];

// rendering
var loopwave = ps.renderloop( syn, seq, 440, fx );

// writing to file
fs.writeFile(
	__dirname + '/test.wav', // Output file path
	new Buffer(ps.getUint8ArrayWAV(loopwave)),
	function(err){ if(err){ throw err; } console.log( __dirname + '/test.wav was saved!' ); }
);
