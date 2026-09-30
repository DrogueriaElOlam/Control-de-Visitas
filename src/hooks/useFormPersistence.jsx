import { useState, useEffect, useCallback } from 'react';

export function useFormPersistence(key, initialValues) {
  const [values, setValues] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValues;
    } catch (error) {
      console.error('Error loading form data:', error);
      return initialValues;
    }
  });

  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(values));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [key, values]);

  const saveForm = useCallback(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(values));
      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error('Error saving form:', error);
      return false;
    }
  }, [key, values]);

  return [values, setValues, saveForm, lastSaved];
}
