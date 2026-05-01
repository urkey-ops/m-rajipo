// memory-mode.js - CLEANED UP VERSION
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
    this._monitoringTimerId = null;
    this._hasReachedEnd = false;
    this._isCustomSegment = false;

    // ✅ Gap resume state: track how much gap time remains on pause
    this._gapStartedAt = null;
    this._gapRemaining = null;

    this._eventCleanupFunctions = [];

    this._setupEventListeners();
  }

  _setupEventListeners() {
    const trackEndedCleanup = EventBus.on(EVENTS.TRACK_ENDED, () => {
      if (!this._isActive || !this._isLooping) return;

      console.log('⚠️ Memory: Track ended unexpectedly, restarting segment');
      this._hasReachedEnd = false;
      this._seekAndPlay(this._settings.startTime).catch(console.error);
    });
    this._eventCleanupFunctions.push(trackEndedCleanup);

    const playbackErrorCleanup = EventBus.on(EVENTS.PLAYBACK_ERROR, () => {
      if (!this._isActive || !this._isLooping) return;

      console.error('❌ Memory: Playback error, stopping loop');
      this._stopLooping();
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Audio error in memory loop',
        type: 'error'
      });
    });
    this._eventCleanupFunctions.push(playbackErrorCleanup);
  }

  initialize() {
    if (this._isActive) return;

    const savedSettings = storageService.load('memorySettings');
    if (savedSettings) {
      this._settings = { ...this._settings, ...savedSettings };
      this._isCustomSegment = savedSettings.isCustomSegment || false;
    }

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
    audioService.setPlaybackRate(this._settings.speed);

    console.log('✅ Memory mode initialized', this._settings);
  }

  cleanup() {
    if (!this._isActive) return;

    console.log('🧹 Cleaning up Memory Mode');

    this._eventCleanupFunctions.forEach(cleanup => cleanup());
    this._eventCleanupFunctions = [];

    this._stopLooping();
    this._clearMonitoringTimer();

    if (audioService.isPlaying()) audioService.stop();

    this._currentTrack = null;
    this._isActive = false;
    this._loopCount = 0;

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.MEMORY_MODE_CLEANUP);
    console.log('✅ Memory mode cleaned up');
  }

  async _seekAndPlay(time) {
    const audio = audioService.getAudioElement();
    if (!audio) return;

    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        cleanup();
        audioService.play().then(resolve).catch(reject);
      };
      const onError = (e) => {
        cleanup();
        reject(e);
      };
      const cleanup = () => {
        audio.removeEventListener('seeked', onSeeked);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('seeked', onSeeked, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audioService.seek(time);
    });
  }

  async startLoop() {
    if (!this._isActive) throw new Error('Memory mode not initialized');

    const selectedTracks = selectionManager.getSelection();
    if (selectedTracks.length !== 1) throw new Error('Memory mode requires exactly 1 selected track');

    this._currentTrack = Number(selectedTracks[0]);
    console.log(`🧠 Starting memory loop for track ${this._currentTrack}`);

    try {
      await audioService.loadTrack(this._currentTrack);

      this._trackDuration = audioService.getDuration();

      if (!this._isCustomSegment) {
        this._settings.startTime = 0;
        this._settings.endTime = Math.floor(this._trackDuration);

        state.update({
          'memoryMode.startTime': 0,
          'memoryMode.endTime': this._settings.endTime
        });

        console.log(`📐 Using full track: 0s → ${this._settings.endTime}s`);

        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: `Playing full track (${this._formatTime(this._settings.endTime)})`,
          type: 'info'
        });
      } else {
        if (this._settings.endTime > this._trackDuration) {
          this._settings.endTime = Math.floor(this._trackDuration);
          state.set('memoryMode.endTime', this._settings.endTime);
        }

        if (this._settings.startTime >= this._settings.endTime) {
          this._settings.startTime = Math.max(0, this._settings.endTime - 1);
          state.set('memoryMode.startTime', this._settings.startTime);
        }

        console.log(`📐 Using custom segment: ${this._settings.startTime}s → ${this._settings.endTime}s`);

        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: `Looping ${this._formatTime(this._settings.startTime)} - ${this._formatTime(this._settings.endTime)}`,
          type: 'info'
        });
      }

      audioService.setPlaybackRate(this._settings.speed);

      this._loopCount = 0;
      this._isLooping = true;
      this._isInGap = false;
      this._hasReachedEnd = false;

      state.update({
        'memoryMode.currentTrack': this._currentTrack,
        'memoryMode.isLooping': true,
        'memoryMode.loopCount': 0
      });

      this._setupMonitoringTimer();

      await this._seekAndPlay(this._settings.startTime);

      EventBus.emit(EVENTS.MEMORY_LOOP_STARTED, {
        track: this._currentTrack,
        startTime: this._settings.startTime,
        endTime: this._settings.endTime,
        gap: this._settings.gapDuration,
        isFullTrack: !this._isCustomSegment
      });

    } catch (error) {
      console.error('Failed to start memory loop:', error);
      this._stopLooping();
      throw error;
    }
  }

  _setupMonitoringTimer() {
    this._clearMonitoringTimer();

    const targetEnd = this._settings.endTime;

    console.log(`👁️ Memory: Starting monitoring, will loop at ${targetEnd}s`);

    this._monitoringTimerId = setInterval(() => {
      if (!this._isLooping || this._isInGap || !this._isActive) return;

      const currentTime = audioService.getCurrentTime();

      if (currentTime >= targetEnd - 0.05 && !this._hasReachedEnd) {
        console.log(`🔄 Memory: Reached ${currentTime.toFixed(2)}s (target: ${targetEnd}s), looping`);
        this._hasReachedEnd = true;
        this._handleSegmentEnd();
      } else if (currentTime < targetEnd - 0.2) {
        this._hasReachedEnd = false;
      }

      // ✅ Uses EVENTS constant
      EventBus.emit(EVENTS.MEMORY_PROGRESS, {
        currentTime,
        segmentStart: this._settings.startTime,
        segmentEnd: this._settings.endTime,
        loopCount: this._loopCount
      });
    }, 50);

    console.log(`👁️ Memory monitoring started`);
  }

  _clearMonitoringTimer() {
    if (this._monitoringTimerId) {
      clearInterval(this._monitoringTimerId);
      this._monitoringTimerId = null;
      console.log('🛑 Memory monitoring timer cleared');
    }
  }

  _handleSegmentEnd() {
    audioService.pause();

    this._loopCount++;
    state.set('memoryMode.loopCount', this._loopCount);
    EventBus.emit(EVENTS.MEMORY_LOOP_COMPLETED, {
      loopCount: this._loopCount,
      track: this._currentTrack
    });

    if (this._settings.gapDuration > 0) {
      this._startGap();
    } else {
      this._hasReachedEnd = false;
      this._seekAndPlay(this._settings.startTime).catch(console.error);
    }
  }

  _startGap() {
    this._isInGap = true;
    this._gapStartedAt = Date.now(); // ✅ Track when gap started (for resume)
    this._gapRemaining = this._settings.gapDuration;

    const gapMs = this._settings.gapDuration * TIMING.MS_PER_SECOND;

    EventBus.emit(EVENTS.MEMORY_GAP_STARTED, {
      gapDuration: this._settings.gapDuration,
      loopCount: this._loopCount
    });

    this._gapTimerId = timerManager.startDelay(gapMs, () => this._endGap());
  }

  _endGap() {
    if (!this._isActive) return;

    this._isInGap = false;
    this._gapTimerId = null;
    this._gapStartedAt = null;
    this._gapRemaining = null;
    this._hasReachedEnd = false;
    this._seekAndPlay(this._settings.startTime).catch(console.error);
  }

  pause() {
    if (!this._isLooping) return;
    audioService.pause();

    // ✅ FIXED: Store remaining gap time so resume continues from where we left off
    if (this._isInGap && this._gapTimerId) {
      const elapsed = Math.floor((Date.now() - (this._gapStartedAt || Date.now())) / 1000);
      this._gapRemaining = Math.max(0, this._settings.gapDuration - elapsed);

      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
      console.log(`⏸️ Gap paused with ${this._gapRemaining}s remaining`);
    }
  }

  resume() {
    if (!this._isLooping) return;

    if (this._isInGap) {
      // ✅ FIXED: Resume with remaining time, not full gap duration
      const remainingMs = (this._gapRemaining ?? this._settings.gapDuration) * TIMING.MS_PER_SECOND;
      console.log(`▶️ Resuming gap with ${this._gapRemaining ?? this._settings.gapDuration}s remaining`);

      this._gapStartedAt = Date.now();
      this._gapTimerId = timerManager.startDelay(remainingMs, () => this._endGap());
    } else {
      const currentTime = audioService.getCurrentTime();

      if (currentTime < this._settings.startTime || currentTime >= this._settings.endTime) {
        this._seekAndPlay(this._settings.startTime).catch(console.error);
      } else {
        audioService.play().catch(console.error);
      }
    }
  }

  _stopLooping() {
    this._isLooping = false;
    this._isInGap = false;
    this._hasReachedEnd = false;
    this._gapStartedAt = null;
    this._gapRemaining = null;

    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
    }

    this._clearMonitoringTimer();

    state.update({ 'memoryMode.isLooping': false });
  }

  stop() {
    this._stopLooping();
    audioService.stop();
  }

  resetToFullTrack() {
    if (!this._currentTrack) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Please start a loop first',
        type: 'warning'
      });
      return;
    }

    this._settings.startTime = 0;
    this._settings.endTime = Math.floor(this._trackDuration);
    this._isCustomSegment = false;

    state.update({
      'memoryMode.startTime': 0,
      'memoryMode.endTime': this._settings.endTime
    });

    this._saveSettings();

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Reset to full track (${this._formatTime(this._settings.endTime)})`,
      type: 'success'
    });

    if (this._isLooping) {
      this._stopLooping();
      this.startLoop().catch(console.error);
    }

    console.log(`🔄 Reset to full track: 0s → ${this._settings.endTime}s`);
  }

    reset() {
    console.log('🔄 Full memory mode reset');

    // 1. Stop all activity first
    this.stop();

    // 2. Reset all internal state to defaults
    this._currentTrack = null;
    this._isLooping = false;
    this._isInGap = false;
    this._hasReachedEnd = false;
    this._isCustomSegment = false;
    this._loopCount = 0;
    this._trackDuration = 0;
    this._gapStartedAt = null;
    this._gapRemaining = null;

    // 3. Reset settings to defaults (preserve user preferences from storage)
    const savedSettings = storageService.load('memorySettings') || {};
    this._settings.startTime = savedSettings.startTime ?? DEFAULT_SETTINGS.MEMORY_START_TIME;
    this._settings.endTime = savedSettings.endTime ?? DEFAULT_SETTINGS.MEMORY_END_TIME;
    this._settings.gapDuration = savedSettings.gapDuration ?? DEFAULT_SETTINGS.MEMORY_GAP;
    this._settings.speed = savedSettings.speed ?? DEFAULT_SETTINGS.SPEED;

    // 4. ✅ Comprehensive state sync
    state.update({
      'memoryMode.startTime': this._settings.startTime,
      'memoryMode.endTime': this._settings.endTime,
      'memoryMode.gapDuration': this._settings.gapDuration,
      'memoryMode.speed': this._settings.speed,
      'memoryMode.currentTrack': null,
      'memoryMode.isLooping': false,
      'memoryMode.loopCount': 0,
      'memoryMode.trackDuration': 0,
      'memoryMode.isCustomSegment': false
    });

    // 5. Reset audio service
    audioService.reset();

    // 6. Save updated settings
    this._saveSettings();

    // 7. Emit reset event
    EventBus.emit(EVENTS.MEMORY_MODE_RESET);

    console.log('✅ Memory mode fully reset');
  }

  updateSegment(startTime, endTime) {
    if (!this._currentTrack) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Please select a track and start loop first',
        type: 'warning'
      });
      return;
    }

    const start = Math.max(0, Math.floor(startTime));
    let end = Math.floor(endTime);
    if (this._trackDuration > 0) end = Math.min(this._trackDuration, end);
    if (start >= end) throw new Error('Start time must be less than end time');

    this._settings.startTime = start;
    this._settings.endTime = end;
    this._isCustomSegment = true;

    state.update({
      'memoryMode.startTime': start,
      'memoryMode.endTime': end
    });
    this._saveSettings();

    EventBus.emit(EVENTS.MEMORY_SEGMENT_UPDATED, { start, end });

    if (this._isLooping) {
      this._stopLooping();
      this.startLoop().catch(console.error);
    }

    console.log(`📐 Segment updated: ${this._formatTime(start)} → ${this._formatTime(end)}`);
  }

  updateGap(seconds) {
    this._settings.gapDuration = seconds;
    state.set('memoryMode.gapDuration', seconds);
    this._saveSettings();
  }

  updateSpeed(speed) {
    this._settings.speed = speed;
    audioService.setPlaybackRate(speed);
    state.set('memoryMode.speed', speed);
    this._saveSettings();
  }

  _saveSettings() {
    const settingsToSave = {
      ...this._settings,
      isCustomSegment: this._isCustomSegment
    };
    storageService.save('memorySettings', settingsToSave);
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getSettings() { return { ...this._settings }; }

  getState() {
    return {
      currentTrack: this._currentTrack,
      isLooping: this._isLooping,
      isInGap: this._isInGap,
      loopCount: this._loopCount,
      trackDuration: this._trackDuration,
      isCustomSegment: this._isCustomSegment
    };
  }

  isActive() { return this._isActive; }
  isLooping() { return this._isLooping; }

  validate() {
    const count = selectionManager.getCount();
    if (count === 0) return { valid: false, error: 'Please select 1 shloka for memory mode' };
    if (count > 1) return { valid: false, error: 'Memory mode supports only 1 shloka at a time' };
    return { valid: true };
  }
}

export const memoryMode = new MemoryMode();
