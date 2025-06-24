import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

const NotificationContext = createContext(); // Create a context for notifications across the app

export const useNotifications = () => useContext(NotificationContext); // Custom hook to access notification context

export const NotificationProvider = ({ children }) => {   
  const [notifications, setNotifications] = useState([]);

  // Load notifications from localStorage on mount
  // This ensures that notifications persist across page reloads
  // It retrieves notifications from localStorage and parses them
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsedNotifications = JSON.parse(saved);  // Parse the saved notifications
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


  // Add a new notification
  // This function creates a new notification object with a unique ID and current timestamp
  const addNotification = useCallback((message) => {
    const newNotification = {
      id: Date.now(),
      message,
      createdAt: new Date(),
    };
    // Add new notification without a limit
    setNotifications(prev => [newNotification, ...prev]);
  }, []);


  // Remove a notification by its ID
  // This function filters out the notification with the given ID
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);


  // Clear all notifications
  // This function sets the notifications state to an empty array
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);


  
  const value = {  // Provide the context value to be used in components
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (

    // Wrap children with NotificationContext.Provider to provide the context value
    // This allows any child component to access the notification functions and state
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 