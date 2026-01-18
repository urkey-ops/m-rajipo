// now-playing.js - Now playing display component (FIXED)
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
    
    // ✅ FIXED: Use correct property from event
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.mode === MODES.QUIZ; // ✅ FIXED: Use 'mode' property
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
  }
  
  // Update displayed track
  updateTrack(trackNum) {
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
    this.updateTrack(null);
    this.updateSpeed(this._isQuizMode ? 1.0 : this._currentSpeed);
  }
}

export const nowPlaying = new NowPlaying();
