/*

TODO:
 - loop amp controlline
 - samplerate, bpm, beatsperloop textarea
 - Waveform position problems / controls
 - Voice volume controls
 - Other tuning systems https://en.wikipedia.org/wiki/Musical_tuning

OK
 - hotkeys to save loop, save everything
 - everything save / load to json
 - fix x=0 and x=1 in control points editor
 - sequencer HTML controls
 - sequence effect controls (delay, normalize, offset, etc.)
 - New waveform button
 - Delete waveform buttons
 - New voice button
 - Delete voice buttons
 - Voice volumes ?
 - overdrive control line
 - voices add voices undefined

*/

////////////////////////////////////////////////////
//
//  UI / Program Entry point
//
////////////////////////////////////////////////////

var synw = [[0],[0]], loopwave = [[0],[0]];

var currentsequence = null,
	c4freq = 261.6255653,
	currentbasenote ='C4',
	currentmelodypreset = 'goa2', 
	currentrhythmpreset = 'rnd_1/2_1/4',
	currenteffectpreset = 'echo1';

var pgw = 200, pgh = 200, vatimeout, wptimeout;

function onload_init(){
	document.getElementById('button_seqplaypause').disabled = true;
	document.getElementById('button_saveloopwave').disabled = true;
	gettuning();
	createdatalists();
	generatesequence();
	if(synthpresets[currentsynthname]){ previewsynth( synthpresets[currentsynthname] ); }
}// End of onload_init()

function doeverything(){
	
	var ks;
	if(Math.random()<0.5){
		ks = Object.keys(synthpresets), k = ks[Math.floor(Math.random()*ks.length)];
		document.getElementById('synthpresetinput').value = k;
		currentsynthname = k;
		previewsynth( synthpresets[k] );
	}else{
		document.getElementById('synthpresetinput').value = '';
		getrandomsynth();
	}
	
	ks = Object.keys(melodypresets), k = ks[Math.floor(Math.random()*ks.length)];
	currentmelodypreset = k;
	document.getElementById('melodypresetinput').value = currentmelodypreset;
	
	ks = Object.keys(rhythmpresets), k = ks[Math.floor(Math.random()*ks.length)];
	currentrhythmpreset = k;
	document.getElementById('rhythmpresetinput').value = currentrhythmpreset;
	
	ks = Object.keys(effectpresets), k = ks[Math.floor(Math.random()*ks.length)];
	currentloopeffects = effectpresets[k];
	document.getElementById('effectpresetinput').value = k;
	document.getElementById('effectdef').value =  JSON.stringify(currentloopeffects);
		
	generatesequence();
	
	rendersequence();
	
}// End of doeverything()

//getting state
function getstate(){
	var so = {};
	// samplerate = 48000, bpm = 128, beatlength = 60/bpm, ticksperbeat = 8, beatsperloop = 8;
	so.samplerate = samplerate;
	so.bpm = bpm;
	so.beatlength = beatlength;
	so.ticksperbeat = ticksperbeat;
	so.beatsperloop = beatsperloop;
	// var currentsequence = null, c4freq = 261.6255653, currentbasenote='C4', currentmelodypreset = 'goa2', currenteffectpreset = 'echo1', currentrhythmpreset = 'sc1';
	so.currentsequence = currentsequence;
	so.currenteffects = document.getElementById('effectdef').value;
	so.c4freq = c4freq;
	so.currentbasenote = currentbasenote;
	so.currentmelodypreset = currentmelodypreset;
	so.currenteffectpreset = currenteffectpreset;
	so.currentrhythmpreset = currentrhythmpreset;
	// var currentsynth, currentsynthname;
	so.currentsynth = currentsynth;
	so.currentsynthname = currentsynthname;
	return so;
}


//Save WAV
function savestate(){
	var filename = currentsynthname+'_'+currentmelodypreset+'_'+currentrhythmpreset+'_'+currenteffectpreset+'_'+currentbasenote+'_'+nowstr()+'.json';
	var downloadlink = document.createElement('a');
	downloadlink.id = 'downloadlinka2';
	downloadlink.download = filename;
	var statestr = JSON.stringify(getstate());
	downloadlink.href = 'data:text/plain;charset=utf-8,' + statestr;
	document.getElementById('downloadlinkcontainer2').innerHTML = ''; 
	document.getElementById('downloadlinkcontainer2').appendChild(downloadlink);
	document.getElementById('downloadlinka2').click();
}// End of savestate()


