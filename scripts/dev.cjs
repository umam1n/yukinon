const { spawn } = require('child_process');
const path = require('path');

// Run electron-vite dev
const child = spawn('npx', ['electron-vite', 'dev'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: ['inherit', 'inherit', 'pipe'],
  env: {
    ...process.env,
    FORCE_COLOR: '1'
  }
});

// Buffer to handle partial lines in stderr
let stderrBuffer = '';

child.stderr.on('data', (data) => {
  stderrBuffer += data.toString();
  const lines = stderrBuffer.split('\n');
  // Keep the last partial line in the buffer
  stderrBuffer = lines.pop() || '';

  for (const line of lines) {
    // Filter out Fontconfig warnings and Chromium VSync warnings
    if (
      line.includes('Fontconfig warning') ||
      line.includes("invalid attribute 'xsi:nil'") ||
      line.includes('invalid constant used') ||
      line.includes('GetVSyncParametersIfAvailable() failed') ||
      line.includes('gl_surface_presentation_helper.cc')
    ) {
      continue;
    }
    process.stderr.write(line + '\n');
  }
});

child.stderr.on('end', () => {
  if (stderrBuffer) {
    if (
      !stderrBuffer.includes('Fontconfig warning') &&
      !stderrBuffer.includes("invalid attribute 'xsi:nil'") &&
      !stderrBuffer.includes('invalid constant used') &&
      !stderrBuffer.includes('GetVSyncParametersIfAvailable() failed') &&
      !stderrBuffer.includes('gl_surface_presentation_helper.cc')
    ) {
      process.stderr.write(stderrBuffer);
    }
  }
});

child.on('close', (code) => {
  process.exit(code || 0);
});
