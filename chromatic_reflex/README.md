# Chromatic Reflex

## Run the Step 1 test (Member A)
    cd frontend
    npm install
    npm run dev
Open the printed localhost URL in Chrome and allow the camera.

## Folder ownership
- Member A: frontend/src/camera, hands, gesture, training/
- Member B: frontend/src/game, ui, backend/, db/, config/ (except gestures.json, shared)

## Shared interface (every frame)
    { label: string, confidence: 0..1, timestamp: ms (performance.now timebase) }
