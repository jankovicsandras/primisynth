
////////////////////////////////////////////////////
//
//  Synthesizer
//
////////////////////////////////////////////////////

var samplerate = 48000, bpm = 128, beatlength = 60/bpm, ticksperbeat = 8, beatsperloop = 8;
var qsplerrorcnt = 0;

// Quadratic spline y value lookup https://en.wikipedia.org/wiki/Quadratic_spline
function qspl(controlpoints, x){
	
	// trivial case
	if(controlpoints.length===1){ return controlpoints[0][1]; }
	
	var epsilon = 0.000001, tries, cps = [], idx1, idx2, idx3, idx4, dx1, dx2, dx3, dx4 ;
	
	// x normalization
	x = x - Math.floor(x);
	
	// neighbor search
	for(var i=0; i <= controlpoints.length; i++){
		idx1 = i-2; dx1 = idx1 < 0 ? -1 : 0; idx1 = (idx1 + controlpoints.length)%controlpoints.length;
		idx2 = i-1; dx2 = idx2 < 0 ? -1 : 0; idx2 = (idx2 + controlpoints.length)%controlpoints.length;
		idx3 = i  ; dx3 = idx3 > controlpoints.length-1 ? 1 : 0; idx3 = idx3%controlpoints.length;
		idx4 = i+1; dx4 = idx4 > controlpoints.length-1 ? 1 : 0; idx4 = idx4%controlpoints.length;
		cps = [
		       [ controlpoints[idx1][0]+dx1, controlpoints[idx1][1] ],
		       [ controlpoints[idx2][0]+dx2, controlpoints[idx2][1] ],
		       [ controlpoints[idx3][0]+dx3, controlpoints[idx3][1] ],
		       [ controlpoints[idx4][0]+dx4, controlpoints[idx4][1] ]
		       ];
		if( (cps[0][0] <= x ) && 
			(cps[1][0] <= x ) &&
			(cps[2][0] >= x ) &&
			(cps[3][0] >= x )
		){ break; }
	}
	
	// middle of neighbors
	var mx = (cps[1][0] + cps[2][0])/2,
		my = (cps[1][1] + cps[2][1])/2,
		mx2, my2;
	
	if( x < mx ){ // left side spline
		mx2 = (cps[0][0] + cps[1][0])/2;
		my2 = (cps[0][1] + cps[1][1])/2;
		if(mx===mx2){ return cps[1][1]; }
		
		// iterative search for t (spline progress) which yields closest to x and then return y
		var mint = 0, maxt = 1, isok = false, t, t1, t2, t3, px;
		tries = 20;
		while( tries > 0 ){
			t = (mint+maxt)/2; t1=(1-t)*(1-t); t2=2*(1-t)*t; t3=t*t;
			px = t1 * mx2 + t2 * cps[1][0] + t3 * mx;
			if(px>x+epsilon){
				maxt=t; tries--; if(tries===0){ qsplerrorcnt++; }
			}else if(px<x-epsilon){
				mint=t; tries--; if(tries===0){ qsplerrorcnt++; }
			}else{
				tries = 0;
			}
		}
		return t1 * my2 + t2 * cps[1][1] + t3 * my;
		
	}else{ // right side spline
		mx2 = (cps[2][0] + cps[3][0])/2;
		my2 = (cps[2][1] + cps[3][1])/2;
		if(mx===mx2){ return cps[2][1]; }
		
		// iterative search for t (spline progress) which yields closest to x and then return y
		var mint = 0, maxt = 1, isok = false, t, t1, t2, t3, px;
		tries = 20;
		while( tries > 0 ){
			t = (mint+maxt)/2; t1=(1-t)*(1-t); t2=2*(1-t)*t; t3=t*t;
			px = t1 * mx + t2 * cps[2][0] + t3 * mx2;
			if(px>x+epsilon){
				maxt=t; tries--; if(tries===0){ qsplerrorcnt++; }
			}else if(px<x-epsilon){
				mint=t; tries--; if(tries===0){ qsplerrorcnt++; }
			}else{
				tries = 0;
			}
		}
	
		return t1 * my + t2 * cps[2][1] + t3 * my2;
	}// End of right side spline

}// End of qspl()


