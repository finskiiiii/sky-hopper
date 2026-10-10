(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const shell = document.getElementById('game');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const scoreNode = document.getElementById('score');
  const bestNode = document.getElementById('highscore');
  const finalScoreNode = document.getElementById('finalScore');
  const finalBestNode = document.getElementById('finalBest');
  const recordMessage = document.getElementById('recordMessage');
  const playHint = document.getElementById('playHint');
  const soundButton = document.getElementById('soundButton');

  const storage = {
    get(key, fallback) {
      try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* private browsing */ } }
  };

  let best = Math.max(0, Number(storage.get('sky-hopper-best-v1', 0)) || 0);
  let soundOn = storage.get('sky-hopper-sound-v1', 'true') !== 'false';
  let audioContext;
  let musicTimer = 0;
  let musicStep = 0;
  let musicPlaying = false;
  let musicGain;
  let state = 'ready';
  let score = 0;
  let W = 390;
  let H = 730;
  let groundY = 650;
  let age = 0;
  let spawnTimer = 0;
  let worldDistance = 0;
  let lastFrame = 0;
  let pipes = [];
  let particles = [];
  let bird = { x: 112, y: 310, vy: 0, rotation: 0 };
  let activeFriendImage = null;
  let activeFriendImageIndex = -1;

  const PIPE_W = 70;
  const BIRD_RADIUS = 14;
  const ASSET_VERSION = '2026-10-10-4';
  const FRIEND_IMAGE_PATHS = [
    `./friends/friend-1.jpg?v=${ASSET_VERSION}`,
    `./friends/friend-2.jpg?v=${ASSET_VERSION}`,
    `./friends/friend-3.jpg?v=${ASSET_VERSION}`
  ];
  const MUSIC_STEP_SECONDS = 60 / 174;
  const MUSIC_CHORDS = [
    { bass: 196.00, chord: [246.94, 293.66, 392.00] },
    { bass: 196.00, chord: [246.94, 293.66, 392.00] },
    { bass: 261.63, chord: [261.63, 329.63, 392.00] },
    { bass: 196.00, chord: [246.94, 293.66, 392.00] },
    { bass: 220.00, chord: [220.00, 277.18, 329.63] },
    { bass: 293.66, chord: [293.66, 369.99, 440.00] },
    { bass: 196.00, chord: [246.94, 293.66, 392.00] },
    { bass: 196.00, chord: [246.94, 293.66, 392.00] }
  ];
  const MUSIC_MELODY = [
    392.00, 493.88, 587.33,
    659.25, 587.33, 493.88,
    523.25, 659.25, 783.99,
    739.99, 659.25, 587.33,
    440.00, 554.37, 659.25,
    739.99, 659.25, 554.37,
    587.33, 493.88, 392.00,
    493.88, 440.00, 392.00
  ];
  const friendImages = [];
  bestNode.textContent = best;
  updateSoundButton();

  for (const [index, src] of FRIEND_IMAGE_PATHS.entries()) {
    const image = new Image();
    image.onload = () => {
      friendImages.push({ image, index });
      if (!activeFriendImage) chooseFriendImage();
    };
    image.onerror = () => {};
    image.src = src;
  }

  function updateSoundButton() {
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.setAttribute('aria-label', soundOn ? 'Ton ausschalten' : 'Ton einschalten');
    document.getElementById('soundOn').classList.toggle('hidden', !soundOn);
    document.getElementById('soundOff').classList.toggle('hidden', soundOn);
  }

  function getAudioContext() {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      return audioContext;
    } catch {
      return null;
    }
  }

  function beep(freq, duration = .09, type = 'sine', volume = .045) {
    if (!soundOn) return;
    try {
      const context = getAudioContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, freq * .8), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch { /* audio is optional */ }
  }

  function playMusicTone(freq, start, duration, type, volume) {
    const context = getAudioContext();
    if (!context || !musicGain) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  function scheduleMusicStep() {
    if (!musicPlaying || !soundOn) return;
    const context = getAudioContext();
    if (!context) return;
    if (!musicGain) {
      musicGain = context.createGain();
      musicGain.gain.value = .72;
      musicGain.connect(context.destination);
    }

    const beat = musicStep % 3;
    const bar = Math.floor(musicStep / 3) % MUSIC_CHORDS.length;
    const chord = MUSIC_CHORDS[bar];
    const now = context.currentTime + .025;

    if (beat === 0) {
      playMusicTone(chord.bass, now, .2, 'sawtooth', .075);
    } else {
      for (const note of chord.chord) playMusicTone(note, now, .15, 'triangle', .026);
    }
    playMusicTone(MUSIC_MELODY[musicStep % MUSIC_MELODY.length], now, .2, 'square', beat === 0 ? .05 : .038);

    musicStep = (musicStep + 1) % MUSIC_MELODY.length;
    musicTimer = window.setTimeout(scheduleMusicStep, MUSIC_STEP_SECONDS * 1000);
  }

  function startMusic() {
    if (!soundOn || musicPlaying) return;
    const context = getAudioContext();
    if (!context) return;
    musicPlaying = true;
    musicStep = 0;
    if (context.state === 'suspended') {
      context.resume().finally(() => {
        if (musicPlaying && soundOn) scheduleMusicStep();
      });
    } else {
      scheduleMusicStep();
    }
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) window.clearTimeout(musicTimer);
    musicTimer = 0;
  }

  function resize() {
    const previousW = W;
    const previousH = H;
    const rect = canvas.getBoundingClientRect();
    W = Math.max(200, rect.width);
    H = Math.max(300, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - Math.max(72, Math.min(96, H * .115));
    if (state === 'playing') {
      bird.x = W * .29;
      bird.y = bird.y / previousH * H;
      for (const p of pipes) {
        p.x = p.x / previousW * W;
        p.center = p.center / previousH * H;
      }
    } else {
      bird.x = W * .29;
      bird.y = H * .41;
    }
  }

  function reset() {
    score = 0;
    age = 0;
    spawnTimer = 0;
    worldDistance = 0;
    pipes = [];
    particles = [];
    bird = { x: W * .29, y: H * .42, vy: 0, rotation: 0 };
    chooseFriendImage();
    scoreNode.textContent = '0';
  }

  function chooseFriendImage() {
    if (friendImages.length === 0) {
      activeFriendImage = null;
      activeFriendImageIndex = -1;
      return;
    }
    let next = Math.floor(Math.random() * friendImages.length);
    if (friendImages.length > 1 && friendImages[next].index === activeFriendImageIndex) {
      next = (next + 1) % friendImages.length;
    }
    activeFriendImage = friendImages[next].image;
    activeFriendImageIndex = friendImages[next].index;
  }

  function startGame() {
    reset();
    state = 'playing';
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    playHint.classList.remove('hidden');
    playHint.style.animation = 'none';
    void playHint.offsetWidth;
    playHint.style.animation = '';
    startMusic();
    flap();
  }

  function flap() {
    if (state !== 'playing') return;
    bird.vy = -Math.min(435, 370 + H * .07);
    bird.rotation = -.32;
    beep(660, .065, 'sine', .032);
    for (let i = 0; i < 5; i++) {
      particles.push({ x: bird.x - 15, y: bird.y + 10, vx: -35 - Math.random() * 90, vy: 30 + Math.random() * 70, r: 2 + Math.random() * 3, life: .5, maxLife: .5, color: '#ffedac' });
    }
  }

  function spawnPipe() {
    const gap = Math.max(166, Math.min(200, H * .285) - Math.min(22, score * 1.3));
    const minCenter = 112 + gap / 2;
    const maxCenter = groundY - 105 - gap / 2;
    const low = Math.min(minCenter, maxCenter);
    const high = Math.max(minCenter, maxCenter);
    pipes.push({ x: W + 25, center: low + Math.random() * (high - low), gap, scored: false });
  }

  function crash() {
    if (state !== 'playing') return;
    state = 'over';
    stopMusic();
    playHint.classList.add('hidden');
    const newRecord = score > best;
    if (newRecord) {
      best = score;
      storage.set('sky-hopper-best-v1', best);
      bestNode.textContent = best;
    }
    finalScoreNode.textContent = score;
    finalBestNode.textContent = best;
    recordMessage.textContent = newRecord ? '🏆 NEUER REKORD! Stark geflogen!' : score === 0 ? 'Der nächste Versuch wird besser!' : 'Knackst du deinen Rekord?';
    gameOverOverlay.classList.remove('hidden');
    beep(250, .3, 'triangle', .07);
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * 2 * i / 15;
      particles.push({ x: bird.x, y: bird.y, vx: Math.cos(a) * (55 + Math.random() * 95), vy: Math.sin(a) * (55 + Math.random() * 95), r: 2 + Math.random() * 5, life: .65, maxLife: .65, color: i % 2 ? '#fff3b2' : '#ff9e6f' });
    }
  }

  function update(dt) {
    age += dt;
    worldDistance += dt * (state === 'playing' ? 80 : 14);

    if (state === 'playing') {
      bird.vy += 1320 * dt;
      bird.y += bird.vy * dt;
      bird.rotation = Math.max(-.35, Math.min(1.15, bird.vy / 650));
      spawnTimer += dt;
      if (spawnTimer > 1.52) { spawnTimer -= 1.52; spawnPipe(); }
      const speed = 172 + Math.min(score * 2, 42);
      for (const p of pipes) {
        p.x -= speed * dt;
        if (!p.scored && p.x + PIPE_W < bird.x) {
          p.scored = true;
          score++;
          scoreNode.textContent = score;
          if (score >= 2) playHint.classList.add('hidden');
          beep(870, .12, 'sine', .065);
        }
        const left = p.x + 5;
        const right = p.x + PIPE_W - 5;
        const topBottom = p.center - p.gap / 2;
        const bottomTop = p.center + p.gap / 2;
        if (bird.x + BIRD_RADIUS > left && bird.x - BIRD_RADIUS < right &&
            (bird.y - BIRD_RADIUS < topBottom || bird.y + BIRD_RADIUS > bottomTop)) {
          crash();
        }
      }
      pipes = pipes.filter(p => p.x + PIPE_W + 15 > 0);
      if (bird.y + BIRD_RADIUS > groundY || bird.y - BIRD_RADIUS < 0) crash();
    } else if (state === 'ready') {
      bird.y = H * .42 + Math.sin(age * 3) * 8;
      bird.rotation = Math.sin(age * 3) * .1;
    }
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 110 * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function roundRect(x, y, w, h, radius, fill) {
    if (w <= 0 || h <= 0) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function cloud(x, y, scale, opacity) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = opacity;
    ctx.fillStyle = '#f1feff';
    for (const [cx, cy, rx, ry] of [[-24, 7, 25, 17], [0, 1, 31, 24], [27, 10, 28, 16]]) {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawMountainRange(base, height, color, snowColor, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-30, base);
    const peaks = [
      [-30, base], [W * .08, base - height * .48],
      [W * .2, base - height * .18], [W * .32, base - height * .82],
      [W * .45, base - height * .28], [W * .58, base - height * .68],
      [W * .72, base - height * .22], [W * .86, base - height * .78],
      [W + 40, base]
    ];
    for (const [x, y] of peaks) ctx.lineTo(x, y);
    ctx.lineTo(W + 40, groundY);
    ctx.lineTo(-30, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = snowColor;
    for (const [x, y, w, h] of [
      [W * .32, base - height * .82, 44, 34],
      [W * .58, base - height * .68, 34, 27],
      [W * .86, base - height * .78, 38, 30]
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - w * .45, y + h);
      ctx.lineTo(x - w * .12, y + h * .74);
      ctx.lineTo(x, y + h * 1.05);
      ctx.lineTo(x + w * .15, y + h * .7);
      ctx.lineTo(x + w * .48, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAustriaFlag() {
    const flagW = Math.min(W * .58, 240);
    const flagH = flagW * .54;
    const flagX = W * .5 - flagW * .5;
    const flagY = Math.max(44, H * .095);
    const wave = 7 + Math.sin(age * 1.7) * 1.4;
    const segments = 18;

    ctx.save();
    ctx.globalAlpha = .93;
    ctx.shadowColor = '#14314d55';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 7;

    const stripeColors = ['#d71f2b', '#fff7ee', '#d71f2b'];
    for (let stripe = 0; stripe < 3; stripe++) {
      const y0 = flagY + stripe * flagH / 3;
      const y1 = flagY + (stripe + 1) * flagH / 3;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = flagX + t * flagW;
        const flutter = Math.sin(t * Math.PI * 2.25 + age * 3.1) * wave * t;
        const sag = Math.sin(t * Math.PI) * 2.5;
        const y = y0 + flutter + sag;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = segments; i >= 0; i--) {
        const t = i / segments;
        const x = flagX + t * flagW;
        const flutter = Math.sin(t * Math.PI * 2.25 + age * 3.1) * wave * t;
        const sag = Math.sin(t * Math.PI) * 2.5;
        ctx.lineTo(x, y1 + flutter + sag);
      }
      ctx.closePath();
      ctx.fillStyle = stripeColors[stripe];
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#17467e');
    sky.addColorStop(.43, '#3d98c2');
    sky.addColorStop(1, '#9ee6d4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const sunX = W * .92;
    const sunY = H * .12;
    const halo = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, W * .42);
    halo.addColorStop(0, '#fff8bf8e'); halo.addColorStop(1, '#fff8bf00');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, groundY);
    ctx.beginPath(); ctx.arc(sunX, sunY, 29, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4b4'; ctx.fill();
    cloud(W * .2 - (worldDistance * .13) % (W + 150), H * .19, .82, .58);
    cloud(W * 1.15 - (worldDistance * .11) % (W + 250), H * .28, 1.14, .5);
    cloud(W * .75 - (worldDistance * .18) % (W + 200), H * .40, .6, .4);
    drawAustriaFlag();
    drawMountainRange(groundY - 52, H * .28, '#376f86', '#f2fbff', .62);
    drawMountainRange(groundY - 24, H * .22, '#2c6474', '#e8f7fb', .82);
    drawHills(groundY - 65, '#78c3ad', 22, .012);
    drawHills(groundY - 31, '#55aa99', 15, .028);
    drawHills(groundY - 10, '#348a86', 11, .052);
  }

  function drawHills(base, color, amplitude, speed) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, groundY);
    ctx.lineTo(0, base);
    for (let x = 0; x <= W + 10; x += 9) {
      const h = Math.sin(x * .017 + worldDistance * speed) * amplitude + Math.sin(x * .032 + 2) * amplitude * .32;
      ctx.lineTo(x, base + h);
    }
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
  }

  function drawPipePart(x, y, h, bottom) {
    if (h <= 0) return;
    ctx.save();
    ctx.shadowColor = '#103d4577'; ctx.shadowBlur = 11; ctx.shadowOffsetX = 6;
    const metal = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    metal.addColorStop(0, '#176c6b'); metal.addColorStop(.16, '#40c6ac'); metal.addColorStop(.48, '#7be9bd'); metal.addColorStop(.7, '#42b79a'); metal.addColorStop(1, '#15746b');
    roundRect(x + 3, y, PIPE_W - 6, h, 9, metal);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;
    const capY = bottom ? y : y + h - 26;
    roundRect(x - 5, capY, PIPE_W + 10, 26, 6, '#116d6a');
    roundRect(x - 5, capY + 2, PIPE_W + 10, 18, 6, '#4adeb1');
    roundRect(x, capY + 3, PIPE_W - 10, 4, 2, '#c2ffcc95');
    ctx.fillStyle = '#236d68';
    for (const boltX of [x + 6, x + PIPE_W - 10]) {
      ctx.beginPath(); ctx.arc(boltX, capY + 14, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPipes() {
    for (const p of pipes) {
      const upperBottom = p.center - p.gap / 2;
      const lowerTop = p.center + p.gap / 2;
      drawPipePart(p.x, -20, upperBottom + 20, false);
      drawPipePart(p.x, lowerTop, groundY - lowerTop + 20, true);
    }
  }

  function drawBird() {
    ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rotation);
    ctx.shadowColor = '#16355869'; ctx.shadowBlur = 13; ctx.shadowOffsetY = 7;
    if (activeFriendImage) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(activeFriendImage, -20, -20, 40, 40);
      ctx.restore();
      ctx.strokeStyle = '#ffdf5a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 21.5, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#eaa130';
      ctx.beginPath(); ctx.ellipse(0, 1, 21, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffdf5a';
      ctx.beginPath(); ctx.ellipse(-1, -2, 20, 17, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff0b2';
    ctx.save(); ctx.rotate(-.4 + Math.sin(age * 22) * .12);
    ctx.beginPath(); ctx.ellipse(-11, 10, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f28a45';
    ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(31, 7); ctx.lineTo(14, 12); ctx.closePath(); ctx.fill();
    if (!activeFriendImage) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(9, -8, 7.6, 8.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#193451'; ctx.beginPath(); ctx.arc(11.5, -8, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12.5, -9, 1.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ef9c32';
    ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-5, -28); ctx.lineTo(0, -17); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    ctx.fillStyle = '#206d6b'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#8ae4a1'; ctx.fillRect(0, groundY, W, 9);
    ctx.fillStyle = '#c6ff9a'; ctx.fillRect(0, groundY, W, 3);
    ctx.fillStyle = '#2b8c80';
    const offset = worldDistance * .7 % 30;
    for (let x = -30 - offset; x < W + 30; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, groundY + 24); ctx.lineTo(x + 12, groundY + 24); ctx.lineTo(x + 3, groundY + 38); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffffff14';
    for (let x = 0; x < W; x += 40) ctx.fillRect(x, groundY + 47, 17, 4);
  }

  function render() {
    drawBackground();
    drawPipes();
    drawGround();
    drawParticles();
    if (state === 'playing') drawBird();
  }

  function frame(t) {
    const dt = Math.min((t - (lastFrame || t)) / 1000, .035);
    lastFrame = t;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('restartButton').addEventListener('click', startGame);
  shell.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    if (state === 'playing') flap();
    else if (state === 'ready') startGame();
    else if (state === 'over') startGame();
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    event.preventDefault();
    if (event.repeat) return;
    if (state === 'playing') flap();
    else startGame();
  });
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    storage.set('sky-hopper-sound-v1', soundOn);
    updateSoundButton();
    if (soundOn) {
      if (state === 'playing') startMusic();
      beep(540);
    } else {
      stopMusic();
    }
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { lastFrame = 0; });
  resize();
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