//loading state
function loadstate(){
	
	stopedit();
	var str = document.getElementById('statedef').value;
	
	try{
		var so = JSON.parse(str);
		
		// samplerate = 48000, bpm = 128, beatlength = 60/bpm, ticksperbeat = 8, beatsperloop = 8;
		if(so.samplerate){ samplerate = so.samplerate; }
		if(so.bpm){ bpm = so.bpm; }
		if(so.beatlength){ beatlength = so.beatlength; }
		if(so.ticksperbeat){ ticksperbeat = so.ticksperbeat; }
		if(so.beatsperloop){ beatsperloop = so.beatsperloop; }
		
		// var currentsequence = null, c4freq = 261.6255653, currentbasenote='C4', currentmelodypreset = 'goa2', currenteffectpreset = 'echo1', currentrhythmpreset = 'sc1';
		if(so.currentsequence){ currentsequence = so.currentsequence; }
		if(so.c4freq){ c4freq = so.c4freq; }
		if(so.currentbasenote){ currentbasenote = so.currentbasenote; }
		document.getElementById('basenoteinput').value = currentbasenote;
		if(so.currentmelodypreset){ currentmelodypreset = so.currentmelodypreset; }
		if(so.currenteffectpreset){ currenteffectpreset = so.currenteffectpreset; }
		if(so.currentrhythmpreset){ currentrhythmpreset = so.currentrhythmpreset; }
		
		// var currentsynth, currentsynthname;
		if(so.currentsynth){ currentsynth = so.currentsynth; }
		if(so.currentsynthname){ currentsynthname = so.currentsynthname; }
		
		// Refresh synth
		synw = [[0],[0]]; loopwave = [[0],[0]];
		document.getElementById('synthdef').value = nicejson(currentsynth);
		document.getElementById('synthpresetinput').value = currentsynthname;
		synthdefupdate();
		
		// Refresh sequencer
		var sqstr = JSON.stringify(currentsequence);
		sqstr = replaceAll(sqstr,']]',']\r\n]');
		sqstr = replaceAll(sqstr,'[','\r\n[');
		document.getElementById('seqdef').value = sqstr;
		document.getElementById('melodypresetinput').value = currentmelodypreset;
		document.getElementById('rhythmpresetinput').value = currentrhythmpreset;
		refreshseqeditor();
		
		// Refresh effects
		document.getElementById('effectdef').value = so.currenteffects;
		document.getElementById('effectpresetinput').value = currenteffectpreset;
		
	}catch(e){ log('!!!! ERROR loadstate() JSON parse from |'+str+'| '+e+' '+JSON.stringify(e)); }
	
}// End of loadstate()


//Hotkeys
document.addEventListener('keypress', function(event){
	if(event.key==='A'){ getrandomsynth(); }
	if(event.key==='S'){ playpause(synw); }
	if(event.key==='D'){ generatesequence(); }
	if(event.key==='F'){ rendersequence(); }
	if(event.key==='G'){ playpause(loopwave); }
	if(event.key==='H'){ doeverything(); }
	if(event.key==='J'){ saveWAV(loopwave,1); }
	if(event.key==='K'){ savestate(); }
});


//JSON formatting
function nicejson(o){
	var str = JSON.stringify(o);
	str = replaceAll(str,',"',',\r\n"');
	str = replaceAll(str,'{','{\r\n');
	str = replaceAll(str,'}','\r\n}');
	str = replaceAll(str,',',', ');
	return str;
}


function getrandomsynth(){
	stopedit();
	currentsynthname = 'random';
	document.getElementById('synthpresetinput').value = '';
	var s = randpreset();
	previewsynth(s);
}


//Previewing and editing a synth
function previewsynth(ob){

	// Text editor update
	var synstr = nicejson(ob);
	document.getElementById('synthdef').value = synstr;
	
	log('Synth JSON length: ' + synstr.length);

	currentsynth = JSON.parse(synstr);
	
	// Control point lists normalization
	var o = normalizesynth(ob);
	
	// Rendering sound
	synw = synthtowave( o );
	
	// Parameter graphs
	
	// Waveforms
	var wfrstr = '<td>Waveforms</td>';
	for(var i=0; i<o.waveforms.length; i++){
		wfrstr+='<td>'+
			'<div id="waveformgraph'+i+'" class="wgraph" style="width:'+pgw+'px;height:'+pgh+'px;" '+
				'onclick="edcpsname=\'waveform'+i+'\';startedit();" ></div>'+
			'position:<input type="text" id="waveformpositioninput'+i+'" oninput="updatewaveformposition('+i+')" style="width:4rem;" ></input>'+
			'<button id="button_deletewaveform'+i+'" onclick="deletewaveform('+i+')" class="deletebutton" >X</button>'+
			'</td>';
	}
	wfrstr+='<td><button id="button_waveformadd" onclick="addwaveform()" >+</button></td>';
	document.getElementById('waveformsrow').innerHTML = wfrstr;
	
	for(var i=0; i<o.waveforms.length; i++){ 
		generatewaveImage('waveformgraph'+i,qwave(o.waveforms[i][1],pgw),pgw,pgh);
		document.getElementById('waveformpositioninput'+i).value = o.waveforms[i][0];
	}

	// Voices
	var vostr = '<td>Voices</td>';
	for(var i=0; i<o.voices.length; i++){
		vostr+='<td>'+
			'<div id="voicegraph'+i+'" class="wgraph" style="width:'+pgw+'px;height:'+pgh+'px;" '+
				'onclick="edcpsname=\'voice'+i+'\';startedit();" ></div>'+
			'amp:<input type="text" id="voiceampinput'+i+'" oninput="updatevoiceamp('+i+')" style="width:4rem;" ></input>'+
			'<button id="button_deletevoice'+i+'" onclick="deletevoice('+i+')" class="deletebutton" >X</button>'+
			'</td>';
	}
	vostr+='<td><button id="button_voiceadd" onclick="addvoice()" >+</button></td>';
	document.getElementById('voicesrow').innerHTML = vostr;
	for(var i=0; i<o.voices.length; i++){ generatewaveImage('voicegraph'+i,qwave(o.voices[i][1],pgw),pgw,pgh); }
	
	// Envelope and pan	
	generatewaveImage('envelopegraph',qwave(o.envelope,pgw),pgw,pgh);
	generatewaveImage('pangraph',qwave(o.pan,pgw),pgw,pgh);
	generatewaveImage('predrivegraph',qwave(o.predrive,pgw),pgw,pgh);
	
	// Sound graph
	var grw = Math.floor(o.defaultlength*beatlength*edw) * 2;
	generateImage( 'graphdiv', synw, grw, edh );
	document.getElementById('graphdiv').style.width = grw+'px';
	document.getElementById('graphdiv').style.height = edh+'px';
	
}// End of previewsynth()