// mono wave from controlpoints
function qwave(controlpoints, samplenum){
	var starttime = Date.now();
	var wave = []; if(samplenum<1){ return wave; }
	for(var i=0; i<samplenum; i++){
		wave[i] = qspl(controlpoints,i/samplenum);
	}// End of sample loop
	return wave;
}// End of qwave()


// controlpoints normalization
function normalizecontrolpoints(controlpoints){
	// sort
	controlpoints.sort( function(a,b){return a[0]-b[0];} );
	// remove outliers
	for(var i=controlpoints.length-1; i >= 0; i--){
		if( (controlpoints[i][0] < 0) || (controlpoints[i][0] > 1) ){ controlpoints.splice(i, 1); }
	}
	// check length
	if(controlpoints.length<1){ controlpoints = [[0.5,1]]; }
}// End of normalizecontrolpoints()


//Adding control points before and after [0;1] for calculation
function normalizesynth(ob){
	
	var o = JSON.parse(JSON.stringify(ob));
	
	if(!o){ o = {}; }
	
	// Defaults
	if(!o.waveforms){ o.waveforms = [ [0, [[0.25, 1], [0.75, -1]] ] ]; }
	if(o.waveforms.length<1){ o.waveforms = [ [0, [[0.25, 1], [0.75, -1]] ] ]; }
	if(!o.voices){ o.voices = [ [1,[[0.5, 0]]] ]; }
	if(o.voices.length<1){ o.voices = [ [1,[[0.5, 0]]] ]; }
	if(!o.predrive){ o.predrive = [[0.5, 1]]; }
	if(!o.envelope){ o.envelope = [[0,0],[0.001,1],[1,0]]; }
	if(!o.pan){ o.pan = [[0.5, 0]]; }
	if(!o.defaultlength){ o.defaultlength = 1; }
	if(!o.defaultbasefreq){ o.defaultbasefreq = 440; }
	
	// Waveforms
	for(var i=0; i<o.waveforms.length; i++){ normalizecontrolpoints(o.waveforms[i][1]); }
	o.waveforms.sort( function(a,b){return a[0]-b[0];} );
	
	// making sure all waveforms has the same number of controlpoints
	var ml = 0, dml = 0;
	for(var i=0; i<o.waveforms.length; i++){ if(o.waveforms[i][1].length>ml){ ml = o.waveforms[i][1].length;} }
	for(var i=0; i<o.waveforms.length; i++){ 
		dml = ml-o.waveforms[i][1].length;
		for(var j=0; j<dml; j++){ o.waveforms[i][1].push([0.5, 0]); }
	}
	
	// Voices
	for(var i=0; i<o.voices.length; i++){ normalizecontrolpoints(o.voices[i][1]); }
	
	// Pre-drive
	normalizecontrolpoints(o.predrive);
	
	// Envelope
	normalizecontrolpoints(o.envelope);
	
	// Pan
	normalizecontrolpoints(o.pan);
	
	return o;
	
}// End of normalizesynth()


