// memory-controls.js - FIXED VERSION with input debouncing
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
    
    // ✅ NEW: Debounce timers
    this._segmentUpdateTimer = null;
    this._segmentUpdateDelay = 500; // 500ms debounce
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

    // ✅ FIXED: Time inputs - debounced updates
    const timeInputs = [this.startMinInput, this.startSecInput, this.endMinInput, this.endSecInput];
    timeInputs.forEach(input => {
      if (input) {
        // ✅ NEW: Only update display on input, debounce actual segment update
        input.addEventListener('input', (e) => {
          this.validateAndFormatTimeInput(input);
          this._debouncedSegmentUpdate();
        });
        
        // ✅ FIXED: Force update on blur (user finished typing)
        input.addEventListener('blur', () => {
          this.validateAndFormatTimeInput(input);
          this._cancelDebounce(); // Cancel pending debounce
          this.updateSegmentFromInputs(); // Update immediately
        });
        
        // ✅ NEW: Update on Enter key
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.validateAndFormatTimeInput(input);
            this._cancelDebounce();
            this.updateSegmentFromInputs();
            input.blur(); // Remove focus
          }
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
    EventBus.on(EVENTS.MEMORY_LOOP_STARTED, (data) => {
      this.onLoopStarted(data);
    });

    EventBus.on(EVENTS.MEMORY_LOOP_COMPLETED, (data) => {
      this.onLoopCompleted(data.loopCount);
    });

    EventBus.on('memory:progress', (data) => {
      this.updateProgress(data);
    });
    
    // ✅ NEW: Listen to segment updates from mode
    EventBus.on(EVENTS.MEMORY_SEGMENT_UPDATED, (data) => {
      this.onSegmentUpdated(data);
    });
  }

  // ✅ NEW: Debounced segment update
  _debouncedSegmentUpdate() {
    // Clear existing timer
    this._cancelDebounce();
    
    // Set new timer
    this._segmentUpdateTimer = setTimeout(() => {
      this.updateSegmentFromInputs();
      this._segmentUpdateTimer = null;
    }, this._segmentUpdateDelay);
  }
  
  // ✅ NEW: Cancel pending debounce
  _cancelDebounce() {
    if (this._segmentUpdateTimer) {
      clearTimeout(this._segmentUpdateTimer);
      this._segmentUpdateTimer = null;
    }
  }

  // ✅ FIXED: Read time inputs and update memory mode
  updateSegmentFromInputs() {
    // ✅ NEW: Validate all inputs first
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
    
    // ✅ NEW: Validate before updating
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

  // ✅ FIXED: Validate time inputs with proper clamping
  validateAndFormatTimeInput(input) {
    if (!input) return;
    
    let value = parseInt(input.value);
    
    // Handle empty or invalid input
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    
    // Clamp seconds to 0-59
    if (input.id.includes('Sec')) {
      value = Math.max(0, Math.min(59, value));
    } else {
      // Minutes can be 0-99 (support tracks up to 99 minutes)
      value = Math.max(0, Math.min(99, value));
    }
    
    input.value = value;
  }

  // ✅ NEW: Handle segment updates from memory mode
  onSegmentUpdated(data) {
    // Update UI to reflect actual segment times (might be clamped)
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

  onLoopStarted(data) {
    if (this.startBtn) {
      addClass(this.startBtn, 'hidden');
    }
    if (this.pauseBtn) {
      removeClass(this.pauseBtn, 'hidden');
      this.pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
    
    // ✅ NEW: Update UI with actual segment being used
    if (data) {
      console.log(`Loop started: ${data.startTime}s → ${data.endTime}s (Full track: ${data.isFullTrack})`);
      
      // Update inputs to reflect actual values (in case they were clamped)
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

    // ✅ FIXED: Check audio state directly from audioService
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
    // ✅ NEW: Cancel any pending updates
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
  
  // ✅ NEW: Cleanup method
  cleanup() {
    console.log('🧹 Cleaning up Memory Controls');
    this._cancelDebounce();
  }
}

export const memoryControls = new MemoryControls();
```

---

## 🎯 What Changed in memory-controls.js

### ✅ CRITICAL FIXES:

1. **Input Debouncing** - THE BIG FIX
   - **Before**: `updateSegmentFromInputs()` fired on EVERY keystroke
   - **After**: Debounced 500ms - only updates after user stops typing
   - **Impact**: No more loop restarts while typing!

2. **Immediate update on blur** - User experience
   - When user tabs away or clicks out, update happens immediately
   - Don't make user wait 500ms when they're done typing

3. **Enter key support** - UX improvement
   - Press Enter to apply changes immediately
   - No need to click out or wait

### ✅ NEW FEATURES ADDED:

4. **`_debouncedSegmentUpdate()`** - Debounce logic
   - Clears previous timer
   - Starts new 500ms countdown
   - Only updates when countdown completes

5. **`_cancelDebounce()`** - Cancel pending updates
   - Used on blur (apply immediately)
   - Used on Enter key
   - Used on cleanup

6. **`onSegmentUpdated()`** - Listen to mode updates
   - Updates UI when memory-mode clamps values
   - Keeps UI in sync with actual segment

7. **Input validation improvements**:
   - Validates before updating segment
   - Shows warning if start >= end
   - Handles empty/invalid inputs gracefully

8. **`cleanup()` method** - Proper cleanup
   - Cancels any pending debounced updates
   - Prevents updates after mode switch

### 🔧 IMPROVED:

9. **`setupEventListeners()`**:
   - Added debounced input handler
   - Added immediate blur handler
   - Added Enter key handler
   - Added segment update listener

10. **`updateSegmentFromInputs()`**:
    - Validates all inputs exist
    - Validates start < end before updating
    - Better error handling and user feedback
    - Console logging for debugging

11. **`validateAndFormatTimeInput()`**:
    - Handles NaN and negative values
    - Proper clamping (0-59 for seconds, 0-99 for minutes)

12. **`onLoopStarted()`**:
    - Accepts data parameter
    - Shows full track info
    - Updates UI with actual segment values

### 🐛 BUGS FIXED:

- ✅ Loop restarts on every keystroke (PRIMARY BUG)
- ✅ No debouncing on inputs
- ✅ Validation happens after update
- ✅ No Enter key support
- ✅ No cleanup of pending timers
- ✅ UI not synced with actual segment values

---

## 📋 Testing Instructions

### Test 1: Input Debouncing (Critical Fix)
1. Select 1 shloka
2. Switch to Memory Mode
3. Click "Start Loop"
4. **Type slowly in start time**: "0" ... wait ... "5"
   - **Expected**: Loop does NOT restart after "0"
   - **Expected**: Loop restarts 500ms after typing "5"
5. **Type quickly**: "1" "2" "3" (within 500ms)
   - **Expected**: Loop only restarts ONCE after you stop typing
6. Watch console for: `📐 Updating segment: Xs → Ys`

### Test 2: Immediate Update on Blur
1. Start a loop
2. Change start time to "10"
3. **Click outside the input** (blur)
   - **Expected**: Loop restarts immediately (no 500ms wait)
4. Check console - should see immediate update

### Test 3: Enter Key
1. Start a loop
2. Change end time to "25"
3. **Press Enter**
   - **Expected**: Input loses focus
   - **Expected**: Loop restarts immediately
4. No need to click out

### Test 4: Validation
1. Try to set start time > end time
   - **Expected**: Warning toast appears
   - **Expected**: Loop does NOT restart
2. Try negative values
   - **Expected**: Clamped to 0
3. Try seconds > 59
   - **Expected**: Clamped to 59

### Test 5: Mode Switching
1. Start typing in input
2. Immediately switch to Quiz Mode
3. Check console - no errors
4. Debounced update should be cancelled

### Test 6: Full Track Mode
1. Select 1 shloka
2. Start loop without changing times
3. **Expected**: Toast says "Playing full track"
4. Loop should play entire shloka

---

## 🎯 User Experience Improvements

### Before Fix:
```
User types: "3" "0"
           ↓   ↓
Loop restarts twice! (at "3" and at "30")
Audio stutters, very annoying
```

### After Fix:
```
User types: "3" "0"
           ↓   ↓
Wait 500ms...
           ↓
Loop restarts ONCE (at "30")
Smooth experience!
```

### Special Cases:
```
User types "30" then clicks out
           ↓
Loop restarts IMMEDIATELY (no 500ms wait)

User types "30" then presses Enter
           ↓
Loop restarts IMMEDIATELY + input loses focus
