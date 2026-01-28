# PulseCampus + ReSourceX Backend

A modular REST API for an Integrated Smart Campus System.

## Architecture

- **PulseCampus**: Sensing and prediction layer (occupancy tracking).
- **ReSourceX**: Decision and action layer (resource reassignment).
- **Feedback Loop**: Learning layer (accuracy metrics).

## Tech Stack

- **Node.js + Express**
- **SQLite3** (Standalone database)
- **MVC Structure**

## Quick Specs

- **Base URL (Local)**: `http://localhost:5000`
- **Response Format**: 
  - All endpoints return JSON
  - All timestamps are in ISO 8601 format

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Seed Database**
   ```bash
   node db/seed.js
   ```

3. **Start Server**
   ```bash
   npm run dev
   # OR
   node server.js
   ```

The server will run on `http://localhost:5000`.

## API Documentation

### PulseCampus
- `GET /api/health`: System health and mode.
- `GET /api/spaces`: List all campus spaces.
- `POST /api/occupancy/update`: Update occupancy (manual or simulated).
- `GET /api/occupancy/current`: Get real-time occupancy for all spaces.
- `GET /api/occupancy/heatmap`: Get percentage occupancy data.
- `GET /api/predictions/next`: Get predictions for the next hour.

### ReSourceX
- `GET /api/events`: List all scheduled events.
- `POST /api/events/create`: Create a new event.
- `POST /api/resource/evaluate`: Check for conflicts and get recommendations.
- `POST /api/resource/reassign`: Execute a resource reassignment.
- `GET /api/resource/history`: View explainable decision logs.

### Feedback Loop
- `POST /api/feedback/evaluate`: Submit actual counts to measure accuracy.
- `GET /api/feedback/metrics`: View average prediction error per space.

## SYSTEM_MODE Toggle

In `.env`, set `SYSTEM_MODE=SIMULATION` to automatically generate realistic occupancy patterns using `utils/simulation.js`. Set to `LIVE` when connecting real sensors.

## Future Upgrade Notes

- **ML Integration**: Replace logic in `services/predictionService.js` with an external ML microservice call.
- **Production DB**: Switch from SQLite to MySQL by updating `config/db.js`.
- **Real Sensors**: Plug in IoT webhooks to `POST /api/occupancy/update`.
