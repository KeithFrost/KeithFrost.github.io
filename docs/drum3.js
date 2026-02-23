const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');

const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const imageData = ctx.createImageData(width, height);
const imageBuff = imageData.data;
for (let i = 3; i < imageBuff.length; i += 4) {
    imageBuff[i] = 255;  // Make opaque
}

const pts = new Float32Array(3 * width * height);
const vels = new Float32Array(3 * width * height);
const yStride = 3 * width;
const xStride = 3;

for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
	for (let c = 0; c < 3; c++) {
	    const i = 3 * (width * y + x) + c;
	    const j = i - yStride;
	    pts[i] = 0.25 *
		(pts[j] + pts[j - xStride] + pts[j + xStride]
		 + pts[i - xStride]) +
		0.1 * (3 - c) * (Math.random() - 0.5);
	}
    }
}

function cval(x) {
    return Math.floor(128 + 127.9999 * Math.sin(x));
}

let pTime = 0;
let frameCount = 0;
let elapsed = 0;

function animate(time) {
  const deltaTime = time - pTime;
  if (deltaTime < 200) {
    elapsed += 0.001 * deltaTime;
    frameCount++;
    if (elapsed > 20.0) {
      console.log("fps = " + (frameCount / elapsed));
      frameCount = 0;
      elapsed = 0;
    }
  } else {
    frameCount = 0;
    elapsed = 0;
  }

  let dt = 0.02 * deltaTime;
  if (dt > 1.0 || dt < 0.0) dt = 1.0;
  pTime = time;
  const c1 = 1.0 / 12.0;
  const c2 = 1.0 / 6.0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
	const i = 3 * (width * y + x) + c;
	const navg = c2 * (
	  pts[i - yStride] + pts[i + yStride] +
	    pts[i - xStride] + pts[i + xStride]) +
	      c1 * (
		pts[i - xStride - yStride] + pts[i + xStride - yStride] +
		  pts[i - xStride + yStride] + pts[i + xStride + yStride]);
	const i0 = i - c;
	const s = pts[i0] + pts[i0 + 1] + pts[i0 + 2];
	vels[i] += dt * (0.4 + 0.1 * c) * (navg - pts[i])
			 - 0.001 * Math.sin(s));
      }
    }
  }
  for (let i = 0; i < pts.length; i++) {
    pts[i] += vels[i] * dt;
  }

  let j = 0;
  for (let i = 0; i < imageBuff.length; i += 4, j += 3) {
    imageBuff[i] = cval(pts[j]);
    imageBuff[i + 1] = cval(pts[j + 1]);
    imageBuff[i + 2] = cval(pts[j + 2]);
  }
  ctx.putImageData(imageData, 0, 0);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
