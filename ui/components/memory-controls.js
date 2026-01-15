// memory-controls.js - COMPLETE FIXED VERSION

import { $, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';
import { memoryMode } from '../../modes/memory-mode.js';
import { state } from '../../core/state.js';

class MemoryControls {
  constructor() {
    this.container = null;
    this.speedSlider = null;
    this.speedDisplay = null;
    this.startMinInput = null;
    this.startSecInput = null;
    this.endMinInput = null;
    this.endSecInput = null;
    this.gapSlider = null;
    this.gapDisplay = null;
    this.progressBar = null;
    this.progressText = null;
    this.loopCountDisplay = null;
    this.startBtn = null;
    this.pauseBtn = null;
    this.resetBtn = null;
  }

  initialize() {
    this.container = $('#memoryControls');
    this.speedSlider = $('#memorySpeedSlider');
    this.speedDisplay = $('#memorySpeedDisplay');
    this.startMinInput = $('#memoryStartMin');
    this.startSecInput = $('#memoryStartSec');
    this.endMinInput = $('#memoryEndMin');
    this.endSecInput = $('#memoryEndSec');
    this.gapSlider = $('#memoryGapSlider');
    this.gapDisplay = $('#memoryGapDisplay');
    this.progressBar = $('#memoryProgressBar');
    this.progressText = $('#memoryProgressText');
    this.loopCountDisplay = $('#memoryLoopCount');
    this.startBtn = $('#memoryStartBtn');
    this.pauseBtn = $('#memoryPauseBtn');
    this.resetBtn = $('#memoryResetBtn');

    this.setupEventListeners();
    this.loadSettings();

    console.log('✅ Memory controls initialized');
  }

  setupEventListeners() {
    // Speed slider
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.speedDisplay.textContent = `${speed.toFixed(1)}×`;
        memoryMode.updateSpeed(speed);
      });
    }

    // ✅ FIX: Time inputs - update segment when changed
    const timeInputs = [this.startMinInput, this.startSecInput, this.endMinInput, this.endSecInput];
    timeInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.updateSegmentFromInputs();
        });
        
        input.addEventListener('blur', () => {
          this.validateAndFormatTimeInput(input);
          this.updateSegmentFromInputs();
        });
      }
    });

    // Gap slider
    if (this.gapSlider) {
      this.gapSlider.addEventListener('input', (e) => {
        const gap = parseInt(e.target.value);
        this.gapDisplay.textContent = `${gap}s`;
        memoryMode.updateGap(gap);
      });
    }

    // Start button
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        EventBus.emit('fab:memory-clicked');
      });
    }

    // Pause button
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    // Reset button
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        memoryMode.reset();
      });
    }

    // Listen to selection changes
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this.updateStartButtonState(data.count);
    });

    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this.updateStartButtonState(0);
    });

    // Listen to memory mode events
    EventBus.on(EVENTS.MEMORY_LOOP_STARTED, () => {
      this.onLoopStarted();
    });

    EventBus.on(EVENTS.MEMORY_LOOP_COMPLETED, (data) => {
      this.onLoopCompleted(data.loopCount);
    });

    EventBus.on('memory:progress', (data) => {
      this.updateProgress(data);
    });
  }

  // ✅ FIX: Read time inputs and update memory mode
  updateSegmentFromInputs() {
    const startMin = parseInt(this.startMinInput?.value) || 0;
    const startSec = parseInt(this.startSecInput?.value) || 0;
    const endMin = parseInt(this.endMinInput?.value) || 0;
    const endSec = parseInt(this.endSecInput?.value) || 0;

    const startTime = startMin * 60 + startSec;
    const endTime = endMin * 60 + endSec;

    try {
      memoryMode.updateSegment(startTime, endTime);
    } catch (error) {
      console.warn('Invalid segment times:', error.message);
    }
  }

  // ✅ FIX: Validate time inputs
  validateAndFormatTimeInput(input) {
    let value = parseInt(input.value) || 0;
    
    // Clamp seconds to 0-59
    if (input.id.includes('Sec')) {
      value = Math.max(0, Math.min(59, value));
    } else {
      // Minutes can be 0-99
      value = Math.max(0, Math.min(99, value));
    }
    
    input.value = value;
  }

  loadSettings() {
    const settings = memoryMode.getSettings();
    
    // Speed
    if (this.speedSlider && this.speedDisplay) {
      this.speedSlider.value = settings.speed;
      this.speedDisplay.textContent = `${settings.speed.toFixed(1)}×`;
    }

    // Start time
    const startMin = Math.floor(settings.startTime / 60);
    const startSec = settings.startTime % 60;
    if (this.startMinInput) this.startMinInput.value = startMin;
    if (this.startSecInput) this.startSecInput.value = startSec;

    // End time
    const endMin = Math.floor(settings.endTime / 60);
    const endSec = settings.endTime % 60;
    if (this.endMinInput) this.endMinInput.value = endMin;
    if (this.endSecInput) this.endSecInput.value = endSec;

    // Gap
    if (this.gapSlider && this.gapDisplay) {
      this.gapSlider.value = settings.gapDuration;
      this.gapDisplay.textContent = `${settings.gapDuration}s`;
    }

    // Loop count
    if (this.loopCountDisplay) {
      this.loopCountDisplay.textContent = '0';
    }
  }

  updateStartButtonState(selectionCount) {
    if (!this.startBtn) return;

    const currentMode = state.get('currentMode');
    if (currentMode !== 'memory') return;

    if (selectionCount === 1) {
      this.startBtn.disabled = false;
      removeClass(this.startBtn, 'disabled');
    } else {
      this.startBtn.disabled = true;
      addClass(this.startBtn, 'disabled');
    }
  }

  onLoopStarted() {
    if (this.startBtn) {
      addClass(this.startBtn, 'hidden');
    }
    if (this.pauseBtn) {
      removeClass(this.pauseBtn, 'hidden');
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
  }

  onLoopCompleted(count) {
    if (this.loopCountDisplay) {
      this.loopCountDisplay.textContent = count;
    }
  }

  updateProgress(data) {
    const { currentTime, segmentStart, segmentEnd } = data;
    
    const segmentDuration = segmentEnd - segmentStart;
    const progress = segmentDuration > 0 
      ? ((currentTime - segmentStart) / segmentDuration) * 100 
      : 0;

    if (this.progressBar) {
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    if (this.progressText) {
      this.progressText.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(segmentEnd)}`;
    }
  }

  togglePause() {
    const memState = memoryMode.getState();
    
    if (!memState.isLooping) return;

    // Check if currently playing
    const audioElement = document.getElementById('audioPlayer');
    if (audioElement && audioElement.paused) {
      memoryMode.resume();
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    } else {
      memoryMode.pause();
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  reset() {
    this.loadSettings();
    
    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }
    if (this.progressText) {
      this.progressText.textContent = '0:00 / 0:20';
    }
    if (this.loopCountDisplay) {
      this.loopCountDisplay.textContent = '0';
    }
    if (this.startBtn) {
      removeClass(this.startBtn, 'hidden');
    }
    if (this.pauseBtn) {
      addClass(this.pauseBtn, 'hidden');
    }
  }
}

export const memoryControls = new MemoryControls();