function addwaveform(){
	if(!currentsynth.waveforms || currentsynth.waveforms.length<1){
		currentsynth.waveforms = [ [0, [[0.25, 1], [0.75, -1]] ] ]
	}else{
		var widx = 0, wpos = 0.5, nwf = currentsynth.waveforms[0][1].slice(0);
		if(edcpsname && edcpsname.startsWith('waveform')){
			try{
				widx = parseInt(edcpsname.substring(8));
				if(widx < currentsynth.waveforms.length-1){
					wpos = (currentsynth.waveforms[widx+1][0]-currentsynth.waveforms[widx][0])/2;
				}else{
					wpos = (1-currentsynth.waveforms[widx][0])/2;
				}
				nwf = currentsynth.waveforms[widx][1].slice(0);
			}catch(e){ log('!!!! ERROR addwavform() parseInt '+edcpsname+' '+e+' '+JSON.stringify(e)); } 
		}
		currentsynth.waveforms.splice(widx, 0, [wpos, nwf] );
	}
	document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
}


function deletewaveform(i){
	currentsynth.waveforms.splice(i,1);
	document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
}


function addvoice(){
	if(!currentsynth.voices){ currentsynth.voices = []; }
	currentsynth.voices.push([1,[[0.5, 0]]]);
	document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
}


function deletevoice(i){
	currentsynth.voices.splice(i,1);
	document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
}


function updatevoiceamp(i){
	
	if(vatimeout){ clearTimeout(vatimeout); }
	
	vatimeout = setTimeout( function(){
		var va = 1;
		try{ va = parseFloat(document.getElementById('voiceampinput'+i).value); }catch(e){ log('!!!! ERROR updatevoiceamp() parseFloat '+e+' '+JSON.stringify(e)); }
		if(va>1){ va=1; } if(va<0){ va=0; }// TODO: remove limits?
		currentsynth.voices[i][0] = va;
		document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
	}, 1000 );
	
}

function updatewaveformposition(i){
	if(wptimeout){ clearTimeout(wptimeout); }
	
	wptimeout = setTimeout( function(){
		var wp = 0.5;
		try{ wp = parseFloat(document.getElementById('waveformpositioninput'+i).value); }catch(e){ log('!!!! ERROR updatewaveformposition() parseFloat '+e+' '+JSON.stringify(e)); }
		if(wp>1){ wp=1; } if(wp<0){ wp=0; }
		currentsynth.waveforms[i][0] = wp;
		document.getElementById('synthdef').value = nicejson(currentsynth); synthdefupdate();
	}, 1000 );
}

//Generate sequence()
function generatesequence(){
	currentsequence = getsequence( currentmelodypreset, currentrhythmpreset );
	var str = JSON.stringify(currentsequence);
	str = replaceAll(str,']]',']\r\n]');
	str = replaceAll(str,'[','\r\n[');
	document.getElementById('seqdef').value = str;
	refreshseqeditor();
}


//Refresh sequence editor 
function refreshseqeditor(){
	try{ currentsequence = JSON.parse(document.getElementById('seqdef').value); }catch(e){ log('!!!! ERROR rendersequence() currentsequence textarea parsing.'); }
	generateloopImage();
}


//Render sequence
function rendersequence(){
	// Render button highlight
	document.getElementById('button_seqrender').disabled = true;
	document.getElementById('button_seqrender').style.backgroundColor = 'rgb(0,255,255)';
	// setTimeout to force DOM refresh
	setTimeout(function(){
		// getting effects object
		currentloopeffects = [];
		try{ currentloopeffects = JSON.parse(document.getElementById('effectdef').value); }catch(e){ log('!!!! ERROR rendersequence() effectdef JSON.parse '+e+' '+JSON.stringify(e)); }
		// rendering current loop
		loopwave = renderloop( currentsynth, currentsequence, c4freq, currentloopeffects );
		// Render button highlight off
		document.getElementById('button_seqrender').style.color = '';
		document.getElementById('button_seqrender').disabled = false;
		document.getElementById('button_seqrender').style.backgroundColor = '';
		document.getElementById('button_seqplaypause').disabled = false;
		document.getElementById('button_saveloopwave').disabled = false;
	},50);
}// End of rendersequence()


