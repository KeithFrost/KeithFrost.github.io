
function boxMuller() {
    let u1 = 0;
    let u2 = 0;

    while (u1 == 0) u1 = Math.random();
    while (u2 == 0) u2 = Math.random();

    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

const pi4 = 4.0 * Math.PI;
const pi2 = 2.0 * Math.PI;
const pi10 = 10.0 * Math.PI;

function makeAffine(scale) {
    const matrix = new Float32Array(5 * 5);
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const index = i * 5 + j;
            matrix[index] = scale * boxMuller();
        }
    }

    return (p5s) => {
        const t5s = new Float32Array(p5s.length);
        for (let pp = 0; pp < p5s.length; pp += 5) {
            for (let i = 0; i < 5; i++) {
                const indT = pp + i;
                for (let j = 0; j < 5; j++) {
                    t5s[indT] += matrix[i * 5 + j] * p5s[pp + j];
                }
                t5s[indT] = (t5s[indT] + pi10) % pi4 - pi2
            }
        }
        return t5s;
    }
}

function expand(p5s) {
    const t5s = new Float32Array(p5s.length)
    for (let pp = 0; pp < p5s.length; pp += 5) {
        let sum = 0.0;
        for (let i = 0; i < 5; i++) {
            const v = p5s[pp + i];
            sum += v * v;
        }
        const delta = Math.pow(sum, 0.25)
        for (let i = 0; i < 5; i++) {
            const index = pp + i;
            const v = p5s[index];
            t5s[index] = (v + delta + pi10) % pi4 - pi2;
        }
    }
    return t5s;
}

function contract(p5s) {
    const t5s = new Float32Array(p5s.length);
    for (let pp = 0; pp < p5s.length; pp += 5) {
        let sum = 0.0;
        for (let i = 0; i < 5; i++) {
            const v = p5s[pp + i];
            sum += v * v;
        }
        const fact = Math.pow(sum, -0.333)
        for (let i = 0; i < 5; i++) {
            const index = pp + i;
            t5s[index] = p5s[index] * fact;
        }
    }
    return t5s;
}

function wmean(p5s) {
    const t5s = new Float32Array(p5s.length);
    for (let pp = 0; pp < p5s.length; pp += 5) {
        let pp1 = pp - 5;
        if (pp1 < 0) pp1 = p5s.length - 5;
        for (let i = 0; i < 5; i++) {
            t5s[pp + i] = 0.5 * p5s[pp + i] + 0.5 * p5s[pp1 + i];
        }
    }
    return t5s;
}

function f32map(f) {
  return (p5s) => {
    const t5s = new Float32Array(p5s.length);
    for (let index = 0; index < p5s.length; index++) {
        t5s[index] = f(p5s[index]);
    }
    return t5s;
  }
}


function concatenate(arrayP5s) {
    let length = 0;
    for (const p5s of arrayP5s) {
        length += p5s.length;
    }
    const t5s = new Float32Array(length);
    let offset = 0;
    for (const p5s of arrayP5s) {
        t5s.set(p5s, offset)
        offset += p5s.length;
    }
    return t5s;
}

function zcolor() {
  const col0 = new Float32Array(3);
  let sum = 0.0;
  for (let i = 0; i < 3; i++) {
	const v = boxMuller();
	col0[i] = v;
	sum += v * v;
  }
  const fact = 1.0 / Math.sqrt(sum);
  for (let i = 0; i < 3; i++) {
	col0[i] *= fact;
  }
  return col0;
}

/*---------*/
class FracState {
  constructor(seqTxs, parTxs, res, imgBuff, zcolor) {
	this.seqTxs = seqTxs;
	this.parTxs = parTxs;
	this.res = res;
	this.imgBuff = imgBuff;
	this.zcolor = zcolor;

	let pts = new Float32Array(5 * 5);
  	for (let i = 0; i < 25; i += 6) {
		pts[i] = 1.0;
  	}
	let l = 0;
  	while (pts.length < 250000) {
		pts = concatenate(parTxs.map((tx) => tx(pts)));
		pts = seqTxs[l % seqTxs.length](pts);
	  	l++;
  	}
	this.p0 = pts;
	this.l0 = l;
	this.ptStack = [];
	this.iTxStack = [];

	this.counts = new Int32Array(res * res);
	this.pixelSums = new Float32Array(res * res * 3);

	this.maxDepth = Math.floor(Math.log(3.0E8) / Math.log(parTxs.length)) - l;
  };

