document.addEventListener("DOMContentLoaded", () => {
    const canvasContainer = document.getElementById('canvasContainer');
    const canvas = document.getElementById('dopplerCanvas');
    const ctx = canvas.getContext('2d');
    
    const slider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValue');
    const btnPlay = document.getElementById('btnPlay');
    
    // HUD Elements
    const hzDisplay = document.getElementById('hzDisplay');
    const pitchStatus = document.getElementById('pitchStatus');

    // Physics Settings
    const BASE_FREQ = 400; 
    let waveSpeed = 5; // Speed of sound relative to canvas
    let sourceSpeed = 0; // Speed of ambulance
    
    // State variables
    let width, height;
    let isPlaying = false;
    let animationId;
    let sourceX;
    let sourceY;
    let waves = [];
    let framesSinceLastWave = 0;
    const waveInterval = 15; // Higher = fewer waves emitted
    let observerX, observerY;

    // Make setSpeed globally accessible for HTML buttons
    window.setSpeed = function(speed) {
        slider.value = speed;
        updateSpeedUI(speed);
        if (!isPlaying && speed > 0) togglePlay();
    };

    function updateSpeedUI(val) {
        sourceSpeed = parseFloat(val);
        if (sourceSpeed === 0) {
            speedValueDisplay.textContent = "Stationary (0 m/s)";
            speedValueDisplay.className = "text-gray-400 font-bold bg-gray-800 px-3 py-1 rounded-lg";
        } else if (sourceSpeed < waveSpeed) {
            speedValueDisplay.textContent = `${(sourceSpeed * 10).toFixed(0)} m/s (Driving)`;
            speedValueDisplay.className = "text-blue-400 font-bold bg-blue-900/30 px-3 py-1 rounded-lg";
        } else if (sourceSpeed === waveSpeed) {
            speedValueDisplay.textContent = "Mach 1 (Speed of Sound)";
            speedValueDisplay.className = "text-red-500 font-bold bg-red-900/30 px-3 py-1 rounded-lg";
        } else {
            speedValueDisplay.textContent = `Supersonic!`;
            speedValueDisplay.className = "text-purple-400 font-bold bg-purple-900/30 px-3 py-1 rounded-lg";
        }
    }

    function resize() {
        // Accurately capture container size
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        width = canvas.width;
        height = canvas.height;
        
        sourceY = height / 2;
        observerX = width * 0.75; 
        observerY = height / 2;
        
        if (!isPlaying) {
            resetSim();
        }
    }
    window.addEventListener('resize', resize);

    function resetSim() {
        sourceX = width * 0.1; 
        waves = [];
        framesSinceLastWave = 0;
        updatePhysicsHUD();
        draw();
    }

    function updatePhysicsHUD() {
        let apparentFreq = BASE_FREQ;
        
        if (sourceSpeed === 0) {
            apparentFreq = BASE_FREQ;
            hzDisplay.textContent = apparentFreq;
            hzDisplay.className = "text-4xl font-black text-gray-300";
            pitchStatus.textContent = "Normal Pitch";
            pitchStatus.className = "mt-2 text-sm font-bold text-gray-300 bg-gray-700 px-2 py-1 rounded inline-block";
            return;
        }

        // Doppler Formula: f' = f(v / (v +- vs))
        // If ambulance is left of observer, it's approaching.
        let isApproaching = sourceX < observerX;

        if (isApproaching) {
            if (sourceSpeed >= waveSpeed) {
                hzDisplay.textContent = "BOOM!";
                hzDisplay.className = "text-4xl font-black text-red-500";
                pitchStatus.textContent = "Sonic Boom / Shockwave";
                pitchStatus.className = "mt-2 text-sm font-bold text-red-500 bg-red-500/20 px-2 py-1 rounded inline-block";
            } else {
                apparentFreq = Math.round(BASE_FREQ * (waveSpeed / (waveSpeed - sourceSpeed)));
                hzDisplay.textContent = apparentFreq;
                hzDisplay.className = "text-4xl font-black text-blue-400";
                pitchStatus.textContent = "Higher Pitch (Squished)";
                pitchStatus.className = "mt-2 text-sm font-bold text-blue-400 bg-blue-400/20 px-2 py-1 rounded inline-block";
            }
        } else {
            // Receding
            apparentFreq = Math.round(BASE_FREQ * (waveSpeed / (waveSpeed + sourceSpeed)));
            hzDisplay.textContent = apparentFreq;
            hzDisplay.className = "text-4xl font-black text-orange-400";
            pitchStatus.textContent = "Lower Pitch (Stretched)";
            pitchStatus.className = "mt-2 text-sm font-bold text-orange-400 bg-orange-400/20 px-2 py-1 rounded inline-block";
        }
    }

    function update() {
        if (!isPlaying) return;
        
        sourceX += sourceSpeed;
        framesSinceLastWave++;
        
        if (framesSinceLastWave >= waveInterval) {
            // Record origin of wave
            waves.push({ x: sourceX, y: sourceY, radius: 0 });
            framesSinceLastWave = 0;
        }

        // Expand waves
        for (let i = 0; i < waves.length; i++) {
            waves[i].radius += waveSpeed;
        }

        // Remove old waves
        if (waves.length > 0 && waves[0].radius > width * 1.5) {
            waves.shift();
        }

        // Loop ambulance around
        if (sourceX > width + 100) {
            sourceX = -100;
            waves = []; // clear waves on loop for a clean visual
        }

        updatePhysicsHUD();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Draw Road Line
        ctx.beginPath();
        ctx.moveTo(0, sourceY + 25);
        ctx.lineTo(width, sourceY + 25);
        ctx.strokeStyle = '#334155';
        ctx.setLineDash([15, 15]);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]); 

        // Draw Sound Waves
        ctx.lineWidth = 2;
        for (let i = 0; i < waves.length; i++) {
            ctx.beginPath();
            ctx.arc(waves[i].x, waves[i].y, waves[i].radius, 0, Math.PI * 2);
            
            let alpha = Math.max(0, 1 - (waves[i].radius / (width * 0.7)));
            
            // Color waves based on position relative to source (simulating Doppler colors)
            // Waves emitted will bunch up on the right (approaching) and stretch on left (receding)
            let isApproaching = sourceX < observerX;
            if (sourceSpeed > 0 && isApproaching) {
                ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`; // Blueish for approach
            } else if (sourceSpeed > 0 && !isApproaching) {
                ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`; // Orangey for receding
            } else {
                ctx.strokeStyle = `rgba(156, 163, 175, ${alpha})`; // Gray for stationary
            }
            ctx.stroke();
        }

        // Draw Observer 🧍
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧍", observerX, observerY);
        
        // Draw Ambulance 🚑
        ctx.fillText("🚑", sourceX, sourceY);
        
        // Siren Light
        if (isPlaying && Math.floor(Date.now() / 150) % 2 === 0) {
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(sourceX - 5, sourceY - 15, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#EF4444';
        }
        ctx.shadowBlur = 0; // reset
    }

    function loop() {
        update();
        draw();
        if (isPlaying) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            btnPlay.innerHTML = '<i class="fa-solid fa-pause mr-2"></i> Pause';
            btnPlay.classList.replace('bg-green-500', 'bg-yellow-500');
            btnPlay.classList.replace('hover:bg-green-400', 'hover:bg-yellow-400');
            loop();
        } else {
            btnPlay.innerHTML = '<i class="fa-solid fa-play mr-2"></i> Start';
            btnPlay.classList.replace('bg-yellow-500', 'bg-green-500');
            btnPlay.classList.replace('hover:bg-yellow-400', 'hover:bg-green-400');
            cancelAnimationFrame(animationId);
        }
    }

    // Event Listeners
    slider.addEventListener('input', (e) => {
        updateSpeedUI(e.target.value);
        if (!isPlaying && sourceSpeed > 0) {
            togglePlay();
        }
    });

    btnPlay.addEventListener('click', togglePlay);

    // Initial Setup
    setTimeout(() => {
        resize();
        resetSim();
        updateSpeedUI(0);
    }, 150);
});