function changebpm(){
	var nbpm = 128;
	try{ nbpm = parseFloat(document.getElementById('bpminput').value); }catch(e){ log('!!!! ERROR changebpm() parseFloat '+e+' '+JSON.stringify(e)); }
	if( nbpm<=0.0001 || nbpm>10000 ){ nbpm = 128; }
	bpm = nbpm; beatlength = 60/bpm;
}


function changesamplerate(){
	var nsamplerate = 48000;
	try{ nsamplerate = parseInt(document.getElementById('samplerateinput').value); }catch(e){ log('!!!! ERROR changesamplerate() parseInt '+e+' '+JSON.stringify(e)); }
	if( nsamplerate < 1 ){ nsamplerate = 48000; }
	samplerate = nsamplerate;
}



function changebeatsperloop(){
	var nbeatsperloop = 8;
	try{ nbeatsperloop = parseInt(document.getElementById('beatsperloopinput').value); }catch(e){ log('!!!! ERROR changebeatsperloop() parseInt '+e+' '+JSON.stringify(e)); }
	if( nbeatsperloop<1 || nbeatsperloop>1024 ){ nbeatsperloop = 8; }
	beatsperloop = nbeatsperloop;
}


//Synth preset dropdown list
function createdatalists(){
	var str = '';
	
	document.getElementById('bpminput').value = bpm;
	document.getElementById('samplerateinput').value = samplerate;
	document.getElementById('beatsperloopinput').value = beatsperloop;
	
	// Basenotes
	str = ''; for(var k in tuning){ str += '<option value="'+k+'">'; }
	document.getElementById('basenotedatalist').innerHTML = str;
	var bpi = document.getElementById('basenoteinput');
	bpi.value = currentbasenote;
	bpi.addEventListener('input', function(e){
		if(tuning.hasOwnProperty(bpi.value)){
			currentbasenote = bpi.value;
			c4freq = tuning[bpi.value];
		}
	});
	
	// Synth presets
	str = ''; for(var k in synthpresets){ str += '<option value="'+k+'">'; }
	document.getElementById('synthpresetdatalist').innerHTML = str;
	var spi = document.getElementById('synthpresetinput');
	// try to load synth
	spi.addEventListener('input', function(e){
		if(synthpresets.hasOwnProperty(spi.value)){ 
			stopedit();
			currentsynthname = spi.value;
			previewsynth( synthpresets[spi.value] );
		}
	});
	
	// Melody presets
	str = ''; for(var k in melodypresets){ str += '<option value="'+k+'">'; }
	document.getElementById('melodypresetdatalist').innerHTML = str;
	var mpi = document.getElementById('melodypresetinput');
	mpi.value = currentmelodypreset;
	mpi.addEventListener('input', function(e){
		currentmelodypreset = 'monotone';
		if(melodypresets.hasOwnProperty(mpi.value)){ currentmelodypreset = mpi.value; }
	});
	
	// Rhythm presets
	str = ''; for(var k in rhythmpresets){ str += '<option value="'+k+'">'; }
	document.getElementById('rhythmpresetdatalist').innerHTML = str;
	
	var rpi = document.getElementById('rhythmpresetinput');
	rpi.value = currentrhythmpreset;
	rpi.addEventListener('input', function(e){
		currentrhythmpreset = 'rnd_1/2_1/4';
		if(rhythmpresets.hasOwnProperty(rpi.value)){ currentrhythmpreset = rpi.value; }
	});
	
	// Effect presets
	str = ''; for(var k in effectpresets){ str += '<option value="'+k+'">'; }
	document.getElementById('effectpresetdatalist').innerHTML = str;
	
	var epi = document.getElementById('effectpresetinput');
	epi.value = currenteffectpreset; document.getElementById('effectdef').value = JSON.stringify(effectpresets[currenteffectpreset]); 
	epi.addEventListener('input', function(e){
		currenteffectpreset = '';
		if(effectpresets.hasOwnProperty(epi.value)){
			currenteffectpreset = epi.value;
			document.getElementById('effectdef').value = JSON.stringify(effectpresets[currenteffectpreset]);
		}
	});
	
	
}// End of createdatalists()


//Update synth from textarea
function synthdefupdate(){
	var o;
	try{
		stopedit();
		o = JSON.parse(document.getElementById('synthdef').value);
		previewsynth(o); 
	}catch(e){ log('!!!! ERROR parsing synth definition: '+JSON.stringify(e)+' '+e); }
}// End of synthdefupdate()


