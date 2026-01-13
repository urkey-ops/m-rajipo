// validation.js - Input validation utilities
import { TOTAL_TRACKS, DEFAULT_SETTINGS } from '../core/constants.js';

export function validateTrackNumber(num) {
  const parsed = parseInt(num);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Track number must be a number' };
  }
  if (parsed < 1 || parsed > TOTAL_TRACKS) {
    return { valid: false, error: `Track number must be between 1 and ${TOTAL_TRACKS}` };
  }
  return { valid: true, value: parsed };
}

export function validateRange(start, end) {
  const startValidation = validateTrackNumber(start);
  if (!startValidation.valid) {
    return { valid: false, error: `Start: ${startValidation.error}` };
  }
  
  const endValidation = validateTrackNumber(end);
  if (!endValidation.valid) {
    return { valid: false, error: `End: ${endValidation.error}` };
  }
  
  if (startValidation.value > endValidation.value) {
    return { valid: false, error: 'Start must be less than or equal to end' };
  }
  
  return { 
    valid: true, 
    value: { start: startValidation.value, end: endValidation.value }
  };
}

export function validatePlaylistName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Playlist name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Playlist name cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Playlist name must be 50 characters or less' };
  }
  
  // Check for invalid characters
  if (/[<>:"/\\|?*]/.test(trimmed)) {
    return { valid: false, error: 'Playlist name contains invalid characters' };
  }
  
  return { valid: true, value: trimmed };
}

export function validateRepeatCount(count) {
  const parsed = parseInt(count);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Repeat count must be a number' };
  }
  if (parsed < DEFAULT_SETTINGS.MIN_REPEAT || parsed > DEFAULT_SETTINGS.MAX_REPEAT) {
    return { 
      valid: false, 
      error: `Repeat count must be between ${DEFAULT_SETTINGS.MIN_REPEAT} and ${DEFAULT_SETTINGS.MAX_REPEAT}` 
    };
  }
  return { valid: true, value: parsed };
}

export function validateSpeed(speed) {
  const parsed = parseFloat(speed);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Speed must be a number' };
  }
  if (parsed < DEFAULT_SETTINGS.MIN_SPEED || parsed > DEFAULT_SETTINGS.MAX_SPEED) {
    return { 
      valid: false, 
      error: `Speed must be between ${DEFAULT_SETTINGS.MIN_SPEED}× and ${DEFAULT_SETTINGS.MAX_SPEED}×` 
    };
  }
  return { valid: true, value: parsed };
}

export function validateQuizTime(time) {
  const parsed = parseInt(time);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Quiz time must be a number' };
  }
  if (parsed < DEFAULT_SETTINGS.MIN_QUIZ_TIME || parsed > DEFAULT_SETTINGS.MAX_QUIZ_TIME) {
    return { 
      valid: false, 
      error: `Quiz time must be between ${DEFAULT_SETTINGS.MIN_QUIZ_TIME}s and ${DEFAULT_SETTINGS.MAX_QUIZ_TIME}s` 
    };
  }
  return { valid: true, value: parsed };
}

export function validateQuizDelay(delay) {
  const parsed = parseInt(delay);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Quiz delay must be a number' };
  }
  if (parsed < DEFAULT_SETTINGS.MIN_QUIZ_DELAY || parsed > DEFAULT_SETTINGS.MAX_QUIZ_DELAY) {
    return { 
      valid: false, 
      error: `Quiz delay must be between ${DEFAULT_SETTINGS.MIN_QUIZ_DELAY}s and ${DEFAULT_SETTINGS.MAX_QUIZ_DELAY}s` 
    };
  }
  return { valid: true, value: parsed };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

export function validatePlaylist(tracks) {
  if (!Array.isArray(tracks)) {
    return { valid: false, error: 'Playlist must be an array' };
  }
  
  if (tracks.length === 0) {
    return { valid: false, error: 'Playlist cannot be empty' };
  }
  
  const invalidTracks = tracks.filter(track => {
    const validation = validateTrackNumber(track);
    return !validation.valid;
  });
  
  if (invalidTracks.length > 0) {
    return { 
      valid: false, 
      error: `Playlist contains invalid tracks: ${invalidTracks.join(', ')}` 
    };
  }
  
  return { valid: true, value: tracks };
}
