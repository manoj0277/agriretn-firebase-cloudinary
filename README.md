# AgriRent - Full Stack Application

This project has been restructured into a full-stack application with a separate frontend and backend, preparing it for mobile deployment as outlined in the project plan.

## Project Structure

- **/frontend**: Contains the React (web) application, which can be adapted to React Native. All UI components, screens, and contexts are located here.
- **/backend**: Contains the Node.js, Express, and in-memory database server. This includes the API endpoints and server logic.

---

## Getting Started

### 1. Backend Setup

The backend requires Node.js.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the backend server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:3001`. The API will be available under `/api`.

### 2. Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    This prototype uses CDN imports via an `importmap` in `index.html` and does not require a local `npm install` step. For a production React Native build, you would set up a `package.json` with Expo/React Native dependencies.

3.  **Serve the frontend:**
    - You can use any simple static server. If you have Python:
      ```bash
      python -m http.server
      ```
    - Or use the `serve` package from npm:
      ```bash
      npx serve .
      ```
    The application will be accessible at `http://localhost:8000` (or another port depending on your server).

4.  **API Key (Required for AI features):**
    For the AI Assistant features to work, you need to provide a Gemini API key. Create a `.env` file in the `frontend` directory and add your key:
    ```
    API_KEY="YOUR_GEMINI_API_KEY"
    ```
    Note: In a real build process, this key would be managed securely.
-------