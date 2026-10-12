const { getDistanceAndETA, getDirections, geocodeAddress } = require('../src/utils/maps');

describe('Module 5 - Task 2: Open-Source Maps Integration (OSRM + Nominatim)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('getDistanceAndETA', () => {
    it('returns missing coordinates status when coordinates are null', async () => {
      const result = await getDistanceAndETA({
        originLat: null,
        originLng: 73.8077,
        destLat: 18.5074,
        destLng: null
      });

      expect(result.status).toBe('MISSING_COORDINATES');
      expect(result.distanceKm).toBeNull();
      expect(result.etaMinutes).toBeNull();
    });

    it('calculates distance and ETA via local Haversine fallback when OSRM is unavailable', async () => {
      // Simulate OSRM being offline
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      // Distance between Kothrud (18.5074, 73.8077) and Viman Nagar (18.5679, 73.9143) is ~13 km
      const result = await getDistanceAndETA({
        originLat: 18.5074,
        originLng: 73.8077,
        destLat: 18.5679,
        destLng: 73.9143
      });

      expect(result.status).toBe('OK');
      expect(result.provider).toBe('haversine_fallback');
      expect(result.distanceKm).toBeGreaterThan(10);
      expect(result.distanceKm).toBeLessThan(18);
      expect(result.etaMinutes).toBeGreaterThan(15);
      expect(result.durationSeconds).toBe(result.etaMinutes * 60);
    });

    it('calls OSRM API and returns driving distance when available', async () => {
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 12400,    // metres
            duration: 1920      // seconds
          }
        ]
      };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOsrmResponse
      });

      const result = await getDistanceAndETA({
        originLat: 18.5074,
        originLng: 73.8077,
        destLat: 18.5679,
        destLng: 73.9143
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = globalThis.fetch.mock.calls[0][0];
      // OSRM coordinate order is lng,lat
      expect(calledUrl).toContain('router.project-osrm.org/route/v1/driving');
      expect(calledUrl).toContain('73.8077,18.5074');
      expect(calledUrl).toContain('73.9143,18.5679');

      expect(result.provider).toBe('osrm');
      expect(result.distanceKm).toBe(12.4);
      expect(result.etaMinutes).toBe(32);
      expect(result.distanceMeters).toBe(12400);
      expect(result.durationSeconds).toBe(1920);
      expect(result.status).toBe('OK');
    });

    it('gracefully falls back to local calculation if OSRM network request fails', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const result = await getDistanceAndETA({
        originLat: 18.5074,
        originLng: 73.8077,
        destLat: 18.5679,
        destLng: 73.9143
      });

      expect(result.status).toBe('OK');
      expect(result.provider).toBe('haversine_fallback');
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.etaMinutes).toBeGreaterThan(0);
    });
  });

  describe('getDirections', () => {
    it('returns 3-point waypoints with local_waypoints provider when OSRM is offline', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const result = await getDirections({
        originLat: 18.5074,
        originLng: 73.8077,
        destLat: 18.5679,
        destLng: 73.9143
      });

      expect(result).not.toBeNull();
      expect(result.provider).toBe('local_waypoints');
      expect(Array.isArray(result.waypoints)).toBe(true);
      expect(result.waypoints.length).toBe(3);
      expect(result.waypoints[0].lat).toBe(18.5074);
      expect(result.waypoints[2].lat).toBe(18.5679);
    });

    it('calls OSRM Directions API and parses GeoJSON waypoints when available', async () => {
      const mockOsrmDirectionsResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 14200,
            duration: 2100,
            geometry: {
              type: 'LineString',
              coordinates: [
                [73.8077, 18.5074],
                [73.8600, 18.5300],
                [73.9143, 18.5679]
              ]
            },
            legs: [
              {
                steps: [
                  {
                    name: 'Paud Rd',
                    maneuver: { instruction: 'Head north on Paud Rd' },
                    distance: 1200,
                    duration: 180
                  }
                ]
              }
            ]
          }
        ]
      };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOsrmDirectionsResponse
      });

      const result = await getDirections({
        originLat: 18.5074,
        originLng: 73.8077,
        destLat: 18.5679,
        destLng: 73.9143
      });

      expect(result.provider).toBe('osrm');
      expect(result.distanceKm).toBe(14.2);
      expect(result.etaMinutes).toBe(35);
      // GeoJSON [lng, lat] flipped to {lat, lng}
      expect(result.waypoints[0]).toEqual({ lat: 18.5074, lng: 73.8077 });
      expect(result.waypoints[2]).toEqual({ lat: 18.5679, lng: 73.9143 });
      expect(result.steps[0].instruction).toBe('Head north on Paud Rd');
    });
  });

  describe('geocodeAddress', () => {
    it('resolves neighbourhood name using local mapping when offline', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const kothrud = await geocodeAddress('Kothrud, Pune');
      expect(kothrud.lat).toBe(18.5074);
      expect(kothrud.lng).toBe(73.8077);
      expect(kothrud.provider).toBe('local_lookup');

      const viman = await geocodeAddress('Viman Nagar, Pune');
      expect(viman.lat).toBe(18.5679);
      expect(viman.lng).toBe(73.9143);
    });

    it('calls Nominatim (OSM geocoder) and returns coordinates when available', async () => {
      const mockNominatimResponse = [
        {
          lat: '18.5074',
          lon: '73.8077',
          display_name: 'Kothrud, Pune, Maharashtra 411038, India'
        }
      ];

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockNominatimResponse
      });

      const result = await geocodeAddress('Kothrud, Pune');
      expect(result.provider).toBe('nominatim');
      expect(result.lat).toBe(18.5074);
      expect(result.lng).toBe(73.8077);
      expect(result.formattedAddress).toBe('Kothrud, Pune, Maharashtra 411038, India');

      // Verify Nominatim was called, not Google
      const calledUrl = globalThis.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('nominatim.openstreetmap.org/search');
      expect(calledUrl).not.toContain('googleapis.com');
    });
  });
});
