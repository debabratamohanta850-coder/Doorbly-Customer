import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { CustomerLocation } from '../types/supabase';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export type AndroidPermissionState = 'prompt' | 'granted' | 'denied';

interface LocationContextType {
  permissionState: AndroidPermissionState;
  showPermissionDialog: boolean;
  setShowPermissionDialog: (show: boolean) => void;
  currentGps: GpsCoordinates | null;
  savedLocations: CustomerLocation[];
  isLocating: boolean;
  locationError: string | null;
  requestGpsLocation: () => Promise<GpsCoordinates | null>;
  promptAndroidPermission: () => void;
  denyAndroidPermission: () => void;
  acceptAndroidPermission: (mode: 'while_using' | 'only_once') => Promise<GpsCoordinates | null>;
  saveLocationToSupabase: (loc: { label: string; address_line: string; city?: string; state?: string; postal_code?: string; latitude: number; longitude: number; is_default?: boolean }) => Promise<{ data?: CustomerLocation; error?: Error | null }>;
  loadSavedLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const PERMISSION_STORAGE_KEY = 'doorbly_android_location_permission';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<AndroidPermissionState>(() => {
    const saved = localStorage.getItem(PERMISSION_STORAGE_KEY);
    if (saved === 'granted' || saved === 'denied') return saved;
    return 'prompt';
  });

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [currentGps, setCurrentGps] = useState<GpsCoordinates | null>(null);
  const [savedLocations, setSavedLocations] = useState<CustomerLocation[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load customer locations from Supabase
  const loadSavedLocations = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) {
      setSavedLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading customer locations:', error.message);
        return;
      }

      setSavedLocations(data as CustomerLocation[]);
    } catch (err) {
      console.error('Failed to load saved locations:', err);
    }
  }, [user]);

  useEffect(() => {
    loadSavedLocations();
  }, [loadSavedLocations]);

  // Reverse geocode real coordinates using OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lon: number): Promise<{ address: string; city?: string; state?: string; postalCode?: string }> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DoorblyCustomerApp/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const address = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        const addrObj = data.address || {};
        const city = addrObj.city || addrObj.town || addrObj.village || addrObj.suburb || '';
        const state = addrObj.state || '';
        const postalCode = addrObj.postcode || '';
        return { address, city, state, postalCode };
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
    return { address: `Lat: ${lat.toFixed(5)}, Long: ${lon.toFixed(5)}` };
  };

  const executeBrowserGeolocation = useCallback(async (): Promise<GpsCoordinates | null> => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your device browser.');
      return null;
    }

    setIsLocating(true);
    setLocationError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          const geo = await reverseGeocode(lat, lon);

          const gps: GpsCoordinates = {
            latitude: lat,
            longitude: lon,
            accuracy,
            address: geo.address,
            city: geo.city,
            state: geo.state,
            postalCode: geo.postalCode
          };

          setCurrentGps(gps);
          setPermissionState('granted');
          localStorage.setItem(PERMISSION_STORAGE_KEY, 'granted');
          setIsLocating(false);
          resolve(gps);
        },
        (err) => {
          let msg = 'Failed to retrieve GPS location.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Android location permission was denied. Please allow location access in your device settings.';
            setPermissionState('denied');
            localStorage.setItem(PERMISSION_STORAGE_KEY, 'denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'GPS location is currently unavailable. Ensure GPS is turned on.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out. Please try again.';
          }
          setLocationError(msg);
          setIsLocating(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && 'geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setPermissionState('granted');
          executeBrowserGeolocation();
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            setPermissionState('granted');
            executeBrowserGeolocation();
          } else if (result.state === 'denied') {
            setPermissionState('denied');
          }
        };
      }).catch(() => {
        if (permissionState === 'granted') {
          executeBrowserGeolocation();
        }
      });
    } else if (permissionState === 'granted') {
      executeBrowserGeolocation();
    }
  }, [executeBrowserGeolocation]);

  const promptAndroidPermission = () => {
    setShowPermissionDialog(true);
  };

  const denyAndroidPermission = () => {
    setPermissionState('denied');
    localStorage.setItem(PERMISSION_STORAGE_KEY, 'denied');
    setShowPermissionDialog(false);
    setLocationError('Android location permission was not granted.');
  };

  const acceptAndroidPermission = async (mode: 'while_using' | 'only_once'): Promise<GpsCoordinates | null> => {
    setShowPermissionDialog(false);
    if (mode === 'while_using') {
      localStorage.setItem(PERMISSION_STORAGE_KEY, 'granted');
    }
    const coords = await executeBrowserGeolocation();
    return coords;
  };

  const requestGpsLocation = async (): Promise<GpsCoordinates | null> => {
    if (permissionState === 'granted') {
      return await executeBrowserGeolocation();
    } else {
      setShowPermissionDialog(true);
      return null;
    }
  };

  const saveLocationToSupabase = async (loc: {
    label: string;
    address_line: string;
    city?: string;
    state?: string;
    postal_code?: string;
    latitude: number;
    longitude: number;
    is_default?: boolean;
  }) => {
    const supabase = getSupabase();
    if (!supabase || !user) {
      return { error: new Error('User must be logged in to save location') };
    }

    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .insert({
          customer_id: user.id,
          label: loc.label,
          address_line: loc.address_line,
          city: loc.city || null,
          state: loc.state || null,
          postal_code: loc.postal_code || null,
          latitude: loc.latitude,
          longitude: loc.longitude,
          is_default: loc.is_default ?? false
        })
        .select()
        .single();

      if (error) {
        return { error: new Error(error.message) };
      }

      await loadSavedLocations();
      return { data: data as CustomerLocation, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <LocationContext.Provider
      value={{
        permissionState,
        showPermissionDialog,
        setShowPermissionDialog,
        currentGps,
        savedLocations,
        isLocating,
        locationError,
        requestGpsLocation,
        promptAndroidPermission,
        denyAndroidPermission,
        acceptAndroidPermission,
        saveLocationToSupabase,
        loadSavedLocations
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
