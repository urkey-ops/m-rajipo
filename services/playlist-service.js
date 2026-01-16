// playlist-service.js - COMPLETE FIXED VERSION

import { TOTAL_TRACKS } from '../core/constants.js';
import { shuffleArray, range, uniqueSorted } from '../utils/array-utils.js';
import { validatePlaylist, validateRange } from '../utils/validation.js';

class PlaylistService {
  // Create playlist from track numbers
  createPlaylist(tracks) {
    const validation = validatePlaylist(tracks);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    return {
      tracks: uniqueSorted(tracks),
      originalOrder: [...tracks],
      createdAt: Date.now()
    };
  }
  
  // Shuffle playlist
  shufflePlaylist(tracks) {
    return shuffleArray(tracks);
  }
  
  // Generate range playlist
  createRangePlaylist(start, end) {
    const validation = validateRange(start, end);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    return range(validation.value.start, validation.value.end);
  }
  
  // ✅ FIXED: Generate group playlists with number property
  getGroups() {
    const groups = [];
    let groupNumber = 1;
    
    for (let i = 1; i <= TOTAL_TRACKS; i += 10) {
      const end = Math.min(i + 9, TOTAL_TRACKS);
      groups.push({
        number: groupNumber,  // ✅ FIXED: Added number property
        start: i,
        end: end,
        tracks: range(i, end)
      });
      groupNumber++;
    }
    return groups;
  }
  
  // Get specific group by number (1-based)
  getGroup(groupNumber) {
    const groups = this.getGroups();
    return groups.find(g => g.number === groupNumber) || null;
  }
  
  // Get next track in playlist
  getNextTrack(currentIndex, playlist, options = {}) {
    const {
      repeatEach = 1,
      repeatCounter = 0,
      repeatPlaylist = false
    } = options;
    
    // Check if we need to repeat current track
    if (repeatCounter < repeatEach - 1) {
      return {
        index: currentIndex,
        track: playlist[currentIndex],
        repeatCounter: repeatCounter + 1,
        isEnd: false
      };
    }
    
    // Move to next track
    const nextIndex = currentIndex + 1;
    
    // Check if end of playlist
    if (nextIndex >= playlist.length) {
      if (repeatPlaylist) {
        // Loop back to start
        return {
          index: 0,
          track: playlist[0],
          repeatCounter: 0,
          isEnd: false,
          isLooping: true
        };
      } else {
        // End of playlist
        return {
          index: nextIndex,
          track: null,
          repeatCounter: 0,
          isEnd: true
        };
      }
    }
    
    // Normal next track
    return {
      index: nextIndex,
      track: playlist[nextIndex],
      repeatCounter: 0,
      isEnd: false
    };
  }
  
  // Get previous track in playlist
  getPreviousTrack(currentIndex, playlist) {
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      return {
        index: 0,
        track: playlist[0],
        isStart: true
      };
    }
    
    return {
      index: prevIndex,
      track: playlist[prevIndex],
      isStart: false
    };
  }
  
  // Check if playlist is valid
  validatePlaylist(tracks) {
    return validatePlaylist(tracks);
  }
  
  // Merge multiple playlists
  mergePlaylists(...playlists) {
    const merged = new Set();
    playlists.forEach(playlist => {
      playlist.forEach(track => merged.add(track));
    });
    return uniqueSorted(Array.from(merged));
  }
  
  // Get playlist statistics
  getStats(tracks) {
    if (!tracks || tracks.length === 0) {
      return null;
    }
    
    return {
      count: tracks.length,
      min: Math.min(...tracks),
      max: Math.max(...tracks),
      range: `${Math.min(...tracks)}-${Math.max(...tracks)}`,
      isSequential: this._isSequential(tracks),
      hasDuplicates: tracks.length !== new Set(tracks).size
    };
  }
  
  // Check if tracks are sequential
  _isSequential(tracks) {
    const sorted = [...tracks].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }
  
  // Format playlist for display
  formatPlaylistLabel(tracks) {
    if (!tracks || tracks.length === 0) return '';
    
    if (tracks.length === 1) {
      return `Shloka ${tracks[0]}`;
    }
    
    if (tracks.length <= 6) {
      return `Shloka ${tracks.join(', ')}`;
    }
    
    const sorted = uniqueSorted(tracks);
    return `Shloka ${sorted[0]}–${sorted[sorted.length - 1]} (${tracks.length})`;
  }
  
  // Parse selection string to tracks
  parseSelectionString(selectionString) {
    if (!selectionString) return [];
    
    const numbers = new Set();
    
    try {
      // Try JSON first
      const parsed = JSON.parse(selectionString);
      if (Array.isArray(parsed)) {
        parsed.forEach(num => {
          const n = parseInt(num);
          if (!isNaN(n) && n >= 1 && n <= TOTAL_TRACKS) {
            numbers.add(n);
          }
        });
        return uniqueSorted(Array.from(numbers));
      }
    } catch {
      // Fall back to comma-separated
      selectionString.split(',').forEach(item => {
        const num = parseInt(item.trim());
        if (!isNaN(num) && num >= 1 && num <= TOTAL_TRACKS) {
          numbers.add(num);
        }
      });
    }
    
    return uniqueSorted(Array.from(numbers));
  }
}

// Export singleton
export const playlistService = new PlaylistService();
