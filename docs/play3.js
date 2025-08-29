function boxMuller() {
    let u1 = 0;
    let u2 = 0;
    while (u1 == 0) u1 = Math.random();
    while (u2 == 0) u2 = Math.random();

    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const point = new Float32Array(5);

for (i = 0; i < 5; i++) {
    point[i] = boxMuller();
}

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const pi2 = 2.0 * Math.PI;
const pi4 = 4.0 * Math.PI;
const pi6 = 6.0 * Math.PI;

function animate(time) {
    for (let iter = 0; iter < 100; iter++) {
        const x0 = point[0];
        const y0 = point[1];
        for (let i = 0; i < 5; i++) {
            point[i] = (pi6 + point[i] + 0.02 * boxMuller()) % pi4 - pi2 ;
        }

        const scale = canvas.width / pi4;
        const xp0 = scale * (x0 + pi2);
        const yp0 = scale * (y0 + pi2);
        const xp1 = scale * (point[0] + pi2);
        const yp1 = scale * (point[1] + pi2);

        const xp2 = scale * (-x0 + pi2);
        const yp2 = scale * (-y0 + pi2);
        const xp3 = scale * (-point[0] + pi2);
        const yp3 = scale * (-point[1] + pi2);

        const rgb = [];
        for (let i = 2; i < 5; i++) {
            rgb.push(Math.floor(127.5 * (1.0 - Math.cos(point[i]))));
        }

        if (Math.max(Math.abs(xp1 - xp0), Math.abs(yp1 - yp0)) < scale) {
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 8)`;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(xp0, yp0);
            ctx.lineTo(xp1, yp1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(xp2, yp2);
            ctx.lineTo(xp3, yp3);
            ctx.stroke();
        }
    }
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
