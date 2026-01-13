// audio-player.js - Audio player UI component
import { $ } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';

class AudioPlayer {
  constructor() {
    this._audioElement = null;
  }
  
  initialize() {
    this._audioElement = $('#audioPlayer');
    
    if (!this._audioElement) {
      console.error('Audio element not found');
      return;
    }
    
    this._setupEventListeners();
    
    console.log('✅ Audio player UI initialized');
  }
  
  _setupEventListeners() {
    // Listen to user interactions with audio element
    this._audioElement.addEventListener('play', () => {
      console.log('User clicked play on audio element');
    });
    
    this._audioElement.addEventListener('pause', () => {
      console.log('User clicked pause on audio element');
    });
    
    this._audioElement.addEventListener('volumechange', () => {
      console.log('Volume changed:', this._audioElement.volume);
    });
    
    // Update time display
    this._audioElement.addEventListener('timeupdate', () => {
      // Could update custom time display here if needed
    });
    
    // Update duration display
    this._audioElement.addEventListener('loadedmetadata', () => {
      console.log('Duration:', this._audioElement.duration);
    });
  }
  
  getElement() {
    return this._audioElement;
  }
}

// Export singleton
export const audioPlayer = new AudioPlayer();