// Create mono wave image
function generatewaveImage(divid,wave,w,h){
	var starttime = Date.now();
	var wl = wave.length, bars = [], barwidth = Math.floor(wl/w), idx = 0;
	if(barwidth<1){ console.log('!!!! generatewaveImage() ERROR: barwidth<0 '); return new Image(); }
	
	for(var i=0; i<w; i++){ bars[i] = { posmax:0, posacc:0, poscnt:0, negmax:0, negacc:0, negcnt:0 }; }
	
	// Samples loop
	for(var i=0; i<wl; i++){
		idx = Math.floor(i/barwidth);
		if(idx<bars.length){
			if(wave[i]>0){
				if(wave[i]>bars[idx].posmax){ bars[idx].posmax = wave[i]; }
				bars[idx].posacc += wave[i]; bars[idx].poscnt++;
			}else{
				if(wave[i]<bars[idx].negmax){ bars[idx].negmax = wave[i]; }
				bars[idx].negacc += wave[i]; bars[idx].negcnt++;
			}
		}
	}// End of samples loop
	
	var canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.id=divid+'canvas';
	canvas.style = 'background: url("grid.svg")';
	var context = canvas.getContext('2d');
	
	// Drawing
	for(var i=0; i<w; i++){
		context.fillStyle = 'rgba(0,0,255,0.25)';
		context.fillRect(i, h/2-(h/2)*bars[i].posmax, 1, (h/2)*bars[i].posmax );
		context.fillRect(i, h/2, 1, -(h/2)*bars[i].negmax );
		context.fillStyle = 'rgba(128,128,255,0.25)';
		context.fillRect(i, h/2-(h/2)*(bars[i].posacc/bars[i].poscnt), 1, (h/2)*(bars[i].posacc/bars[i].poscnt) );
		context.fillRect(i, h/2, 1, -(h/2)*(bars[i].negacc/bars[i].negcnt) );
	}
	
	var graphdivelement = document.getElementById(divid);
	if(graphdivelement){
		graphdivelement.innerHTML = '';
		graphdivelement.appendChild(canvas);
	}else{
		log('!!!! ERROR: graphdiv HTML element not found. Can\'t add graph.');
	}
	
}// End of generatewaveImage()


// Create stereo wave image
function generateImage(divid,wave,w,h){
	var starttime = Date.now();
	var wl = wave[0].length, bars = [], barwidth = Math.floor(wl/w), idx = 0;
	if(barwidth<1){ console.log('!!!! generateImage() ERROR: barwidth<0 '); return new Image(); }
	
	for(var i=0; i<w; i++){
		bars[i] = { leftposmax:0, leftposacc:0, leftposcnt:0, leftnegmax:0, leftnegacc:0, leftnegcnt:0, 
		            rightposmax:0, rightposacc:0, rightposcnt:0, rightnegmax:0, rightnegacc:0, rightnegcnt:0 };
	}
	
	// Samples loop
	for(var i=0; i<wl; i++){
		
		idx = Math.floor(i/barwidth);
		if(idx<bars.length){
		
			if(wave[0][i]>0){
				if(wave[0][i]>bars[idx].leftposmax){ bars[idx].leftposmax = wave[0][i]; }
				bars[idx].leftposacc += wave[0][i]; bars[idx].leftposcnt++;
			}else{
				if(wave[0][i]<bars[idx].leftnegmax){ bars[idx].leftnegmax = wave[0][i]; }
				bars[idx].leftnegacc += wave[0][i]; bars[idx].leftnegcnt++;
			}
			if(wave[1][i]>0){
				if(wave[1][i]>bars[idx].rightposmax){ bars[idx].rightposmax = wave[1][i]; }
				bars[idx].rightposacc += wave[1][i]; bars[idx].rightposcnt++;
			}else{
				if(wave[1][i]<bars[idx].rightnegmax){ bars[idx].rightnegmax = wave[1][i]; }
				bars[idx].rightnegacc += wave[1][i]; bars[idx].rightnegcnt++;
			}
		}
	}// End of samples loop
	
	var canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h; 
	canvas.style = 'background: url("grid.svg")';
	var context = canvas.getContext('2d');
	//context.fillStyle = 'rgb(32,32,32)'; context.fillRect(0,0,w,h);
	
	// Drawing
	for(var i=0; i<w; i++){
		context.fillStyle = 'rgba(0,0,255,0.5)';
		context.fillRect(i, h/4-(h/4)*bars[i].leftposmax, 1, (h/4)*bars[i].leftposmax );
		context.fillRect(i, h/4, 1, -(h/4)*bars[i].leftnegmax );
		context.fillRect(i, 3*h/4-(h/4)*bars[i].rightposmax, 1, (h/4)*bars[i].rightposmax );
		context.fillRect(i, 3*h/4, 1, -(h/4)*bars[i].rightnegmax );
		context.fillStyle = 'rgba(128,128,255,0.5)';
		context.fillRect(i, h/4-(h/4)*(bars[i].leftposacc/bars[i].leftposcnt), 1, (h/4)*(bars[i].leftposacc/bars[i].leftposcnt) );
		context.fillRect(i, h/4, 1, -(h/4)*(bars[i].leftnegacc/bars[i].leftnegcnt) );
		context.fillRect(i, 3*h/4-(h/4)*(bars[i].rightposacc/bars[i].rightposcnt), 1, (h/4)*(bars[i].rightposacc/bars[i].rightposcnt) );
		context.fillRect(i, 3*h/4, 1, -(h/4)*(bars[i].rightnegacc/bars[i].rightnegcnt) );	
	}
	
	var graphdivelement = document.getElementById(divid);
	if(graphdivelement){
		graphdivelement.innerHTML = '';
		graphdivelement.appendChild(canvas);
	}else{
		log('!!!! ERROR: graphdiv HTML element not found. Can\'t add graph.');
	}
	
	//log('generateImage() took '+(Date.now()-starttime)+' ms.');
	
}// End of generateImage()