//Synthesizer
function synthtowave(o, samplenum, basefreq){
	// Start timer, reset qspl error counter 
	var starttime = Date.now();
	qsplerrorcnt = 0;
	
	// Checking defaults, starting timer and initializing wave arrays
	if(!samplenum){ samplenum = o.defaultlength*beatlength*samplerate || samplerate; }
	if(!basefreq){ basefreq = o.defaultbasefreq || 440; }
	
	var wave = [[],[]]; if(samplenum<1){ return wave; }
	
	// Initializing progress, voice phases, and signal accumulator
	var progress = 0, voicephases = [], voicewfs = [], vtmp, sig = 0, thispan, predr, wfprogress, leftwfweight, rightwfweight, leftwfidx=0, rightwfidx=0, wflimits = [];
	for(var i=0; i<o.voices.length; i++){ voicephases[i] = 0; voicewfs[i] = o.waveforms[0][1].slice(0); }
	
	// Sample loop
	for(var i=0; i<samplenum; i++){
		
		// progress as [0;1]
		progress = i/samplenum;
		
		// signal is a sum of the current voice values
		// voice phases change according to progress, basefreq and the voices (frequency changes)
		// a new waveform is created for each voice when the previous is over
		sig = 0;
		for(var j=0; j<o.voices.length; j++){
			
			// accumulate voice values
			sig += qspl(voicewfs[j],voicephases[j]) * o.voices[j][0];
			
			// voice phase progress
			vtmp = voicephases[j];
			voicephases[j] += basefreq * (1+qspl(o.voices[j][1],progress)) / samplerate;
			
			// if a new wave starts
			if(Math.floor(vtmp)!==Math.floor(voicephases[j])){
				
				// waveform progress: left and right waveforms and weights
				for(var k=0; k<o.waveforms.length; k++){
					if( progress >= o.waveforms[k][0] ){ leftwfidx = k; rightwfidx = k; }
					if( o.waveforms[leftwfidx+1] && progress < o.waveforms[leftwfidx+1][0] ){ rightwfidx = leftwfidx+1; }
					if(leftwfidx===rightwfidx){ leftwfweight = 1; rightwfweight = 0; }else{
						leftwfweight = (o.waveforms[rightwfidx][0]-progress) / (o.waveforms[rightwfidx][0]-o.waveforms[leftwfidx][0]);
						rightwfweight = (progress-o.waveforms[leftwfidx][0]) / (o.waveforms[rightwfidx][0]-o.waveforms[leftwfidx][0]);
					}
				}
				// this voice's new waveform is linearly interpolated
				for(var k=0; k<voicewfs[j].length; k++){
					voicewfs[j][k] = [
						leftwfweight*o.waveforms[leftwfidx][1][k][0] + rightwfweight*o.waveforms[rightwfidx][1][k][0] ,
						leftwfweight*o.waveforms[leftwfidx][1][k][1] + rightwfweight*o.waveforms[rightwfidx][1][k][1]
					];
				}
				
			}// End of new wave
			
		}// End of voices loop
		
		// Pre-drive: mirroring signal into -predr <= sig <= predr range
		predr = qspl(o.predrive,progress); if(predr<0.001){ predr = 0.001; }
		if( (sig>predr) || (sig<-predr) ){ sig = ( sig % predr ) * ( Math.floor(sig/predr) % 2 === 0 ? 1 : -1 ); }
		
		// envelope
		sig *= qspl(o.envelope,progress);
		
		// wave is left and right panned signals
		thispan = qspl(o.pan,progress);
		wave[0][i] = (1+thispan) * sig;
		wave[1][i] = (1-thispan) * sig;
		
	}// End of sample loop
	
	// Log and return
	log('synthtowave() took '+(Date.now()-starttime)+' ms. qspl() errors: '+qsplerrorcnt);
	return wave;
	
}// End of synthtowave()


// Random helpers
function rnd128(){ return Math.floor(Math.random()*8)/8; }
function rnd8(){ return 2+Math.floor(Math.random()*6); }


// Random synth preset
function randpreset(){
	var s = { waveforms:[], voices:[], predrive:[], envelope:[], pan:[], defaultlength: 1, defaultbasefreq: 220 };
	
	// Waveforms
	var r = Math.floor(Math.random()*4)+1, r2s = [], r3 = rnd8(); for(var i=0; i<r; i++){ r2s[i] = Math.random(); } r2s.sort(function(a,b){return a-b;});
	for(var i=0;i<r; i++){
		s.waveforms[i] = [r2s[i],[]];
		for(var j=0; j<r3; j++){ s.waveforms[i][1].push([rnd128(), 2*rnd128()-1]); }
	}
	
	// Voices
	r2 = Math.floor(Math.random()*4)+1;
	for(var j=0; j<r2; j++){
		var fc1 = [];
		r = rnd8();
		if(rnd128()<0.3){
			for(var i=0;i<r; i++){ fc1.push([rnd128(), (rnd128()<0.3?rnd128()-0.5:0)]); }
		}else{
			fc1.push([0.5,rnd128()/50]);
		}
		s.voices.push([rnd8()/2,fc1]);
	}
	
	// Pre-drive
	r = rnd8();
	for(var i=0;i<r; i++){ s.predrive.push([rnd128(), rnd128()]); }
	
	// Envelope 
	r = rnd8();
	s.envelope.push([0,0]);
	for(var i=0;i<r; i++){ s.envelope.push([rnd128(), rnd128()]); }
	s.envelope.push([1,0]);
	
	// Pan
	r= rnd8();
	for(var i=0;i<r; i++){ s.pan.push([rnd128(), 2*rnd128()-1]); }
	
	// Length
	s.defaultlength = 1;
	
	// Basefreq
	s.defaultbasefreq = 440;
	
	return s;
	
}// End of randpreset()


