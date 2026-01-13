// now-playing.js - Now playing display component
import { $, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';

class NowPlaying {
  constructor() {
    this._nowPlayingText = null;
    this._nowPlayingIcon = null;
    this._nowPlayingShloka = null;
    this._nowPlayingSpeed = null;
    this._isQuizMode = false;
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
      this._isQuizMode = data.to === 'quiz';
      this.updateIcon();
    });
    
    // Listen to speed changes
    EventBus.on('regular-mode:speed-changed', (speed) => {
      if (!this._isQuizMode) {
        this.updateSpeed(speed);
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
    this.updateSpeed(1.0);
  }
}

// Export singleton
export const nowPlaying = new NowPlaying();