//Create stereo wave image
var seqrefreshtimeout;

function generateloopImage(){
	var starttime = Date.now();
	var idx = 0;

	var canvas = document.createElement('canvas'); canvas.width = beatsperloop*64; canvas.height=8*48; 
	var context = canvas.getContext('2d');
	// piano keyboard background
	for(var i=0; i<beatsperloop; i++){
		for(var j=0; j<48; j++){
			if( (j%12===1) || (j%12===3) || (j%12===6) || (j%12===8) || (j%12===10) ){
				context.fillStyle = 'rgba(64,64,64,1)';
			}else{ context.fillStyle = 'rgba(160,160,160,1)'; }
			if(j%12===0){ context.fillStyle = 'rgba(190,190,190,1)'; }
			if(j===24){ context.fillStyle = 'rgba(210,210,210,1)'; }
			
			context.fillRect( i*64+1 , 48*8-j*8, 63, 7 );
		}
	}
	// Drawing
	for(var i=0; i<currentsequence.length; i++){
		context.fillStyle = 'rgba(0,128,255,0.75)';
		context.fillRect( currentsequence[i][0]*64 , 24*8-currentsequence[i][2]*8, currentsequence[i][1]*64, 7 );
		context.fillStyle = 'rgba(0,0,255,0.75)';
		context.fillRect( currentsequence[i][0]*64 , 24*8-currentsequence[i][2]*8, 2, 7 );
	}
	// appending
	document.getElementById('seqgraph').innerHTML = '';
	document.getElementById('seqgraph').appendChild(canvas);
	document.getElementById('seqgraph').style.width = (beatsperloop*64)+'px';

}// End of generateloopImage()

function delayedseqrefresh(){ if(seqrefreshtimeout){ clearTimeout(seqrefreshtimeout); } seqrefreshtimeout = setTimeout( refreshseqeditor, 1000 ); }


//Save WAV
function saveWAV(wave,namemode){
	var starttime = Date.now();
	
	// Filename
	var filename;
	if(namemode===0){
		filename = currentsynthname+'_'+
				   nowstr()+
				   '.wav';
	}else{
		filename = currentsynthname+'_'+
				   currentmelodypreset+'_'+
				   currentrhythmpreset+'_'+
				   currenteffectpreset+'_'+
				   currentbasenote+'_'+
				   nowstr()+
				   '.wav';
	}
	
	// HTML a (anchor) element with the wave converted to a Base64 Data URI encoded WAV
	var downloadlink = document.createElement('a');
	downloadlink.id = 'downloadlinka';
	downloadlink.download = filename;
	downloadlink.href = getDataURIWAV(wave);
	
	// Append anchor to hidden container div and simulate mouse click
	document.getElementById('downloadlinkcontainer').innerHTML = ''; 
	document.getElementById('downloadlinkcontainer').appendChild(downloadlink);
	document.getElementById('downloadlinka').click();
	
	log('saveWAV() took '+(Date.now()-starttime)+' ms.');
}// End of saveWAV()


////////////////////////////////////////////////////
//
//  Control point editor
//
////////////////////////////////////////////////////


var currentsynth, currentsynthname = 'trance1';
var edcpsname = null, edw = 400, edh = 400, edtimeout, 
	draggedpoint = null, deletecpcallback = null, addcpcallback = null, resetcpscallback = null,
	selectedcpidx = -1, cps, cpr = 10;


