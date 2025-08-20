const canvas = document.getElementById("canvas");
const fpsElem = document.getElementById("fps");

const ctx = canvas.getContext('2d');
const pixelRatio = window.devicePixelRatio || 1;
const cssWidth = 640;
const cssHeight = 640;
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';
const cWidth = cssWidth * pixelRatio;
const cHeight = cssHeight * pixelRatio;
canvas.width = cWidth;
canvas.height = cHeight;
ctx.scale(pixelRatio, pixelRatio);

const imageData = ctx.createImageData(cWidth, cHeight);
const imgData = imageData.data;   // Uint8ClampedArray
for (let r = 0; r < cHeight; r++) {
    for (let c = 0; c < cWidth; c++) {
        index = (r * cWidth + c) * 4;
        imgData[index] = r % 256;
        imgData[index + 1] = c % 256;
        imgData[index + 2] = index % 256;
        imgData[index + 3] = 255;
    }
}

let pTime = 0.0;
let sumTime = 0.0;
let frames = 0;
function animate(time) {
    time *= 0.001;
    const deltaTime = time - pTime;
    if (pTime > 0) {
        sumTime += deltaTime;
        frames += 1;
    }
    pTime = time;
    if (sumTime >= 1.0) {
        const fps = frames / sumTime;
        fpsElem.textContent = fps.toFixed(1);
        sumTime = 0.0;
        frames = 0;
    }
    let t = Math.floor(deltaTime * 256);
    t = t % 2048;
    t += 2048;
    for (let r = 0; r < cHeight; r++) {
        for (let c = 0; c < cWidth; c++) {
            index = (r * cWidth + c) * 4;
            imgData[index] = (imgData[index] + t) % 256;
            imgData[index + 1] = (imgData[index + 1] + t) % 256;
            imgData[index + 2] = (imgData[index + 2] + t) % 256;
            imgData[index + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

console.log("canvas dimensions: " + canvas.width + "x" + canvas.height);
