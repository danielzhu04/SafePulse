# SafePulse 🛡️

**SafePulse** is an advanced campus safety platform connecting students with trusted "Safewalkers" for secure, monitored walking companions. Built on a high-performance Go backend and a sleek React Native frontend, SafePulse reimagine personal safety with real-time location tracking, intelligent matching algorithms, and secure verification protocols.

---

## 🚀 The Mission

Walking home alone at night shouldn't be stressful. SafePulse provides peace of mind by instantly bridging the gap between students and safety resources. Whether it's a late-night library session or an off-campus event, SafePulse ensures no one has to walk alone.

## ✨ Key Features

-   **📍 Real-Time Location Intelligence**: Utilizing the **Overpass API** and OpenStreetMap data, SafePulse doesn't just track coordinates—it understands campus geography.
-   **🤝 Smart Matching Engine**: A custom Go-based algorithm instantly finds the optimal Safewalker based on proximity and improved availability metrics, minimizing wait times.
-   **🔐 Secure Handshake**: A unique, randomly generated 4-digit match code ensures students connect with the *right* Safewalker, preventing impersonation.
-   **🔄 Live Status Synchronization**: High-frequency polling and state management keep both parties perfectly in sync, updating locations and status changes in milliseconds.
-   **📱 Cross-Platform Experience**: A unified React Native experience that feels native on both iOS and Android.

## 🛠️ Technology Stack

We leveraged a modern, scalable stack to ensure reliability and speed:

### **Backend (The Powerhouse)**
-   **Language**: [Go (Golang)](https://go.dev/) - Chosen for its incredible concurrency and raw performance.
-   **Geography**: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) - For intelligent mapping and routing data.
-   **Architecture**: RESTful API with optimized in-memory state management for lightning-fast matching.

### **Frontend (The Experience)**
-   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) - For a seamless, beautiful mobile UI.
-   **Maps**: `react-native-maps` integration for fluid, interactive map views.
-   **Cloud**: **AWS Amplify** for robust backend configuration and potential cloud scaling.

## 📂 Project Structure

```
SafePulse/
├── 📱 frontend/      # React Native Mobile Application
│   ├── src/          # Components, Hooks, Navigation
│   ├── assets/       # Images and Icons
│   └── ...
└── ⚙️ backend/       # Go Server
    ├── cmd/          # Main application entry point
    ├── server/       # Server logic (structs, handlers)
    └── Makefile      # Build automation
```

## ⚡ Getting Started

### Prerequisites
-   **Go** (v1.20+)
-   **Node.js** (v18+) & **npm**
-   **Expo Go** on your mobile device

### 1. Launch the Backend
The Go backend handles the heavy lifting of matching logic and state.

```bash
cd backend
go mod tidy
make run
# Server starts on :8090
```

### 2. Launch the App
The frontend interface for Students and Safewalkers.

```bash
cd frontend
npm install
npx expo start
```
Scan the QR code with your phone to start the proper hackathon demo!