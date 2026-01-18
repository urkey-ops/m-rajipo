// memory-controls.js - FIXED VERSION with input debouncing and proper cleanup
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
    
    this._segmentUpdateTimer = null;
    this._segmentUpdateDelay = 500;
    
    // ✅ NEW: Track event cleanup functions
    this._eventCleanupFunctions = [];
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
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        if (this.speedDisplay) {
          this.speedDisplay.textContent = `${speed.toFixed(1)}×`;
        }
        memoryMode.updateSpeed(speed);
      });
    }

    const timeInputs = [this.startMinInput, this.startSecInput, this.endMinInput, this.endSecInput];
    timeInputs.forEach(input => {
      if (!input) return;
      
      input.addEventListener('input', () => {
        this.validateAndFormatTimeInput(input);
        this._debouncedSegmentUpdate();
      });
      
      input.addEventListener('blur', () => {
        this.validateAndFormatTimeInput(input);
        this._cancelDebounce();
        this.updateSegmentFromInputs();
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.validateAndFormatTimeInput(input);
          this._cancelDebounce();
          this.updateSegmentFromInputs();
          input.blur();
        }
      });
    });

    if (this.gapSlider) {
      this.gapSlider.addEventListener('input', (e) => {
        const gap = parseInt(e.target.value);
        if (this.gapDisplay) {
          this.gapDisplay.textContent = `${gap}s`;
        }
        memoryMode.updateGap(gap);
      });
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        EventBus.emit('fab:memory-clicked');
      });
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        memoryMode.reset();
      });
    }

    // ✅ FIXED: Store cleanup functions
    const selectionChangedCleanup = EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this.updateStartButtonState(data.count);
    });
    this._eventCleanupFunctions.push(selectionChangedCleanup);

    const selectionClearedCleanup = EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this.updateStartButtonState(0);
    });
    this._eventCleanupFunctions.push(selectionClearedCleanup);

    const loopStartedCleanup = EventBus.on(EVENTS.MEMORY_LOOP_STARTED, (data) => {
      this.onLoopStarted(data);
    });
    this._eventCleanupFunctions.push(loopStartedCleanup);

    const loopCompletedCleanup = EventBus.on(EVENTS.MEMORY_LOOP_COMPLETED, (data) => {
      this.onLoopCompleted(data.loopCount);
    });
    this._eventCleanupFunctions.push(loopCompletedCleanup);

    const progressCleanup = EventBus.on('memory:progress', (data) => {
      this.updateProgress(data);
    });
    this._eventCleanupFunctions.push(progressCleanup);
    
    const segmentUpdatedCleanup = EventBus.on(EVENTS.MEMORY_SEGMENT_UPDATED, (data) => {
      this.onSegmentUpdated(data);
    });
    this._eventCleanupFunctions.push(segmentUpdatedCleanup);
  }

  _debouncedSegmentUpdate() {
    this._cancelDebounce();
    this._segmentUpdateTimer = setTimeout(() => {
      this.updateSegmentFromInputs();
      this._segmentUpdateTimer = null;
    }, this._segmentUpdateDelay);
  }
  
  // ✅ FIXED: Properly cancel debounce timer
  _cancelDebounce() {
    if (this._segmentUpdateTimer) {
      clearTimeout(this._segmentUpdateTimer);
      this._segmentUpdateTimer = null;
    }
  }

  updateSegmentFromInputs() {
    if (!this.startMinInput || !this.startSecInput || !this.endMinInput || !this.endSecInput) {
      console.warn('Time input elements not initialized');
      return;
    }
    
    const startMin = parseInt(this.startMinInput.value) || 0;
    const startSec = parseInt(this.startSecInput.value) || 0;
    const endMin = parseInt(this.endMinInput.value) || 0;
    const endSec = parseInt(this.endSecInput.value) || 0;

    const startTime = startMin * 60 + startSec;
    const endTime = endMin * 60 + endSec;
    
    if (startTime >= endTime) {
      console.warn('Invalid segment: start must be less than end');
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Start time must be less than end time',
        type: 'warning'
      });
      return;
    }

    try {
      console.log(`📐 Updating segment: ${startTime}s → ${endTime}s`);
      memoryMode.updateSegment(startTime, endTime);
    } catch (error) {
      console.warn('Failed to update segment:', error.message);
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: error.message,
        type: 'error'
      });
    }
  }

  validateAndFormatTimeInput(input) {
    if (!input) return;
    
    let value = parseInt(input.value);
    
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    
    if (input.id.includes('Sec')) {
      value = Math.max(0, Math.min(59, value));
    } else {
      value = Math.max(0, Math.min(99, value));
    }
    
    input.value = value;
  }

  onSegmentUpdated(data) {
    const startMin = Math.floor(data.start / 60);
    const startSec = data.start % 60;
    const endMin = Math.floor(data.end / 60);
    const endSec = data.end % 60;
    
    if (this.startMinInput) this.startMinInput.value = startMin;
    if (this.startSecInput) this.startSecInput.value = startSec;
    if (this.endMinInput) this.endMinInput.value = endMin;
    if (this.endSecInput) this.endSecInput.value = endSec;
    
    console.log(`✅ UI updated to reflect segment: ${data.start}s → ${data.end}s`);
  }

  loadSettings() {
    const settings = memoryMode.getSettings();
    
    if (this.speedSlider && this.speedDisplay) {
      this.speedSlider.value = settings.speed;
      this.speedDisplay.textContent = `${settings.speed.toFixed(1)}×`;
    }

    const startMin = Math.floor(settings.startTime / 60);
    const startSec = settings.startTime % 60;
    if (this.startMinInput) this.startMinInput.value = startMin;
    if (this.startSecInput) this.startSecInput.value = startSec;

    const endMin = Math.floor(settings.endTime / 60);
    const endSec = settings.endTime % 60;
    if (this.endMinInput) this.endMinInput.value = endMin;
    if (this.endSecInput) this.endSecInput.value = endSec;

    if (this.gapSlider && this.gapDisplay) {
      this.gapSlider.value = settings.gapDuration;
      this.gapDisplay.textContent = `${settings.gapDuration}s`;
    }

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

  onLoopStarted(data) {
    if (this.startBtn) {
      addClass(this.startBtn, 'hidden');
    }
    if (this.pauseBtn) {
      removeClass(this.pauseBtn, 'hidden');
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
    
    if (data) {
      console.log(`Loop started: ${data.startTime}s → ${data.endTime}s (Full track: ${data.isFullTrack})`);
      
      if (data.isFullTrack) {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Playing full track',
          type: 'info'
        });
      }
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
    
    if (!memState.isLooping) {
      console.warn('Cannot pause - not looping');
      return;
    }

    const audioElement = document.getElementById('audioPlayer');
    if (!audioElement) {
      console.error('Audio element not found');
      return;
    }
    
    if (audioElement.paused) {
      memoryMode.resume();
      if (this.pauseBtn) {
        this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      }
    } else {
      memoryMode.pause();
      if (this.pauseBtn) {
        this.pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
      }
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  reset() {
    this._cancelDebounce();
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
  
  // ✅ NEW: Proper cleanup method
  cleanup() {
    console.log('🧹 Cleaning up Memory Controls');
    
    // Cancel any pending debounce
    this._cancelDebounce();
    
    // Remove all event listeners
    this._eventCleanupFunctions.forEach(cleanup => cleanup());
    this._eventCleanupFunctions = [];
  }
}

export const memoryControls = new MemoryControls();
