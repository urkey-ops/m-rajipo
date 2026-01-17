// memory-mode.js - COMPLETE FIXED VERSION with Full Track Default
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
    this._hasReachedEnd = false;
    
    // ✅ NEW: Track if using default segment or user-defined
    this._isCustomSegment = false;
    
    // ✅ Setup event listeners
    this._setupEventListeners();
  }

  // ✅ Event listener setup
  _setupEventListeners() {
    // Handle unexpected track ending
    EventBus.on(EVENTS.TRACK_ENDED, () => {
      if (!this._isActive || !this._isLooping) return;
      
      console.log('⚠️ Memory: Track ended unexpectedly, restarting segment');
      this._hasReachedEnd = false;
      this._seekAndPlay(this._settings.startTime).catch(console.error);
    });
    
    // Handle audio errors
    EventBus.on(EVENTS.PLAYBACK_ERROR, () => {
      if (!this._isActive || !this._isLooping) return;
      
      console.error('❌ Memory: Playback error, stopping loop');
      this._stopLooping();
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Audio error in memory loop',
        type: 'error'
      });
    });
  }

  initialize() {
    if (this._isActive) return;

    const savedSettings = storageService.load('memorySettings');
    if (savedSettings) {
      this._settings = { ...this._settings, ...savedSettings };
      // ✅ If saved settings exist and differ from defaults, mark as custom
      this._isCustomSegment = savedSettings.startTime !== DEFAULT_SETTINGS.MEMORY_START_TIME || 
                              savedSettings.endTime !== DEFAULT_SETTINGS.MEMORY_END_TIME;
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

    this._stopLooping();
    this._removeTimeUpdateHandler();
    if (audioService.isPlaying()) audioService.stop();

    this._currentTrack = null;
    this._isActive = false;
    this._loopCount = 0;

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

    // Convert selection to number for Archive.org URL generation
    this._currentTrack = Number(selectedTracks[0]);
    console.log(`🧠 Starting memory loop for track ${this._currentTrack}`);

    try {
      await audioService.loadTrack(this._currentTrack);

      this._trackDuration = audioService.getDuration();
      
      // ✅ NEW: If no custom segment set, use FULL TRACK
      if (!this._isCustomSegment) {
        this._settings.startTime = 0;
        this._settings.endTime = Math.floor(this._trackDuration);
        
        state.update({
          'memoryMode.startTime': 0,
          'memoryMode.endTime': this._settings.endTime
        });
        
        console.log(`📐 Using full track: 0s → ${this._settings.endTime}s (${this._formatTime(this._settings.endTime)})`);
        
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: `Playing full track (${this._formatTime(this._settings.endTime)})`,
          type: 'info'
        });
      }
      // ✅ If custom segment exists, validate it
      else {
        // Clamp endTime to track duration
        if (this._settings.endTime > this._trackDuration) {
          this._settings.endTime = Math.floor(this._trackDuration);
          state.set('memoryMode.endTime', this._settings.endTime);
          console.log(`⚠️ End time clamped to track duration: ${this._settings.endTime}s`);
        }

        // Ensure start < end
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

      this._setupTimeUpdateHandler();

      // Start at correct segment
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

  _setupTimeUpdateHandler() {
    this._removeTimeUpdateHandler();
    this._timeUpdateHandler = () => {
      if (!this._isLooping || this._isInGap) return;
      const currentTime = audioService.getCurrentTime();

      if (currentTime >= this._settings.endTime && !this._hasReachedEnd) {
        this._hasReachedEnd = true;
        this._handleSegmentEnd();
      } else if (currentTime < this._settings.endTime - 0.2) {
        this._hasReachedEnd = false;
      }

      EventBus.emit('memory:progress', {
        currentTime,
        segmentStart: this._settings.startTime,
        segmentEnd: this._settings.endTime,
        loopCount: this._loopCount
      });
    };

    const audio = audioService.getAudioElement();
    if (audio) audio.addEventListener('timeupdate', this._timeUpdateHandler);
  }

  _removeTimeUpdateHandler() {
    if (this._timeUpdateHandler) {
      const audio = audioService.getAudioElement();
      if (audio) audio.removeEventListener('timeupdate', this._timeUpdateHandler);
      this._timeUpdateHandler = null;
    }
  }

  // ✅ FIXED: Pause first to prevent race condition
  _handleSegmentEnd() {
    // Pause first to prevent race condition
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
      // No gap - immediately restart
      this._hasReachedEnd = false;
      this._seekAndPlay(this._settings.startTime).catch(console.error);
    }
  }

  _startGap() {
    // Audio already paused in _handleSegmentEnd
    this._isInGap = true;
    const gapMs = this._settings.gapDuration * TIMING.MS_PER_SECOND;
    
    EventBus.emit(EVENTS.MEMORY_GAP_STARTED, {
      gapDuration: this._settings.gapDuration,
      loopCount: this._loopCount
    });
    
    this._gapTimerId = timerManager.startDelay(gapMs, () => this._endGap());
  }

  _endGap() {
    this._isInGap = false;
    this._gapTimerId = null;
    this._hasReachedEnd = false;
    this._seekAndPlay(this._settings.startTime).catch(console.error);
  }

  pause() {
    if (!this._isLooping) return;
    audioService.pause();
    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
    }
  }

  resume() {
    if (!this._isLooping) return;
    if (this._isInGap) {
      // Restart full gap duration (simplified approach)
      const gapMs = this._settings.gapDuration * TIMING.MS_PER_SECOND;
      this._gapTimerId = timerManager.startDelay(gapMs, () => this._endGap());
    } else {
      this._seekAndPlay(this._settings.startTime).catch(console.error);
    }
  }

  _stopLooping() {
    this._isLooping = false;
    this._isInGap = false;
    this._hasReachedEnd = false;
    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
    }
    this._removeTimeUpdateHandler();
    state.update({ 'memoryMode.isLooping': false });
  }

  stop() {
    this._stopLooping();
    audioService.stop();
  }

  // ✅ NEW: Reset to full track
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
    this._isCustomSegment = false; // ✅ Mark as using defaults
    
    state.update({
      'memoryMode.startTime': 0,
      'memoryMode.endTime': this._settings.endTime
    });
    
    this._saveSettings();
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Reset to full track (${this._formatTime(this._settings.endTime)})`,
      type: 'success'
    });
    
    // Restart loop with full track
    if (this._isLooping) {
      this._stopLooping();
      this.startLoop().catch(console.error);
    }
    
    console.log(`🔄 Reset to full track: 0s → ${this._settings.endTime}s`);
  }

  reset() {
    console.log('🔄 Resetting memory loop');
    this.stop();

    const savedSettings = storageService.load('memorySettings') || {};
    this._settings.startTime = savedSettings.startTime ?? DEFAULT_SETTINGS.MEMORY_START_TIME;
    this._settings.endTime = savedSettings.endTime ?? DEFAULT_SETTINGS.MEMORY_END_TIME;
    
    // ✅ Check if saved settings are custom
    this._isCustomSegment = savedSettings.startTime !== DEFAULT_SETTINGS.MEMORY_START_TIME || 
                            savedSettings.endTime !== DEFAULT_SETTINGS.MEMORY_END_TIME;
    
    state.update({ 
      'memoryMode.startTime': this._settings.startTime, 
      'memoryMode.endTime': this._settings.endTime 
    });

    this._loopCount = 0;
    state.set('memoryMode.loopCount', 0);

    if (this._currentTrack) {
      this.startLoop().catch(console.error);
    }
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
    this._isCustomSegment = true; // ✅ User has set custom segment
    
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
    storageService.save('memorySettings', this._settings); 
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
      isCustomSegment: this._isCustomSegment // ✅ Expose this
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
