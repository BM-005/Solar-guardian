# Raspberry Pi Laptop Receiver

This directory contains the Flask-based receiver server that communicates with Raspberry Pi devices for solar panel analysis.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

```bash
python laptop_receiver.py
```

The server will start on `http://localhost:5001` and listen for Socket.IO connections from:
- Raspberry Pi devices (sending analysis results)
- Frontend clients (receiving live scan updates)

## API

### Health Check
- `GET /health` - Returns server status

### Socket.IO Events

#### From Raspberry Pi
- `pi_analysis_result` - Send analysis data with the following structure:
  ```json
  {
    "capture_id": "unique_capture_id",
    "timestamp": "2024-01-01T12:00:00Z",
    "report": {
      "health_score": 85.5,
      "priority": "HIGH",
      "recommendation": "Clean panels",
      "timeframe": "immediate",
      "summary": "Analysis complete",
      "root_cause": "dust accumulation",
      "impact_assessment": "reduced efficiency"
    },
    "rgb_stats": {
      "total": 20,
      "clean": 15,
      "dusty": 5
    },
    "frame_b64": "base64_encoded_main_image",
    "panel_crops": [
      {
        "panel_number": "P1",
        "status": "CLEAN",
        "has_dust": false,
        "image_b64": "base64_encoded_crop"
      }
    ]
  }
  ```

#### To Frontend Clients
- `new_result` - Broadcasts processed analysis results to connected clients
- `pi-analysis-received` - Confirmation sent back to Pi after processing

## Image Storage

Received images are automatically saved to:
- `../server/received_from_pi/captures/` - Main frame images
- `../server/received_from_pi/panel_crops/` - Individual panel crop images

Images are accessible via the main server at `/api/pi-images/...`

## Integration

The frontend automatically connects to this server at startup and displays live Pi scans alongside stored API scans in the Scans page.