////////////////////////////////////////////////////
//
//  Sequencer / Mixer
//
////////////////////////////////////////////////////

var harmconst = Math.pow(2,1/12), tuning = {};

var melodypresets = {// [ [chance,note], [chance,note], ...]
		monotone: [[1,0]],
		goa0: [[4,0],[1,1],[1,-2]],
		goa1: [[4,0],[1,1],[1,4],[2,7],[1,10],[3,12]],
		goa2: [[4,0],[1,1],[1,4],[2,7],[1,10],[3,12], [3,-12],[1,-5],[2,-2]],
		octaves: [[3,0],[1,12],[1,-12]],
		ditonic1: [[2,0],[1,7],[1,12]],
		ditonic2: [[2,0],[1,7],[1,12],[1,-5],[1,-12]],
		tritonic1: [[2,0],[1,7],[1,10],[1,12]],
		tritonic2: [[2,0],[1,7],[1,10],[1,12],[1,-12],[1,-5],[1,-2]],
		chromatic1: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[1,11],[1,12]],
		chromatic2: [[1,-12],[1,-11],[1,-10],[1,-9],[1,-8],[1,-7],[1,-6],[1,-5],[1,-4],[1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[1,11],[1,12]]
};

var effectpresets = {
		'':[],
		'echo1':[ { delaynum:4, delaytime:3/4, delayamp:1/3 } ],
		'echo2':[ { delaynum:8, delaytime:2/4, delayamp:1/8 } ],
		'echo+normalize1': [ { delaynum:4, delaytime:3/4, delayamp:1/3 }, { normalize:true }, { center:true } ],
		'normalize1':[ { normalize:true }, { center:true } ],
		'overdrive+echo':[ { overdrive:0.25 }, { amp:2 }, { delaynum:4, delaytime:3/4, delayamp:1/3 } ],
		'test':[ { overdrive:0.25 }, { amp:2 }, { pancontrolpoints:[[0.125,2],[0.375,-2],[0.625,2],[0.875,-2]] }, { delaynum:4, delaytime:3/4, delayamp:1/3 } ]
};

// Get a weighted random note from a scale
function getrandomnote(mpreset){
	if(melodypresets[mpreset]){
		var acc=0; for(var i=0;i<melodypresets[mpreset].length;i++){ acc += melodypresets[mpreset][i][0]; }
		var rn = Math.random()*acc; acc = 0;
		for(var i=0;i<melodypresets[mpreset].length;i++){ 
			acc += melodypresets[mpreset][i][0];
			if(acc>rn){ return melodypresets[mpreset][i][1]; }
		}
		return melodypresets[mpreset][0][1];
	}else{ return 0; }
}

// Get a frequency for a note ( 12ET tuning for now )
function notetofreq(basefreq,note){
	var freq = basefreq || 440;
	if(note>=0){ 
		for(var i=0; i<note; i++){ freq *= harmconst; }
		return freq; 
	}else{
		for(var i=0; i>note; i--){ freq /= harmconst; }
		return freq; 
	}
}


// TODO: only 12 ET now
function gettuning(){
	var alf = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
	for(var j=0; j<11; j++){
		for(var i=0; i<12; i++){
			tuning[ (alf[i]+j) ] = notetofreq( 261.6255653, (j-4)*12+i ); // C4 = 261.6255653 Hz
		}
	}
}


// apply notetofreq() on the sequence
function sequencenotestofreqs(basefreq,sq){ 
	var sq2 = [];
	for(var i=0; i < sq.length; i++){ 
		sq2.push([ sq[i][0], sq[i][1], notetofreq(basefreq,sq[i][2]) ]); 
	}
	return sq2;
}


