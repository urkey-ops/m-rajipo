// memory-controls.js - Memory mode UI controls

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

    this._setupEventListeners();
    console.log('✅ Memory controls initialized');
  }

  _setupEventListeners() {
    // Speed slider
    if (this.speedSlider && this.speedDisplay) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.speedDisplay.textContent = `${speed.toFixed(1)}×`;
        memoryMode.updateSpeed(speed);
      });
    }

    // Time inputs
    if (this.startMinInput && this.startSecInput && this.endMinInput && this.endSecInput) {
      [this.startMinInput, this.startSecInput, this.endMinInput, this.endSecInput].forEach(input => {
        input.addEventListener('change', () => {
          this._updateSegmentFromInputs();
        });
      });
    }

    // Gap slider
    if (this.gapSlider && this.gapDisplay) {
      this.gapSlider.addEventListener('input', (e) => {
        const gap = parseInt(e.target.value);
        this.gapDisplay.textContent = `${gap}s`;
        memoryMode.updateGap(gap);
      });
    }

    // Buttons
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this._handleStart();
      });
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this._handlePause();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        memoryMode.reset();
        this._updateLoopCount(0);
      });
    }

    // Listen to memory events
    EventBus.on(EVENTS.MEMORY_LOOP_STARTED, () => {
      this._showPauseButton();
    });

    EventBus.on(EVENTS.MEMORY_LOOP_COMPLETED, (data) => {
      this._updateLoopCount(data.loopCount);
    });

    EventBus.on('memory:progress', (data) => {
      this._updateProgress(data);
    });

    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      if (data.count === 1) {
        this._showStartButton();
      }
    });
  }

  _updateSegmentFromInputs() {
    const startMin = parseInt(this.startMinInput.value) || 0;
    const startSec = parseInt(this.startSecInput.value) || 0;
    const endMin = parseInt(this.endMinInput.value) || 0;
    const endSec = parseInt(this.endSecInput.value) || 0;

    const startTime = startMin * 60 + startSec;
    const endTime = endMin * 60 + endSec;

    try {
      memoryMode.updateSegment(startTime, endTime);
    } catch (error) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: error.message,
        type: 'error'
      });
    }
  }

  async _handleStart() {
    try {
      await memoryMode.startLoop();
    } catch (error) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: error.message,
        type: 'error'
      });
    }
  }

  _handlePause() {
    const memState = memoryMode.getState();
    
    if (memState.isLooping) {
      memoryMode.pause();
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    } else {
      memoryMode.resume();
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
  }

  _showStartButton() {
    if (this.startBtn && this.pauseBtn) {
      removeClass(this.startBtn, 'hidden');
      addClass(this.pauseBtn, 'hidden');
    }
  }

  _showPauseButton() {
    if (this.startBtn && this.pauseBtn) {
      addClass(this.startBtn, 'hidden');
      removeClass(this.pauseBtn, 'hidden');
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
  }

  _updateProgress(data) {
    if (!this.progressBar || !this.progressText) return;

    const { currentTime, segmentStart, segmentEnd } = data;
    const segmentDuration = segmentEnd - segmentStart;
    const elapsed = currentTime - segmentStart;
    const percentage = Math.min(100, (elapsed / segmentDuration) * 100);

    this.progressBar.style.width = `${percentage}%`;
    
    const currentMin = Math.floor(currentTime / 60);
    const currentSec = Math.floor(currentTime % 60);
    const endMin = Math.floor(segmentEnd / 60);
    const endSec = Math.floor(segmentEnd % 60);
    
    this.progressText.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${endMin}:${endSec.toString().padStart(2, '0')}`;
  }

  _updateLoopCount(count) {
    if (this.loopCountDisplay) {
      this.loopCountDisplay.textContent = count;
    }
  }
}

// Export singleton
export const memoryControls = new MemoryControls();