//starting editing
function startedit(){
	
	if(edcpsname.startsWith('predrive')){
		if(!currentsynth.predrive){ currentsynth.predrive = [[0.5, 1]]; }
		hlselected('predrive');
		editcontrolpoints( currentsynth.predrive, function(ncps){ currentsynth.predrive = ncps; previewsynth(currentsynth); startedit(); } );
	}
	if(edcpsname === 'envelope'){
		if(!currentsynth.envelope){ currentsynth.envelope = [[0,0],[0.001,1],[1,0]]; }
		hlselected('envelopegraph');
		editcontrolpoints( currentsynth.envelope, function(ncps){ currentsynth.envelope = ncps; previewsynth(currentsynth); startedit(); } );
	}
	if(edcpsname === 'pan'){
		if(!currentsynth.pan){ currentsynth.pan = [[0.5, 0]]; }
		hlselected('pangraph');
		editcontrolpoints( currentsynth.pan, function(ncps){ currentsynth.pan = ncps; previewsynth(currentsynth); startedit(); } );
	}
	
	if(edcpsname.startsWith('waveform')){
		var idx = 0;
		if(!currentsynth.waveforms){ currentsynth.waveforms = [ [0, [[0.25, 1], [0.75, -1]] ] ]; }else{
			try{ idx = parseInt(edcpsname.substring(8)); }catch(e){ log('!!!! ERROR startedit() waveform idx parsing'); }
		}
		hlselected('waveformgraph'+idx);
		editcontrolpoints( currentsynth.waveforms[idx][1], function(ncps){ currentsynth.waveforms[idx][1] = ncps; previewsynth(currentsynth); startedit(); } );
	}
	
	if(edcpsname.startsWith('voice')){
		var idx = 0;
		if(!currentsynth.voices){ currentsynth.voices = [ [1,[[0.5, 0]]] ]; }else{
			try{ idx = parseInt(edcpsname.substring(5)); }catch(e){ log('!!!! ERROR startedit() voice idx parsing'); }
		}
		hlselected('voicegraph'+idx);
		editcontrolpoints( currentsynth.voices[idx][1], function(ncps){ currentsynth.voices[idx][1] = ncps; previewsynth(currentsynth); startedit(); } );
	}
		

}// End of startedit()


function stopedit(){
	draggedpoint = null;
	cps = [];
	//edcpsname = null; 
	deletecpcallback = null;addcpcallback = null;resetcpscallback = null;
	selectedcpidx = -1;
	document.getElementById('editorgraph').innerHTML = '';
	document.getElementById('controlpointsdiv').innerHTML = '';
}


//editor
function editcontrolpoints(controlpoints, callback){
	
	// clone and normalize controlpoints
	cps = controlpoints.slice(0);
	normalizecontrolpoints(cps);
		
	generatewaveImage('editorgraph',qwave(cps,edw),edw,edh);
	
	// controlpoints container and lines
	var cpcont = document.getElementById('controlpointsdiv');
	cpcont.innerHTML = '';
	var offsets = document.getElementById('editorgraph').getBoundingClientRect();
	var str = '<div id="clsvgcontainer" >' + generatecontrollinessvg(offsets) + '</div>';
	
	// Generating control point circles	
	for(var i=0; i<cps.length; i++){
		if( cps[i][0]>=0 && cps[i][0]<=1 ){
			str += '<img id="cp'+i+'" style="position:fixed; \
				left:'+(offsets.left-cpr+cps[i][0]*edw)+'px; top:'+(offsets.top-cpr+(edh/2)-cps[i][1]*(edh/2))+'px;" \
				src="data:image/svg+xml;utf8,<svg width=\''+(cpr*2)+'\' height=\''+(cpr*2)+'\' xmlns=\'http://www.w3.org/2000/svg\' >'+
				'<circle cx=\''+cpr+'\' cy=\''+cpr+'\' r=\''+cpr+'\' stroke=\'cyan\' stroke-width=\'1\' fill=\'blue\' fill-opacity=\'0.5\' />'+
				'<circle cx=\''+cpr+'\' cy=\''+cpr+'\' r=\''+1+'\' stroke=\'white\' stroke-width=\'0.5\' fill=\'white\' fill-opacity=\'0.5\' />'+
				'</svg>" />';
		}
	}
	cpcont.innerHTML = str;
	var el = document.getElementById('cp'+selectedcpidx); if(el){ el.style.border = '1px solid white'; }

	// control point circles positioning when window scrolls
	window.onscroll = function(){
		var offsets = document.getElementById('editorgraph').getBoundingClientRect();
		
		var el = document.getElementById('controllinessvg'); if(el){ el.style.left = offsets.left+'px'; el.style.top = offsets.top+'px'; }
		
		for(var i=0; i<cps.length; i++){
			el = document.getElementById('cp'+i);
			if(el){
				el.style.left = (offsets.left-cpr+cps[i][0]*edw)+'px';
				el.style.top = (offsets.top-cpr+(edh/2)-cps[i][1]*(edh/2))+'px';
			}
		}
	}
	
	addcpcallback = function(){
		if(edcpsname.startsWith('waveform')){
			for(var j=0;j<currentsynth.waveforms.length;j++){
				currentsynth.waveforms[j][1].push([0.5,0]);
				previewsynth(currentsynth);
				startedit();
			}
		}else{
			cps.push([0.5,0]); callback(cps);
		}
	}
	resetcpscallback = function(){ for(var i=0;i<cps.length;i++){cps[i][1]=0;}/*cps = [[0.5,0]];*/ callback(cps); }
	
	// Add drag events
	for(var i=0; i<cps.length; i++){(function(){
		
		var elname = 'cp'+i, eln = 0+i;
		var el = document.getElementById(elname);
		
		if(el){
			el.addEventListener(
					'mousedown',
					function(e){ 
						e.stopPropagation(); 
						
						draggedpoint = e.target;
						draggedpoint.cptarget = elname;
						draggedpoint.edcallback = function(x,y){ 
								cps[eln][0] = x; cps[eln][1] = y; 
								if(edtimeout){ clearTimeout(edtimeout); }
								edtimeout = setTimeout( function(){ callback(cps); }, 1000 ); 
						}
						
						var el = document.getElementById('cp'+selectedcpidx); if(el){ el.style.border = ''; }
						selectedcpidx = eln;
						var el = document.getElementById('cp'+selectedcpidx); if(el){ el.style.border = '1px solid white'; }
						
						deletecpcallback = function(){
							if(edcpsname.startsWith('waveform')){
								for(var j=0;j<currentsynth.waveforms.length;j++){
									currentsynth.waveforms[j][1].splice(eln, 1);
									previewsynth(currentsynth);
									startedit();
								}
							}else{
								cps.splice(eln, 1);
								callback(cps);
							}
						}
						
					}// End of mousedown listener function
			);
		}// End of el check
		
	})()}// End of element loop
	
}// End of editcontrolpoints()


