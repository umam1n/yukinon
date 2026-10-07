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

  const ignoredPatterns = [
    'Fontconfig warning',
    "invalid attribute 'xsi:nil'",
    'invalid constant used',
    'GetVSyncParametersIfAvailable() failed',
    'gl_surface_presentation_helper.cc',
    'Failed to load module "appmenu-gtk-module"',
    'ALSA lib',
    'libva error'
  ];

  for (const line of lines) {
    if (ignoredPatterns.some((pattern) => line.includes(pattern))) {
      continue;
    }
    process.stderr.write(line + '\n');
  }
});

child.stderr.on('end', () => {
  if (stderrBuffer) {
    const ignoredPatterns = [
      'Fontconfig warning',
      "invalid attribute 'xsi:nil'",
      'invalid constant used',
      'GetVSyncParametersIfAvailable() failed',
      'gl_surface_presentation_helper.cc',
      'Failed to load module "appmenu-gtk-module"',
      'ALSA lib',
      'libva error'
    ];
    if (!ignoredPatterns.some((pattern) => stderrBuffer.includes(pattern))) {
      process.stderr.write(stderrBuffer);
    }
  }
});

child.on('close', (code) => {
  process.exit(code || 0);
});
