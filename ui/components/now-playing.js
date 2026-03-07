// now-playing.js - CLEANED UP VERSION
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
    EventBus.on(EVENTS.TRACK_CHANGED, (data) => {
      this.updateTrack(data.track);
    });

    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.mode === MODES.QUIZ;
      this.updateIcon();
      this.updateSpeed(this._isQuizMode ? 1.0 : this._currentSpeed);
    });

    // ✅ Uses EVENTS constant
    EventBus.on(EVENTS.REGULAR_MODE_SPEED_CHANGED, (speed) => {
      if (!this._isQuizMode) {
        this._currentSpeed = speed;
        this.updateSpeed(speed);
      }
    });

    EventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      const currentSpeed = state.get('audio.speed') || 1.0;
      if (!this._isQuizMode) {
        this._currentSpeed = currentSpeed;
        this.updateSpeed(currentSpeed);
      }
    });

    EventBus.on(EVENTS.PLAYBACK_STOPPED, () => {
      this.reset();
    });

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

  _handleGapStarted(data) {
    this._isInGap = true;
    this._gapNextTrack = data.nextTrack;

    if (this._nowPlayingShloka) {
      this._originalText = this._nowPlayingShloka.textContent;
    }

    if (this._nowPlayingIcon) {
      this._nowPlayingIcon.className = 'fa-solid fa-hourglass-half';
    }

    if (this._nowPlayingShloka) {
      const nextInfo = data.nextTrack ? ` (Next: Shloka ${data.nextTrack})` : '';
      this._nowPlayingShloka.textContent = `Gap: ${data.duration}s${nextInfo}`;
    }

    console.log(`⏸️ Gap display: ${data.duration}s until track ${data.nextTrack}`);
  }

  _handleGapTick(data) {
    if (!this._isInGap) return;

    if (this._nowPlayingShloka) {
      const nextInfo = data.nextTrack ? ` (Next: Shloka ${data.nextTrack})` : '';
      this._nowPlayingShloka.textContent = `Gap: ${data.remaining}s${nextInfo}`;
    }
  }

  _handleGapEnded() {
    this._isInGap = false;
    this._gapNextTrack = null;

    if (this._nowPlayingIcon) {
      this._nowPlayingIcon.className = this._isQuizMode
        ? 'fa-solid fa-brain'
        : 'fa-solid fa-play';
    }

    console.log('✓ Gap ended, resuming playback');
  }

  updateTrack(trackNum) {
    if (this._isInGap) return;

    if (this._nowPlayingShloka) {
      this._nowPlayingShloka.textContent = trackNum ? `Shloka ${trackNum}` : 'Mission Rajipo';
    }
  }

  updateSpeed(speed) {
    if (this._nowPlayingSpeed) {
      this._nowPlayingSpeed.textContent = `${speed.toFixed(1)}×`;
    }
    this._currentSpeed = speed;
  }

  updateIcon() {
    if (this._isInGap) return;

    if (this._nowPlayingIcon) {
      this._nowPlayingIcon.className = this._isQuizMode
        ? 'fa-solid fa-brain'
        : 'fa-solid fa-play';
    }
  }

  update(trackNum, speed = 1.0) {
    this.updateTrack(trackNum);
    this.updateSpeed(this._isQuizMode ? 1.0 : speed);
  }

  reset() {
    this._isInGap = false;
    this._gapNextTrack = null;
    this._originalText = null;

    this.updateTrack(null);
    this.updateSpeed(this._isQuizMode ? 1.0 : this._currentSpeed);
    this.updateIcon();
  }
}

export const nowPlaying = new NowPlaying();
