// array-utils.js - Array manipulation utilities

// Shuffle array (Fisher-Yates algorithm)
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate range of numbers
export function range(start, end, step = 1) {
  const result = [];
  if (step > 0) {
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i >= end; i += step) {
      result.push(i);
    }
  }
  return result;
}

// Get unique values
export function unique(array) {
  return [...new Set(array)];
}

// Chunk array into smaller arrays
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Flatten nested array
export function flatten(array) {
  return array.reduce((acc, val) => {
    return Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val);
  }, []);
}

// Sort numbers
export function sortNumbers(array, ascending = true) {
  return [...array].sort((a, b) => ascending ? a - b : b - a);
}

// Remove duplicates and sort
export function uniqueSorted(array) {
  return sortNumbers(unique(array));
}

// Get random element
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Get random elements (without replacement)
export function randomElements(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

// Check if arrays are equal
export function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

// Move element in array
export function moveElement(array, from, to) {
  const newArray = [...array];
  const element = newArray.splice(from, 1)[0];
  newArray.splice(to, 0, element);
  return newArray;
}

// Group by property
export function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}
