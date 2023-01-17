const audioContext = new AudioContext();
const badKeys = ["Alt","Arrow","Audio","Enter","Launch","Meta","Play","Tab"];
const emptyLine = " ".repeat(128 + 4);
const fileInput = byId("fileInput");
const gainNode = new GainNode(audioContext);
const oscillator = new OscillatorNode(audioContext, {frequency: 0});
const reader = new FileReader();
const select = byId("track");
const value = {"c":0,"d":2,"e":4,"f":5,"g":7,"a":9,"b":11,"#":1,"&":-1};

let activePress; let frequencies; let index; let indents; let midi; 
let normalGain; let notes; let octave; let on = false; let paused; let press; 
let track; let tuning;

let gamePieces;
let pointer;

const noteWidth = 8;
const noteHeight = 4;


oscillator.connect(gainNode).connect(audioContext.destination); resetVars();

function startGame() {
    myGameArea.start();
    pointer = new component(noteWidth, 128 * noteHeight, "red", 
    myGameArea.canvas.width/2, 0, 0);
}

function updateGameArea() {
    myGameArea.clear();
    for (gamePiece of gamePieces) {
        gamePiece.update();
    }
    pointer.update();
}
  
let myGameArea = {
    canvas: document.getElementById("canvas"),
    start: function() {
      this.canvas.width = 40 * noteWidth;
      this.canvas.height = 128 * noteHeight;
      this.context = this.canvas.getContext("2d");
      this.context.globalAlpha = 0.5;
    },
    clear: function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
  
function component(width, height, color, x, y, position) {
    this.width = width;
    this.height = height;
    this.position = position;
    this.x = x;
    this.y = y;
    this.speedX = 0;
    this.speedY = 0;
    ctx = myGameArea.context;
    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    this.update = function() {
        ctx = myGameArea.context;
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

startGame();

function adjustDisplay() {
    if (activePress !== null) {
        document.getElementById("simpleDisplay").value = notes[index];
        for (gamePiece of gamePieces) {
            gamePiece.x = myGameArea.canvas.width/2 + 
                (gamePiece.position - index) * noteWidth * 2;
        }
    } else {
        document.getElementById("simpleDisplay").value = "";
        for (gamePiece of gamePieces) {
            gamePiece.x = myGameArea.canvas.width/2 + noteWidth + 
                (gamePiece.position - index) * noteWidth * 2;
        }
    }
    updateGameArea();
}

function backwards() { move(-1,+byId("distance").value); }

function byId(id) { return document.getElementById(id); };

function toFreq(note) {
    return tuning.frequency * 2**((note.pitch - tuning.pitch)/12 
        + note.octave - tuning.octave);
}

function convertNotesToFrequencies() {
    octave = 4;
    for (let i = 0; i < notes.length; i++) {
        const note = unbundle(notes[i]); notes[i] = note.text;
        frequencies.push(toFreq(note));
        const indent = note.pitch + (note.octave + 1) * 12;
        indents.push(indent);
        gamePieces.push(new component(noteWidth, noteHeight, "blue", 
            myGameArea.canvas.width/2 + noteWidth + i * noteWidth * 2, 
            (127 - indent) * noteHeight, i));
    } 
    adjustDisplay();
}

function down(e) {
    const strPress = "" + press;
    if (on && !badKeys.some(badKey => strPress.includes(badKey)) && !paused
        && (index < frequencies.length) && !e.repeat && (press != activePress)
        && (document.activeElement.nodeName !== 'INPUT')) {
        if (activePress === null) {
            oscillator.frequency.value = frequencies[index];
            gainNode.gain.setTargetAtTime(normalGain, 
                audioContext.currentTime, 0.015);
        } else {
            oscillator.frequency.setTargetAtTime(frequencies[index], 
                audioContext.currentTime, 0.003)   
        }
        activePress = press; 
        adjustDisplay();
        index++;
    } else if (strPress.includes("Arrow") && (activePress === null)) {
        if (strPress.includes("Left")) { move(-1,1); }
        else if (strPress.includes("Right")) { move(1,1); }
    }
}

function del() {
    /* places where we need to delete note / 
    places where notes are stored:
    (1) tonejs midi object (note objects)
    (2) notes list (text e.g. "a&5")
    (3) frequencies list (numbers e.g. "378.15")
    (4) indents list (midi numbers)
    (5) the display (TODO)
    */

    // (1)
    if (byId("fileRadio").checked) {
        midi.tracks[track].notes.splice(index, 1);
    }

    notes.splice(index, 1); // (2)
    frequencies.splice(index, 1); // (3)
    indents.splice(index, 1); // (4)

    // (5)
}

function format(x) {return x.trim().toLowerCase();}

function forwards() {move(1,+byId("distance").value);}

function help() {window.open("help", "_blank");}

function insert() {
    /* places where we need to insert note / 
    places where notes are stored:
    (1) tonejs midi object (note objects)
    (2) notes list (text e.g. "a&5")
    (3) frequencies list (numbers e.g. "378.15")
    (4) indents list (midi numbers)
    (5) the display (TODO)
    */

    const note = unbundle(byId("note"));

    // (1)
    if (byId("fileRadio").checked) {
        midi.tracks[track].notes.splice(index, 0, {name: note.text}); // todo: fix this
    }

    notes.splice(index, 0, note.text); // (2)
    frequencies.splice(index, 0, toFreq(note)); // (3)
    indents.splice(index, 0, ); // (4)

    // (5)
    
}

function key(e) { 
    if (e.type.includes("key")) {press = e.key;} 
    else {press = e.changedTouches[0].identifier;}
    if (["keydown","touchstart"].includes(e.type)) {down(e);} else {up(e);}
}

function move(step, times) {
    for (let i = 0; i < times; i++) {
        index += step;
        if (index >= frequencies.length) { index = frequencies.length; }
        if (index < 0) { index = 0; }
        adjustDisplay();
    }
}

function pause() { paused = true; oscillator.frequency.value = 0; }

function resetVars() {
    activePress = null; frequencies = []; index = 0; indents = []; octave = 4; 
    paused = false;
    tuning = unbundle(byId("tuningNote").value);
    tuning.frequency = +byId("tuningFrequency").value;
    if (byId("fileRadio").checked) {
        track = select.selectedIndex;
        notes = midi.tracks[track].notes.map(x => format(x.name));
    } else {
        notes = format(byId("notes").value).split(/\s+/);
        midi = new Midi();
        const track = midi.addTrack();
        for (let i = 0; i < notes.length; i++) {
            track.addNote({ name: notes[0] });
        }
    }
    const proposedGain = +byId("gain").value;
    if (proposedGain <= 1 && proposedGain >= 0) {normalGain = proposedGain;} 
    else {normalGain = 0.15;}
    gainNode.gain.value = 0;
    gamePieces = [];
    document.getElementById("simpleDisplay").value = "";
}

function resume() { paused = false; }

function start() { 
    byId("state").value = "Loading...";
    window.setTimeout(() => {
        resetVars(); convertNotesToFrequencies();
        if (!on) {oscillator.start(); on = true;}
        byId("state").value = "Ready";
    });
}

function unbundle(note) {
    let text = format(note); note = text.split('');
    if (+note.at(-1)) {octave = +note.pop();} else {text += octave;}
    let pitch = 0; while (note.length) { pitch += value[note.pop()]; }
    return {pitch:pitch, octave:octave, text:text};
}

function up(e) {
    if (on && (press === activePress)) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.015);
        activePress = null; 
        adjustDisplay();
    }
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0]; if (file) {reader.readAsArrayBuffer(file);}
});
reader.addEventListener("load", (e) => {
    midi = new Midi(e.target.result);
    while (select.options.length) {select.options.remove(0);}
    for (let i = 0; i < midi.tracks.length; i++) {
        const option = document.createElement("option");
        option.text = midi.tracks[i].name; select.add(option);
    }
});
const touchstart = (e) => {keydown(e);}; const touchend = (e) => {keyup(e);};
const buttonFuncs = [start,pause,resume,backwards,forwards,del,insert,help];
const docEventTypes = ["keydown","keyup","touchstart","touchend"];
for (f of buttonFuncs) {byId(f.name).addEventListener("click", f);} 
for (et of docEventTypes) {document.addEventListener(et, key);}