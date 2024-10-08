const db = require('./firebase/firebase');

/**
 * Finds the location and timestamp of an object based on the specified time.
 * @param {string} object - The name of the object to search for.
 * @param {string} [time] - The time interval to search within (optional).
 * @returns {Promise<Object>} - The result containing location, timeAgo, and panel.
 */
async function find(object) {
  try {
    let query = db.collection('frame').where('context.objects', 'array-contains', object);
    // descending means most recent time where it occurred
    const snapshot = await query.orderBy('timestamp', 'desc').limit(1).get();

    if (snapshot.empty) {
        console.log("nothing found")
      return {
        location: "Unknown",
        timeAgo: null
      };
    }

    const data = snapshot.docs[0].data();
    const timeAgo = calculateTimeAgo(new Date(data.timestamp));
    return {
      location: data.context.location || "Unknown",
      timeAgo: timeAgo
    };
  } catch (error) {
    console.error('Error finding object:', error);
    throw new Error('Error retrieving data from Firestore');
  }
}

/**
 * Parses a time string into milliseconds.
 * @param {string} time - The time interval string (e.g., "1 week ago").
 * @returns {number} - The time interval in milliseconds.
 */
function parseTimeToMillis(time) {
  const regex = /(\d+)\s*(minute|hour|day|week)s?\s*ago/;
  const match = time.match(regex);

  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'minute':
        return value * 24 * 60 * 60 * 1000;
      case 'hour':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'day':
        return value * 30 * 24 * 60 * 60 * 1000;
      case 'week':
        return value * 365 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
  return 0;
}

/**
 * Calculates how long ago a given timestamp was in a human-readable format.
 * @param {Date} pastDate - The timestamp of when the object was last seen.
 * @returns {string} - A string representing how long ago the event happened.
 */
function calculateTimeAgo(pastDate) {
    const currTime = new Date();
    const diffInMillis = currTime - pastDate;
  
    // convert milliseconds back to readable units
    const minutes = Math.floor(diffInMillis / (1000 * 60));
    const hours = Math.floor(diffInMillis / (1000 * 60 * 60));
    const days = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffInMillis / (1000 * 60 * 60 * 24 * 7));
  
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
}

module.exports = {
  find,
  calculateTimeAgo
};