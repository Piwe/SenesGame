// Shape drawing shared by the game and the settings page.
const SenesShapes = (function () {
  'use strict';

  const COLORS = Object.freeze(['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#4cc9f0', '#f15bb5']);

  // Pyramid corners as fractions of the radius: the peak and three visible base corners.
  const PYRAMID = {
    apex: [0, -1],
    left: [-0.85, 0.45],
    front: [0.1, 0.8],
    right: [0.85, 0.4]
  };

  // Points evenly spaced around the centre, starting at the top.
  function tracePoints(ctx, count, radiusAt) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const pr = radiusAt(i);
      if (i === 0) ctx.moveTo(Math.cos(a) * pr, Math.sin(a) * pr);
      else ctx.lineTo(Math.cos(a) * pr, Math.sin(a) * pr);
    }
  }

  // Builds a path for the shape centred on the origin, fitting within radius r
  // so collisions and touch detection can treat every shape as a circle.
  function trace(ctx, shape, r) {
    ctx.beginPath();
    switch (shape) {
      case 'square': {
        const h = r * 0.8;
        const k = r * 0.2;
        ctx.moveTo(-h + k, -h);
        ctx.arcTo(h, -h, h, h, k);
        ctx.arcTo(h, h, -h, h, k);
        ctx.arcTo(-h, h, -h, -h, k);
        ctx.arcTo(-h, -h, h, -h, k);
        break;
      }
      case 'triangle':
        tracePoints(ctx, 3, () => r);
        break;
      case 'diamond':
        tracePoints(ctx, 4, () => r);
        break;
      case 'star':
        tracePoints(ctx, 10, i => (i % 2 ? r * 0.5 : r));
        break;
      case 'pyramid':
        ctx.moveTo(PYRAMID.apex[0] * r, PYRAMID.apex[1] * r);
        ctx.lineTo(PYRAMID.left[0] * r, PYRAMID.left[1] * r);
        ctx.lineTo(PYRAMID.front[0] * r, PYRAMID.front[1] * r);
        ctx.lineTo(PYRAMID.right[0] * r, PYRAMID.right[1] * r);
        break;
      default:
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.closePath();
  }

  // Darkens the right face and marks the front edge so the pyramid reads as solid.
  function shadePyramid(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(PYRAMID.apex[0] * r, PYRAMID.apex[1] * r);
    ctx.lineTo(PYRAMID.front[0] * r, PYRAMID.front[1] * r);
    ctx.lineTo(PYRAMID.right[0] * r, PYRAMID.right[1] * r);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(PYRAMID.apex[0] * r, PYRAMID.apex[1] * r);
    ctx.lineTo(PYRAMID.front[0] * r, PYRAMID.front[1] * r);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draws a shape centred at (x, y). Active shapes get a white outline.
  function draw(ctx, shape, x, y, r, color, rotation, active) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    trace(ctx, shape, r);
    ctx.fillStyle = color;
    ctx.fill();
    if (shape === 'pyramid') shadePyramid(ctx, r);

    // Soft highlight for a bit of depth, kept inside the shape and lit from the top-left.
    ctx.save();
    ctx.clip();
    ctx.rotate(-rotation);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (active) {
      trace(ctx, shape, r + 5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  return { COLORS, draw };
})();