// generating sequence pattern
var rhythmpresets = {
	'': function(){ var r = []; for(var i=0;i<beatsperloop;i++){ r.push([i,1]); } return r; },
	'1*8': function(){ var r = []; for(var i=0;i<beatsperloop/8;i++){ r.push([i*8,8]); } return r; }, 
	'2*4': function(){ var r = []; for(var i=0;i<beatsperloop/4;i++){ r.push([i*4,4]); } return r; },
	'4*2': function(){ var r = []; for(var i=0;i<beatsperloop/2;i++){ r.push([i*2,2]); } return r; },
	'4*1': function(){ var r = []; for(var i=0;i<beatsperloop/2;i++){ r.push([i*2,1]); } return r; },
	'8*1': function(){ var r = []; for(var i=0;i<beatsperloop;i++){ r.push([i,1]); } return r; },
	'8*3/4': function(){ var r = []; for(var i=0;i<beatsperloop;i++){ r.push([i,3/4]); } return r; },
	'8*1/2': function(){ var r = []; for(var i=0;i<beatsperloop;i++){ r.push([i,1/2]); } return r; },
	'16*1/2': function(){ var r = []; for(var i=0;i<beatsperloop*2;i++){ r.push([i/2,1/2]); } return r; },
	'16*3/8': function(){ var r=[]; for(var i=0;i<beatsperloop*2;i++){ r.push([i/2,3/8]); } return r; },
	'16*1/4': function(){ var r=[]; for(var i=0;i<beatsperloop*2;i++){ r.push([i/2,1/4]); } return r; },
	'24*1/3': function(){ var r=[]; for(var i=0;i<beatsperloop*3;i++){ r.push([i/3,1/3]); } return r; },
	'32*1/4': function(){ var r=[]; for(var i=0;i<beatsperloop*4;i++){ r.push([i/4,1/4]); } return r; },
	'32*1/8': function(){ var r=[]; for(var i=0;i<beatsperloop*4;i++){ r.push([i/4,1/8]); } return r; },
	'syncope1': function(){ var r=[]; for(var i=0;i<beatsperloop;i++){ if(i%2===0){ r.push([i,1/4]);r.push([i+1/4,1/2]);r.push([i+3/4,1/4]); }else{ r.push([i,1/2]);r.push([i+1/2,1/4]);r.push([i+3/4,1/4]); } } return r; },
	'bass1': function(){ var r = []; for(var i=0;i<beatsperloop;i++){ r.push([i+1/2,1/2]); } return r; },
	'bass2': function(){ var r=[]; for(var i=0;i<beatsperloop;i++){ if(i%2===0){ r.push([i+1/4,1/4]);r.push([i+3/4,1/4]); }else{ r.push([i+1/2,1/2]); } } return r; },
	'rnd_2_1': function(){ var r=[],l=0; for(var i=1; i<=beatsperloop; i++){ if(Math.random()<1/2){i++;}if(i>beatsperloop){i=beatsperloop;} r.push([l,i-l]); l=i; } return r;},
	'rnd_1_1/2': function(){ var r=[],l=0; for(var i=1; i<=beatsperloop*2; i++){ if(Math.random()<1/2){i++;}if(i>beatsperloop*2){i=beatsperloop*2;} r.push([l/2,(i-l)/2]); l=i; } return r;},
	'rnd_1/2_1/4': function(){ var r=[],l=0; for(var i=1; i<=beatsperloop*4; i++){ if(Math.random()<1/2){i++;}if(i>beatsperloop*4){i=beatsperloop*4;} r.push([l/4,(i-l)/4]); l=i; } return r;},
	'rnd_1/4_1/8': function(){ var r=[],l=0; for(var i=1; i<=beatsperloop*8; i++){ if(Math.random()<1/2){i++;}if(i>beatsperloop*8){i=beatsperloop*8;} r.push([l/8,(i-l)/8]); l=i; } return r;},
	'snare1': function(){ var r = []; for(var i=0;i<beatsperloop/2;i++){ r.push([i*2+1,1]); } return r; },
	'spray_8*rnd': function(){ var r = [], b, l; for(var i=0;i<8;i++){ b=beatsperloop; l=1; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop); l=Math.floor(Math.random()*(beatsperloop-1))+1; } r.push([b,l]); } return r; },
	'spray_16*rnd': function(){ var r = [], b, l; for(var i=0;i<16;i++){ b=beatsperloop; l=1; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*2)/2; l=Math.floor(Math.random()*(beatsperloop-1))+1; } r.push([b,l]); } return r; },
	'spray_32*rnd': function(){ var r = [], b, l; for(var i=0;i<32;i++){ b=beatsperloop; l=1; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*4)/2; l=Math.floor(Math.random()*(beatsperloop-1))+1; } r.push([b,l]); } return r; },
	'spray_8*1': function(){ var r = [], b, l; for(var i=0;i<8;i++){ b=beatsperloop; l=1; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop); } r.push([b,l]); } return r; },
	'spray_16*1/2': function(){ var r = [], b, l; for(var i=0;i<16;i++){ b=beatsperloop; l=1/2; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*2)/2; } r.push([b,l]); } return r; },
	'spray_32*1/4': function(){ var r = [], b, l; for(var i=0;i<32;i++){ b=beatsperloop; l=1/4; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*4)/4; } r.push([b,l]); } return r; },
	'spray_8*2': function(){ var r = [], b, l; for(var i=0;i<8;i++){ b=beatsperloop; l=2; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop); } r.push([b,l]); } return r; },
	'spray_16*1': function(){ var r = [], b, l; for(var i=0;i<16;i++){ b=beatsperloop; l=1; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*2)/2; } r.push([b,l]); } return r; },
	'spray_32*1/2': function(){ var r = [], b, l; for(var i=0;i<32;i++){ b=beatsperloop; l=1/2; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*4)/4; } r.push([b,l]); } return r; },
	'spray_64*1/4': function(){ var r = [], b, l; for(var i=0;i<64;i++){ b=beatsperloop; l=1/4; while(b+l>beatsperloop){ b=Math.floor(Math.random()*beatsperloop*8)/8; } r.push([b,l]); } return r; }
};