  proc1() {
	let depth = this.iTxStack.length;
	if (depth < this.maxDepth) {
	  depth++;
	  this.iTxStack.push(0);
	  const p0 = (depth > 1) ? this.ptStack.at(-1) : this.p0;
	  this.ptStack.push(this.seqTxs[(this.l0 + depth) % this.seqTxs.length](this.parTxs[0](p0)))
	  return true;
	} else {
		while (this.iTxStack.at(-1) == this.parTxs.length - 1) {
		  this.iTxStack.pop()
		  this.ptStack.pop()
		  depth--;
		}
		if (depth == 0) return false;  // We've generated all the points we can up to this.maxDepth
		const itx = this.iTxStack.pop() + 1;
		this.ptStack.pop();
		const p0 = (depth > 1) ? this.ptStack.at(-1) : this.p0;
		this.ptStack.push(this.seqTxs[(this.l0 + depth) % this.seqTxs.length](this.parTxs[itx](p0)));
	  	this.iTxStack.push(itx);
		return true;
	}
  }

  process1() {
	if (!this.proc1()) {
	  return false;
	}
	const pts = this.ptStack.at(-1);
	const res = this.res;
	for (let pp = 0; pp < pts.length; pp += 5) {
	  const x = Math.floor((2.0 * Math.PI + pts[pp]) * (res - 1) / (4.0 * Math.PI))
	  const y = Math.floor((2.0 * Math.PI - pts[pp + 1]) * (res - 1) / (4.0 * Math.PI));
	  let r = pts[pp + 2];
	  let g = pts[pp + 3];
	  let b = pts[pp + 4];
	  const dotz = r * this.zcolor[0] + g * this.zcolor[1] + b * this.zcolor[2];
	  r -= dotz * this.zcolor[0];
	  g -= dotz * this.zcolor[1];
	  b -= dotz * this.zcolor[2];
	  const posI = y * res + x;
	  const cPosI = 3 * posI;
	  const bPosI = 4 * posI;
	  this.counts[posI] += 1;
	  this.pixelSums[cPosI] += r;
	  this.pixelSums[cPosI + 1] += g;
	  this.pixelSums[cPosI + 2] += b;
	  const ct = this.counts[posI];
	  this.imgBuff[bPosI] = Math.floor(127.5 * (1.0 - Math.cos(this.pixelSums[cPosI] / ct)));
	  this.imgBuff[bPosI + 1] = Math.floor(127.5 * (1.0 - Math.cos(this.pixelSums[cPosI + 1] / ct)));
	  this.imgBuff[bPosI + 2] = Math.floor(127.5 * (1.0 - Math.cos(this.pixelSums[cPosI + 2] / ct)));
	  this.imgBuff[bPosI + 3] = 255;
	}
	return true;
  }
}

function makeFracState(seqTxs, parTxs, res, imgBuff, zcolor) {
  return new FracState(seqTxs, parTxs, res, imgBuff, zcolor);
}


/*---------*/
const affines = [];
const atxs = [f32map(Math.cos), f32map((v) => 2.0 * Math.sin(v)), contract]
for (let i = 0; i < 3; i++) {
  affines.push(makeAffine(1.0));
  affines.push(atxs[i]);
}
const txforms = [wmean, expand, contract];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
const pixelRatio = window.devicePixelRatio || 1;
const cssRes = 640;
canvas.style.width = cssRes + 'px';
canvas.style.height = cssRes + 'px';
const cRes = Math.floor(cssRes * pixelRatio);
canvas.width = cRes;
canvas.height = cRes;
ctx.scale(pixelRatio, pixelRatio);

const imageData = ctx.createImageData(cRes, cRes);
const imageBuff = imageData.data;
for (let i = 3; i < imageBuff.length; i += 4) {
  imageBuff[i] = 255;
}
const state = makeFracState(affines, txforms, cRes, imageBuff, zcolor());

let count = 0;
let pTime = 0;
let timeDelta = 0;
function animate(time) {
  if (pTime > 0) timeDelta += (time - pTime);
  pTime = time;
  if (state.process1()) {
	ctx.putImageData(imageData, 0, 0);
	count++;
	requestAnimationFrame(animate);
  } else {
	timeDelta = Math.floor(0.001 * timeDelta);
	const fps = Math.floor(count / timeDelta);
	console.log("time = " + timeDelta + ", frames = " + count + ", fps = " + fps);
  }
}
requestAnimationFrame(animate);
