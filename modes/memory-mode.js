// memory-mode.js - Memory mode logic for single-track segment looping

import { EVENTS, MODES, DEFAULT_SETTINGS, TIMING } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { audioService } from '../services/audio-service.js';
import { storageService } from '../services/storage-service.js';
import { selectionManager } from '../managers/selection-manager.js';
import { timerManager } from '../managers/timer-manager.js';

class MemoryMode {
  constructor() {
    this._isActive = false;
    this._settings = {
      startTime: DEFAULT_SETTINGS.MEMORY_START_TIME,
      endTime: DEFAULT_SETTINGS.MEMORY_END_TIME,
      gapDuration: DEFAULT_SETTINGS.MEMORY_GAP,
      speed: DEFAULT_SETTINGS.SPEED
    };
    this._currentTrack = null;
    this._isLooping = false;
    this._isInGap = false;
    this._loopCount = 0;
    this._gapTimerId = null;
    this._trackDuration = 0;
    this._timeUpdateHandler = null;
  }

  initialize() {
    if (this._isActive) {
      console.warn('Memory mode already active');
      return;
    }

    console.log('🧠 Initializing Memory Mode');

    // Load saved settings
    const savedSettings = storageService.load('memorySettings');
    if (savedSettings) {
      this._settings = { ...this._settings, ...savedSettings };
    }

    // Update state
    state.update({
      'memoryMode.startTime': this._settings.startTime,
      'memoryMode.endTime': this._settings.endTime,
      'memoryMode.gapDuration': this._settings.gapDuration,
      'memoryMode.speed': this._settings.speed,
      'memoryMode.loopCount': 0,
      'memoryMode.isLooping': false
    });

    this._isActive = true;
    state.setMode(MODES.MEMORY);

    console.log('✅ Memory mode initialized', this._settings);
  }

  cleanup() {
    if (!this._isActive) return;
    console.log('🧹 Cleaning up Memory Mode');

    this._stopLooping();
    this._removeTimeUpdateHandler();

    if (audioService.isPlaying()) {
      audioService.stop();
    }

    this._currentTrack = null;
    this._isActive = false;
    this._loopCount = 0;

    console.log('✅ Memory mode cleaned up');
  }

  async startLoop() {
    if (!this._isActive) {
      throw new Error('Memory mode not initialized');
    }

    const selectedTracks = selectionManager.getSelection();
    if (selectedTracks.length === 0) {
      throw new Error('No track selected');
    }

    if (selectedTracks.length > 1) {
      throw new Error('Memory mode supports only 1 track at a time');
    }

    this._currentTrack = selectedTracks[0];

    // Validate segment times
    if (this._settings.startTime >= this._settings.endTime) {
      throw new Error('Start time must be less than end time');
    }

    console.log(`🧠 Starting memory loop for track ${this._currentTrack}`);
    console.log(`Segment: ${this._formatTime(this._settings.startTime)} - ${this._formatTime(this._settings.endTime)}`);
    console.log(`Gap: ${this._settings.gapDuration}s, Speed: ${this._settings.speed}×`);

    try {
      await audioService.loadTrack(this._currentTrack);
      
      // Get track duration
      this._trackDuration = audioService.getDuration();
      
      // Validate times against duration
      if (this._settings.endTime > this._trackDuration) {
        this._settings.endTime = Math.floor(this._trackDuration);
        state.set('memoryMode.endTime', this._settings.endTime);
      }

      // Set speed
      audioService.setPlaybackRate(this._settings.speed);

      // Reset counters
      this._loopCount = 0;
      this._isLooping = true;
      this._isInGap = false;

      // Update state
      state.update({
        'memoryMode.currentTrack': this._currentTrack,
        'memoryMode.isLooping': true,
        'memoryMode.loopCount': 0
      });

      // Setup time update monitoring
      this._setupTimeUpdateHandler();

      // Start from segment start
      audioService.seek(this._settings.startTime);
      await audioService.play();

      EventBus.emit(EVENTS.MEMORY_LOOP_STARTED, {
        track: this._currentTrack,
        startTime: this._settings.startTime,
        endTime: this._settings.endTime,
        gap: this._settings.gapDuration
      });

    } catch (error) {
      console.error('Failed to start memory loop:', error);
      this._stopLooping();
      throw error;
    }
  }

  _setupTimeUpdateHandler() {
    this._removeTimeUpdateHandler();

    this._timeUpdateHandler = () => {
      if (!this._isLooping || this._isInGap) return;

      const currentTime = audioService.getCurrentTime();

      // Check if we've reached the end of segment
      if (currentTime >= this._settings.endTime) {
        this._handleSegmentEnd();
      }

      // Emit progress update
      EventBus.emit('memory:progress', {
        currentTime,
        segmentStart: this._settings.startTime,
        segmentEnd: this._settings.endTime,
        loopCount: this._loopCount
      });
    };

    const audioElement = audioService.getAudioElement();
    if (audioElement) {
      audioElement.addEventListener('timeupdate', this._timeUpdateHandler);
    }
  }