// Combine rhytmh and melody to get a sequence
function getsequence(mpr,rpr){
	var sq = (rhythmpresets[rpr])();
	for(var i=0; i<sq.length; i++){ sq[i][2] = getrandomnote(mpr); }
	return sq;
}


//Simple sequencer and mixer
function sequencer(syn,seq){
	var starttime = Date.now(), startidx=0;
	
	var seqend = 0; for(var i=0; i<seq.length; i++){ if( seq[i][0]+seq[i][1] > seqend){ seqend = seq[i][0]+seq[i][1]; } }

	// init wave
	var lwave = [[],[]]; for(var i=0; i < seqend*beatlength*samplerate; i++){ lwave[0][i] = 0; lwave[1][i] = 0; }
	
	// sequence loop
	for(var i=0; i < seq.length; i++){
		
		// render note
		var thissynw = synthtowave( syn, seq[i][1]*beatlength*samplerate, seq[i][2] );
		
		// mix
		startidx = Math.floor( seq[i][0] * beatlength * samplerate );
		for(var j=0; j<thissynw[0].length; j++){
			if(startidx+j < lwave[0].length){ lwave[0][startidx+j] += thissynw[0][j]; lwave[1][startidx+j] += thissynw[1][j]; }
		}
		
	}// End of sequence loop
	
	log('sequencer() took '+(Date.now()-starttime)+' ms.');
	return lwave;
	
}// End of sequencer()


function renderloop(syn,seq,basefreq,fx){
	
	return wavefx( // applying effects to wave and returning wave
			
		sequencer( // rendering sequence with synth
			normalizesynth( syn ), // normalizing synth
			sequencenotestofreqs( basefreq, seq ) // converting sequence notes to frequencies
		),
		
		fx // effects object
	);
	
}// End of renderloop()

//////////////////////////////////////////////////////////////////
//
//  Webaudio and WAV processing
//
//////////////////////////////////////////////////////////////////

//Webaudio variables
if(typeof window !== 'undefined'){
	
	window.absn; // absn = AudioBufferSourceNode
	window.actx = new (window.AudioContext || window.webkitAudioContext)();
	window.isplaying = false; 
	
	//start / stop wave playback
	window.playpause = function(wave){
		if(isplaying){
			absn.stop();
			isplaying = false;
		}else{
			var wl = wave[0].length;
			var abuf = actx.createBuffer(2, wl, samplerate);
			var left = abuf.getChannelData(0), right = abuf.getChannelData(1); 
			for(var i=0; i<wl; i++){ left[i] = wave[0][i]; right[i] = wave[1][i]; }
			absn = actx.createBufferSource();
			absn.buffer = abuf;
			absn.connect(actx.destination);
			absn.onended = function(){ absn.stop(); isplaying = false; };
			absn.start();
			absn.loop = false;
			isplaying = true;
		}
	}// End of playpause()

}// End of Webaudio

// amplifying a wave // TODO: control line based
function ampwave(wave,a){
	var wl = wave[0].length, starttime = Date.now();
	for(var i=0; i<wl; i++){ wave[0][i] *= a; wave[1][i] *= a; }
	log('ampwave() took '+(Date.now()-starttime)+' ms.');
	return wave;
}// End of ampwave()


