import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsedNotifications = JSON.parse(saved);
        // Ensure createdAt is a Date object
        setNotifications(
          parsedNotifications.map(n => ({
            ...n,
            createdAt: new Date(n.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage', error);
      // Clear corrupted storage
      localStorage.removeItem('notifications');
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((message) => {
    const newNotification = {
      id: Date.now(),
      message,
      createdAt: new Date(),
    };
    // Add new notification without a limit
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 
