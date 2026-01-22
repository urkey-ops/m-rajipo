// now-playing.js - UPDATED with gap countdown display
import { $, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';

class NowPlaying {
  constructor() {
    this._nowPlayingText = null;
    this._nowPlayingIcon = null;
    this._nowPlayingShloka = null;
    this._nowPlayingSpeed = null;
    this._isQuizMode = false;
    this._currentSpeed = 1.0;
    
    // ✅ NEW: Gap state tracking
    this._isInGap = false;
    this._gapNextTrack = null;
    this._originalText = null;
  }
  
  initialize() {
    this._nowPlayingText = $('#nowPlayingText');
    this._nowPlayingIcon = $('#nowPlayingIcon');
    this._nowPlayingShloka = $('#nowPlayingShloka');
    this._nowPlayingSpeed = $('#nowPlayingSpeed');
    
    this._setupEventListeners();
    
    console.log('✅ Now Playing initialized');
  }
  
  _setupEventListeners() {
    // Listen to track changes
    EventBus.on(EVENTS.TRACK_CHANGED, (data) => {
      this.updateTrack(data.track);
    });
    
    // Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.mode === MODES.QUIZ;
      this.updateIcon();
      // Update speed display for new mode
      this.updateSpeed(this._isQuizMode ? 1.0 : this._currentSpeed);
    });
    
    // Listen to speed changes (from regular mode)
    EventBus.on('regular-mode:speed-changed', (speed) => {
      if (!this._isQuizMode) {
        this._currentSpeed = speed;
        this.updateSpeed(speed);
      }
    });
    
    // Listen to audio state changes
    EventBus.on(EVENTS.PLAYBACK_STARTED, (data) => {
      // Speed might have changed, update display
      const currentSpeed = state.get('audio.speed') || 1.0;
      if (!this._isQuizMode) {
        this._currentSpeed = currentSpeed;
        this.updateSpeed(currentSpeed);
      }
    });
    
    // Listen to playback stopped
    EventBus.on(EVENTS.PLAYBACK_STOPPED, () => {
      this.reset();
    });
    
    // ✅ NEW: Listen to gap events
    EventBus.on(EVENTS.REGULAR_GAP_STARTED, (data) => {
      this._handleGapStarted(data);
    });
    
    EventBus.on(EVENTS.REGULAR_GAP_TICK, (data) => {
      this._handleGapTick(data);
    });
    
    EventBus.on(EVENTS.REGULAR_GAP_ENDED, () => {
      this._handleGapEnded();
    });
  }
  
  // ✅ NEW: Handle gap started
  _handleGapStarted(data) {
    this._isInGap = true;
    this._gapNextTrack = data.nextTrack;
    
    // Store original text to restore later
    if (this._nowPlayingShloka) {
      this._originalText = this._nowPlayingShloka.textContent;
    }
    
    // Update icon to pause during gap
    if (this._nowPlayingIcon) {
      this._nowPlayingIcon.className = 'fa-solid fa-hourglass-half';
    }
    
    // Show gap message with next track info
    if (this._nowPlayingShloka) {
      const nextInfo = data.nextTrack ? ` (Next: Shloka ${data.nextTrack})` : '';
      this._nowPlayingShloka.textContent = `Gap: ${data.duration}s${nextInfo}`;
    }
    
    console.log(`⏸️ Gap display: ${data.duration}s until track ${data.nextTrack}`);
  }
  
  // ✅ NEW: Handle gap countdown tick
  _handleGapTick(data) {
    if (!this._isInGap) return;
    
    // Update countdown in real-time
    if (this._nowPlayingShloka) {
      const nextInfo = data.nextTrack ? ` (Next: Shloka ${data.nextTrack})` : '';
      this._nowPlayingShloka.textContent = `Gap: ${data.remaining}s${nextInfo}`;
    }
  }
  
  // ✅ NEW: Handle gap ended
  _handleGapEnded() {
    this._isInGap = false;
    this._gapNextTrack = null;
    
    // Restore play icon
    if (this._nowPlayingIcon) {
      if (this._isQuizMode) {
        this._nowPlayingIcon.className = 'fa-solid fa-brain';
      } else {
        this._nowPlayingIcon.className = 'fa-solid fa-play';
      }
    }
    
    // Text will be updated by TRACK_CHANGED event when next track plays
    console.log('✓ Gap ended, resuming playback');
  }
  
  // Update displayed track
  updateTrack(trackNum) {
    // ✅ UPDATED: Don't update if in gap (countdown takes priority)
    if (this._isInGap) {
      return;
    }
    
    if (this._nowPlayingShloka) {
      if (trackNum) {
        this._nowPlayingShloka.textContent = `Shloka ${trackNum}`;
      } else {
        this._nowPlayingShloka.textContent = 'Mission Rajipo';
      }
    }
  }
  
  // Update speed display
  updateSpeed(speed) {
    if (this._nowPlayingSpeed) {
      this._nowPlayingSpeed.textContent = `${speed.toFixed(1)}×`;
    }
    this._currentSpeed = speed;
  }
  
  // Update icon based on mode
  updateIcon() {
    // ✅ UPDATED: Don't change icon if in gap
    if (this._isInGap) {
      return;
    }
    
    if (this._nowPlayingIcon) {
      if (this._isQuizMode) {
        this._nowPlayingIcon.className = 'fa-solid fa-brain';
      } else {
        this._nowPlayingIcon.className = 'fa-solid fa-play';
      }
    }
  }
  
  // Update both track and speed
  update(trackNum, speed = 1.0) {
    this.updateTrack(trackNum);
    if (!this._isQuizMode) {
      this.updateSpeed(speed);
    } else {
      this.updateSpeed(1.0); // Always 1.0 in quiz mode
    }
  }
  
  // Reset to default state
  reset() {
    // ✅ UPDATED: Clear gap state
    this._isInGap = false;
    this._gapNextTrack = null;
    this._originalText = null;
    
    this.updateTrack(null);
    this.updateSpeed(this._isQuizMode ? 1.0 : this._currentSpeed);
    this.updateIcon();
  }
}

export const nowPlaying = new NowPlaying();