// panning a wave
function panwave(wave,cps2){ // TODO: why only half sine ??
	var wl = wave[0].length, starttime = Date.now(), thispan;
	cps = cps2.slice(0); normalizecontrolpoints(cps);
	for(var i=0; i<wl; i++){
		thispan = qspl(cps,i/wl);
		wave[0][i] = (1.0+thispan) * wave[0][i];
		wave[1][i] = (1.0-thispan) * wave[1][i];
	}
	log('panwave() took '+(Date.now()-starttime)+' ms.');
	return wave;
}


// centering a wave
function centerwave(wave){
	var acc = 0, wl = wave[0].length, starttime = Date.now();
	for(var i=0; i<wl; i++){
		acc += wave[0][i];
		acc += wave[1][i];
	}
	acc = acc / (2*wl);
	for(var i=0; i<wl; i++){
		wave[0][i] = wave[0][i]-acc;
		wave[1][i] = wave[1][i]-acc;
	}
	log('centerwave() took '+(Date.now()-starttime)+' ms.');
	return wave;
}// End of centerwave()


// normalizing a wave
function normalizewave(wave){
	var maxamplitude = 0, wl = wave[0].length, starttime = Date.now();
	for(var i=0; i<wl; i++){
		if( Math.abs(wave[0][i]) > maxamplitude ){ maxamplitude = Math.abs(wave[0][i]); }
		if( Math.abs(wave[1][i]) > maxamplitude ){ maxamplitude = Math.abs(wave[1][i]); }
	}
	if(maxamplitude>0){
		for(var i=0; i<wl; i++){
			wave[0][i] = (wave[0][i] / maxamplitude);
			wave[1][i] = (wave[1][i] / maxamplitude);
		}
	}
	log('normalizewave() took '+(Date.now()-starttime)+' ms.');
	return wave;
}// End of normalizewave()


// overdriving a wave
function overdrivewave(wave,a){
	var wl = wave[0].length, starttime = Date.now();
	if(!a){ a = 0.5; } if(a < 0.001){ a = 0.001; }
	for(var i=0; i<wl; i++){ 
		if( (wave[0][i]>a) || (wave[0][i]<-a) ){ wave[0][i] = (wave[0][i] % a) * (Math.floor(wave[0][i]/a)%2===0?1:-1); }
		if( (wave[1][i]>a) || (wave[1][i]<-a) ){ wave[1][i] = (wave[1][i] % a) * (Math.floor(wave[1][i]/a)%2===0?1:-1); }
	}
	log('overdrivewave() took '+(Date.now()-starttime)+' ms.');
	return wave;
}// End of overdrivewave()


// simple delay
function delaywave(wave, delaynum, delaytime, delaymul ){
	var newwave = [[],[]], wl = wave[0].length, delsamplenum = Math.floor(delaytime*samplerate), starttime = Date.now();
	for(var i=0; i<wl+delaynum*delsamplenum; i++){
		if(i<wave[0].length){
			newwave[0][i] = wave[0][i];
			newwave[1][i] = wave[1][i];
		}else{
			newwave[0][i] = 0;
			newwave[1][i] = 0;
		}
	}
	var dmul = 1;
	for(var j=1; j<=delaynum; j++){
		dmul *= delaymul;
		for(var i=0; i<wl; i++){
			if(j%2===0){
				newwave[0][j*delsamplenum+i] += wave[1][i] * dmul;
				newwave[1][j*delsamplenum+i] += wave[0][i] * dmul;
			}else{
				newwave[0][j*delsamplenum+i] += wave[0][i] * dmul;
				newwave[1][j*delsamplenum+i] += wave[1][i] * dmul;
			}
		}
	}
	log('delaywave() took '+(Date.now()-starttime)+' ms.');
	return newwave;
}// End of delaywave()


