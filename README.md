# SafePulse

SafePulse is a safety-focused application designed to connect students with "Safewalkers" for secure campus matching and location tracking. This monorepo contains both the frontend React Native mobile application and the backend Go server.

## Project Structure

```
SafePulse/
├── frontend/   # React Native Expo application
└── backend/    # Go server and API
```

## Features

- **Real-time Location Tracking**: Track start and end locations for safe walks.
- **Safewalker Matching**: Algorithm to find the nearest available safewalker.
- **Secure Verification**: Matching codes to ensure the correct student meets the correct safewalker.
- **Status Updates**: Real-time status polling for ride/walk progress.

## Prerequisites

- **Node.js** (v18 or later recommended)
- **Go** (v1.20 or later recommended)
- **Expo Go** app on your mobile device (iOS/Android) or a simulator.
- **Git**

## Getting Started

### 1. Backend Setup

The backend is built with Go and handles user registration, safewalker matching, and location updates.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies (if needed):
    ```bash
    go mod tidy
    ```

3.  Run the server:
    You can use the provided Makefile:
    ```bash
    make run
    ```
    Or run the Go command directly:
    ```bash
    go run cmd/main.go
    ```

    The server will start on port `8090`.

### 2. Frontend Setup

The frontend is a React Native app built with Expo.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    npx expo start
    ```

4.  **Run on Device**:
    - Scan the QR code with the **Expo Go** app on your Android or iOS device.
    - Press `i` to run on an iOS simulator (macOS only).
    - Press `a` to run on an Android emulator.

## Configuration

- **API Endpoints**: Ensure the frontend is configured to point to your local backend (usually `http://localhost:8090` or your machine's local IP address if testing on a physical device). Check `frontend/src/config.ts` or similar files for API URL settings.
- **AWS Amplify**: The project uses AWS Amplify (`amplify/` directory). Ensure you have the necessary AWS credentials and configuration if you plan to deploy or use cloud features.

## Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.
