'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'rtr_device_id';

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing device ID
    let id = localStorage.getItem(DEVICE_ID_KEY);

    if (!id) {
      // Generate new UUID and store it
      id = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }

    setDeviceId(id);
    setIsLoading(false);
  }, []);

  return { deviceId, isLoading };
}