// Combine wave effects
function wavefx(w,o){
	for(var i=0; i<o.length; i++){
		if(o[i]['delaynum']){
			var dn = 0;try{ dn=parseInt(o[i]['delaynum']); }catch(e){ log('!!!! ERROR wavefx() delaynum parseInt '+e+' '+JSON.stringify(e)); }
			var dt = 0;try{ dt=parseFloat(o[i]['delaytime']); }catch(e){ log('!!!! ERROR wavefx() delaytime parseFloat '+e+' '+JSON.stringify(e)); }
			var da = 0;try{ da=parseFloat(o[i]['delayamp']); }catch(e){ log('!!!! ERROR wavefx() delayamp parseFloat '+e+' '+JSON.stringify(e)); }
			w = delaywave( w, dn, beatlength*dt, da );
		}else if(o[i]['pancontrolpoints']){
			w = panwave(w,o[i]['pancontrolpoints']);
		}else if(o[i]['amp']){
			w = ampwave(w,o[i]['amp']);
		}else if(o[i]['overdrive']){
			w = overdrivewave(w,o[i]['overdrive']);
		}else if(o[i]['normalize']){
			w = normalizewave(w);
		}else if(o[i]['center']){
			w = centerwave(w);
		}
	}
	return w;
}// End of wavefx()


//Sample Array to Wav bytes
function encodeWAV(samples, sampleRate, numChannels, bitDepth){
	var bytesPerSample = bitDepth / 8;
	var blockAlign = numChannels * bytesPerSample;
	var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
	var view = new DataView(buffer);
	// RIFF identifier
	writeString(view, 0, 'RIFF');
	// RIFF chunk length
	view.setUint32(4, 36 + samples.length * bytesPerSample, true);
	// RIFF type
	writeString(view, 8, 'WAVE');
	// format chunk identifier
	writeString(view, 12, 'fmt ');
	// format chunk length
	view.setUint32(16, 16, true);
	// sample format (raw)
	view.setUint16(20, 3, true);
	// channel count
	view.setUint16(22, numChannels, true);
	// sample rate
	view.setUint32(24, sampleRate, true);
	// byte rate (sample rate * block align)
	view.setUint32(28, sampleRate * blockAlign, true);
	// block align (channel count * bytes per sample)
	view.setUint16(32, blockAlign, true);
	// bits per sample
	view.setUint16(34, bitDepth, true);
	// data chunk identifier
	writeString(view, 36, 'data');
	// data chunk length
	view.setUint32(40, samples.length * bytesPerSample, true);
	// data
	writeFloat32(view, 44, samples);
	return buffer;
}// End of encodeWAV()

// Chanel mix and WAV export
function interleave(inputL, inputR){ var length = inputL.length + inputR.length, result = new Float32Array(length), index = 0, inputIndex = 0; while(index < length){ result[index++] = inputL[inputIndex]; result[index++] = inputR[inputIndex]; inputIndex++; } return result; }
function writeFloat32(output, offset, input){ for(var i=0;i<input.length; i++, offset+=4 ){ output.setFloat32(offset, input[i], true); } }
function writeString(view, offset, string){ for(var i=0;i<string.length;i++){ view.setUint8(offset+i,string.charCodeAt(i)); } }
function arrayBufferToBase64(buffer){ var binary = '', bytes = new Uint8Array(buffer), len = bytes.byteLength; for (var i=0;i<len;i++) { binary+=String.fromCharCode( bytes[ i ] ); } return window.btoa(binary); }
function getUint8ArrayWAV(w){ return new Uint8Array(encodeWAV(interleave(w[0],w[1]), samplerate, 2, 32)); }
function getDataURIWAV(w){ return 'data:audio/wav;base64,' + arrayBufferToBase64(getUint8ArrayWAV(w)); }


// Log
var logmode = true;
function log(msg){ 
	if(!logmode){ return; } 
	if(msg===null){msg='NULL';}
	if(console && console.log){ console.log(msg); } 
	if(typeof document !== 'undefined' ){ var el = document.getElementById('logdiv'); if(el){ el.innerHTML += msg+'\r\n'; } } 
}

if(typeof module !== 'undefined'){
	module.exports = {
		samplerate, bpm, beatlength, ticksperbeat, beatsperloop, qsplerrorcnt,
		qspl, qwave, normalizecontrolpoints, normalizesynth, synthtowave, rnd128, rnd8, 
		randpreset, harmconst, tuning, melodypresets, effectpresets, rhythmpresets, 
		getrandomnote, notetofreq, gettuning, sequencenotestofreqs, getsequence, sequencer, renderloop,
		ampwave, panwave, centerwave, normalizewave, overdrivewave, delaywave, wavefx,
		encodeWAV, interleave, writeFloat32, writeString, arrayBufferToBase64, getUint8ArrayWAV, getDataURIWAV,
		logmode, log
	}
}

