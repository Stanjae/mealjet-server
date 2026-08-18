export const dispatchStrategy = {
  STANDARD: {
    initialRadiusKm: 2,
    radiusIncrementKm: 1,
    maxRadiusKm: 7,
    maximumOffersPerAttempt: 5,
    offerTimeoutSeconds: 15,
    automaticRetryDelaySeconds: 30,
    maximumAutomaticRetries: 3,
    searchLimit: 20,
  },

  EXPRESS: {
    initialRadiusKm: 1,
    radiusIncrementKm: 0.5,
    maxRadiusKm: 3,
    maximumOffersPerAttempt: 3,
    offerTimeoutSeconds: 10,
    automaticRetryDelaySeconds: 20,
    maximumAutomaticRetries: 3,
    searchLimit: 20,
  },

  SCHEDULED: {
    initialRadiusKm: 5,
    radiusIncrementKm: 2,
    maxRadiusKm: 10,
    maximumOffersPerAttempt: 4,
    offerTimeoutSeconds: 30,
    automaticRetryDelaySeconds: 30,
    maximumAutomaticRetries: 3,
    searchLimit: 20,
  },
};
