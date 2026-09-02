const fs = require('fs');
let code = fs.readFileSync('src/engine/renderer.ts', 'utf-8');

code = code.replace(
`renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight);`,
`renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight, undefined, project.accessibility);`
);
code = code.replace(
`renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight);`,
`renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight, undefined, project.accessibility);`
);
code = code.replace(
`renderCaptionFrame(ctx, capSegment, time, globalStyle, canvasWidth, canvasHeight);`,
`renderCaptionFrame(ctx, capSegment, time, globalStyle, canvasWidth, canvasHeight, undefined, project.accessibility);`
);

fs.writeFileSync('src/engine/renderer.ts', code);
console.log("Renderer updated!");