//Control points add / remove / reset
function deletecontrolpoint(){
	if(deletecpcallback){ 
		var el = document.getElementById('cp'+selectedcpidx); if(el){ el.style.border = ''; }
		selectedcpidx = -1;
		draggedpoint = null; deletecpcallback(); deletecpcallback = null;
	}
}

function addcontrolpoint(){ if(addcpcallback){ addcpcallback(); } }
function resetcps(){ if(resetcpscallback){ resetcpscallback(); } }

//Control line SVG
function generatecontrollinessvg(offsets){
	
	var str = '<svg id="controllinessvg" width="' +edw+ '" height="' +edh+ '" \
	xmlns="http://www.w3.org/2000/svg" style="position:fixed;left:' +offsets.left+ 'px; top:' +offsets.top+ 'px;" >';
	
	var x1, y1, x2, y2, x3, y3;
	
	for(var i=0; i<cps.length-1; i++){
		x1 = cps[i  ][0]*edw; y1 = (edh/2)-cps[i  ][1]*(edh/2);
		x2 = cps[i+1][0]*edw; y2 = (edh/2)-cps[i+1][1]*(edh/2);
		
		str += '<line x1="' +x1+ '" y1="' +y1+ '" x2="' +x2+ '" y2="' +y2+ '" stroke-width="1" stroke="white" stroke-opacity="0.25" />';
		if(i<cps.length-2){
			x3 = cps[i+2][0]*edw; y3 = (edh/2)-cps[i+2][1]*(edh/2);
			str += '<path stroke-width="1" stroke="white" stroke-opacity="1" fill="transparent" '+
			'd=" M ' +((x1+x2)/2)+ ' ' +((y1+y2)/2)+ ' Q ' +x2+ ' ' +y2+ ' ' +((x2+x3)/2)+ ' ' +((y2+y3)/2)+ '" />';
		}
	}
	
	str += '</svg>';
	
	return str;
}// End of generatecontrollinessvg()


// Highlight controlpoints selected for edit
function hlselected(id){
	var elnames = ['envelopegraph','pangraph'], el;
	for(var i=0; i<32; i++){ elnames.push('waveformgraph'+i); elnames.push('voicegraph'+i); }
	for(var i=0; i<elnames.length; i++){
		el = document.getElementById(elnames[i]);
		if(el){ el.style.border = 'solid 3px darkcyan'}
	}
	el = document.getElementById(id);
	if(el){ el.style.border = 'solid 3px white'}
}// End of hlselected()


// Mouse events
document.addEventListener('mouseup', function(){ draggedpoint = null; } );
document.addEventListener('mousemove', function(e){
	if(draggedpoint){
		// Calculating offset and new point position
		var offsets = document.getElementById('editorgraph').getBoundingClientRect();
		var nx = (e.clientX-offsets.left)/edw, ny = (e.clientY-offsets.top-(edh/2))/-(edh/2);
		
		if(nx>=0 && nx<=1 && ny>=-1 && ny<=1){

			// Updating position
			draggedpoint.style.left = e.clientX-cpr + 'px';
			draggedpoint.style.top = e.clientY-cpr + 'px';

			// Controllines SVG
			var el = document.getElementById('clsvgcontainer');
			if(el){ el.innerHTML = generatecontrollinessvg(offsets,cps); }

			// Callback
			draggedpoint.edcallback(nx,ny);
			
		}// End of boundary check
		
	}// End of draggedpoint check
});


// Helpers
function nowstr(){return ((new Date().toISOString()).replace(/\:/g,'-'));}
function escapeRegExp(string) { return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"); }
function replaceAll(string, find, replace) { return string.replace(new RegExp(escapeRegExp(find), 'g'), replace); }
