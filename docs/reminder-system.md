# Radio Show Reminder System

## 🎯 Overview
A complete React frontend for a radio show reminder system with real-time WebSocket notifications, integrated with your existing OnWave radio app.

## ✨ Features

### 🔔 **Reminder Management**
- **Create Reminders**: Easy form to set up reminders for radio shows
- **View Reminders**: Clean list of all user reminders with status indicators
- **Delete Reminders**: One-click removal of unwanted reminders
- **Quick Reminders**: Direct creation from PBS show cards with preset intervals

### 🌐 **Real-time Notifications**
- **WebSocket Integration**: Automatic connection after login
- **Live Status Indicator**: Visual connection status in the UI
- **Toast Notifications**: Auto-dismissing alerts (5 seconds) when shows start
- **Automatic Reconnection**: Robust connection handling

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Form Validation**: Client-side validation with helpful error messages
- **Loading States**: Visual feedback during API operations
- **Error Handling**: Graceful error handling with user-friendly messages

## 🏗️ **Architecture**

### **Components**
- `CreateReminderForm` - Form for creating new reminders
- `RemindersList` - Display and manage user reminders
- `ConnectionStatus` - WebSocket connection indicator
- `PBSShowCard` - Enhanced with quick reminder functionality

### **Contexts**
- `WebSocketContext` - Manages WebSocket connections and real-time notifications

### **Hooks**
- `useReminders` - State management for reminder operations
- `useSubscriptions` - Existing subscription functionality (enhanced)

### **API Integration**
- `POST /reminders` - Create new reminders
- `GET /reminders` - Fetch user reminders
- `DELETE /reminders/{id}` - Remove reminders
- `ws://localhost:8080/ws?user_id={userId}` - Real-time notifications

## 🚀 **Usage**

### **Navigation**
Access reminders via the new "Reminders" tab in the navigation bar (bell icon).

### **Creating Reminders**
1. Fill out the reminder form with show details
2. Select reminder timing (5 min to 2 hours before)
3. Submit to create the reminder

### **Quick Reminders from Show Cards**
1. Click the bell icon on any PBS show card
2. Choose from preset reminder intervals (15 min, 30 min, 1 hour)
3. Instant reminder creation with toast confirmation

### **Real-time Notifications**
- Automatic WebSocket connection after login
- Live connection status indicator
- Toast notifications when shows are about to start
- Notifications auto-dismiss after 5 seconds

## 🔧 **Technical Details**

### **State Management**
- React Context for WebSocket connection
- Custom hooks for reminder operations
- Local state management with proper loading/error handling

### **Type Safety**
- Full TypeScript integration
- Defined interfaces for all API responses
- Type-safe WebSocket message handling

### **Responsive Design**
- Mobile-first responsive layout
- Adaptive grid system
- Touch-friendly interface elements

### **Error Handling**
- Try-catch blocks around all async operations
- User-friendly error messages
- Graceful fallbacks for connection issues

## 🎨 **UI Components**
- Built with existing shadcn/ui components
- Consistent with OnWave design system
- Accessibility-focused implementation
- Loading states and visual feedback

## 🔌 **Integration**
- Seamlessly integrates with existing authentication
- Uses existing toast system
- Follows established routing patterns
- Compatible with existing PlayerContext

The reminder system is now fully integrated into your OnWave app and ready for use!