  _removeTimeUpdateHandler() {
    if (this._timeUpdateHandler) {
      const audioElement = audioService.getAudioElement();
      if (audioElement) {
        audioElement.removeEventListener('timeupdate', this._timeUpdateHandler);
      }
      this._timeUpdateHandler = null;
    }
  }

  _handleSegmentEnd() {
    this._loopCount++;
    
    console.log(`Loop ${this._loopCount} completed`);

    // Update state
    state.set('memoryMode.loopCount', this._loopCount);

    EventBus.emit(EVENTS.MEMORY_LOOP_COMPLETED, {
      loopCount: this._loopCount,
      track: this._currentTrack
    });

    if (this._settings.gapDuration > 0) {
      // Pause and start gap timer
      this._startGap();
    } else {
      // Instant loop - seek back to start
      audioService.seek(this._settings.startTime);
    }
  }

  _startGap() {
    audioService.pause();
    this._isInGap = true;

    console.log(`⏸️ Gap started: ${this._settings.gapDuration}s`);

    EventBus.emit(EVENTS.MEMORY_GAP_STARTED, {
      duration: this._settings.gapDuration
    });

    const gapMs = this._settings.gapDuration * TIMING.MS_PER_SECOND;

    this._gapTimerId = timerManager.startDelay(gapMs, () => {
      this._endGap();
    });
  }

  _endGap() {
    this._isInGap = false;
    this._gapTimerId = null;

    console.log('▶️ Gap ended, resuming loop');

    // Seek to start and play
    audioService.seek(this._settings.startTime);
    audioService.play().catch(console.error);
  }

  pause() {
    if (!this._isLooping) return;

    audioService.pause();
    
    // Clear gap timer if in gap
    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
    }

    console.log('⏸️ Memory loop paused');
  }

  resume() {
    if (!this._isLooping) return;

    if (this._isInGap) {
      // If paused during gap, restart gap timer
      const remainingGap = this._settings.gapDuration; // Simplified - could track partial
      const gapMs = remainingGap * TIMING.MS_PER_SECOND;
      this._gapTimerId = timerManager.startDelay(gapMs, () => {
        this._endGap();
      });
    } else {
      audioService.play().catch(console.error);
    }

    console.log('▶️ Memory loop resumed');
  }

  _stopLooping() {
    this._isLooping = false;
    this._isInGap = false;
    
    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
    }

    this._removeTimeUpdateHandler();

    state.update({
      'memoryMode.isLooping': false
    });
  }

  stop() {
    console.log('⏹️ Stopping memory loop');
    this._stopLooping();
    audioService.stop();
  }

  reset() {
    console.log('🔄 Resetting memory loop');
    this.stop();
    this._loopCount = 0;
    state.set('memoryMode.loopCount', 0);
  }

  // Update segment times
  updateSegment(startTime, endTime) {
    const start = Math.max(0, Math.floor(startTime));
    const end = Math.min(this._trackDuration || 9999, Math.floor(endTime));

    if (start >= end) {
      throw new Error('Start time must be less than end time');
    }

    this._settings.startTime = start;
    this._settings.endTime = end;

    state.update({
      'memoryMode.startTime': start,
      'memoryMode.endTime': end
    });

    this._saveSettings();

    EventBus.emit(EVENTS.MEMORY_SEGMENT_UPDATED, { start, end });

    console.log(`Segment updated: ${this._formatTime(start)} - ${this._formatTime(end)}`);
  }

  updateGap(seconds) {
    const gap = Math.max(DEFAULT_SETTINGS.MIN_MEMORY_GAP, Math.min(DEFAULT_SETTINGS.MAX_MEMORY_GAP, seconds));
    this._settings.gapDuration = gap;
    state.set('memoryMode.gapDuration', gap);
    this._saveSettings();
    console.log(`Gap updated: ${gap}s`);
  }

  updateSpeed(speed) {
    this._settings.speed = speed;
    audioService.setPlaybackRate(speed);
    state.set('memoryMode.speed', speed);
    this._saveSettings();
    console.log(`Speed updated: ${speed}×`);
  }

  _saveSettings() {
    storageService.save('memorySettings', this._settings);
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getSettings() {
    return { ...this._settings };
  }

  getState() {
    return {
      currentTrack: this._currentTrack,
      isLooping: this._isLooping,
      isInGap: this._isInGap,
      loopCount: this._loopCount,
      trackDuration: this._trackDuration
    };
  }

  isActive() {
    return this._isActive;
  }

  isLooping() {
    return this._isLooping;
  }

  validate() {
    const selectedCount = selectionManager.getCount();
    
    if (selectedCount === 0) {
      return { valid: false, error: 'Please select 1 shloka for memory mode' };
    }

    if (selectedCount > 1) {
      return { valid: false, error: 'Memory mode supports only 1 shloka at a time' };
    }

    return { valid: true };
  }
}

// Export singleton
export const memoryMode = new MemoryMode();
