#!/usr/bin/env python3
"""
Laptop Receiver for Raspberry Pi Solar Panel Analysis Results

This Flask server receives analysis results from Raspberry Pi devices
and broadcasts them to connected clients (frontend) via Socket.IO for
real-time display in the Scans section.
"""

import os
import base64
import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__)
app.config['SECRET_KEY'] = 'solar-guardian-pi-receiver'
CORS(app, origins="*")

# Socket.IO setup
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Configuration
PORT = 5001
MAX_RESULTS = 50

# Directory to save received images
SAVE_DIR = os.path.join(os.path.dirname(__file__), '..', 'server', 'received_from_pi')
CAPTURES_DIR = os.path.join(SAVE_DIR, 'captures')
PANEL_CROPS_DIR = os.path.join(SAVE_DIR, 'panel_crops')

# Create directories if they don't exist
for directory in [SAVE_DIR, CAPTURES_DIR, PANEL_CROPS_DIR]:
    os.makedirs(directory, exist_ok=True)
    logger.info(f"Ensured directory exists: {directory}")

# In-memory storage for recent results (for newly connected clients)
recent_results = []

def make_timestamp_suffix():
    """Generate a timestamp suffix for filenames."""
    now = datetime.datetime.now()
    return f"{now.year:04d}{now.month:02d}{now.day:02d}_{now.hour:02d}{now.minute:02d}{now.second:02d}"

def sanitize_filename(value):
    """Sanitize string for use in filenames."""
    return "".join(c for c in value if c.isalnum() or c in ('_', '-')).rstrip()

def decode_base64_image(base64_data):
    """Decode base64 image data."""
    if ',' in base64_data:
        base64_data = base64_data.split(',')[1]
    return base64.b64decode(base64_data)

def get_severity_from_health_score(health_score):
    """Determine severity based on health score."""
    if health_score < 30:
        return 'CRITICAL'
    elif health_score < 50:
        return 'HIGH'
    elif health_score < 75:
        return 'MODERATE'
    else:
        return 'LOW'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.datetime.now().isoformat(),
        'service': 'laptop_receiver'
    })

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    logger.info(f"Client connected: {request.sid}")

    # Send recent results to newly connected clients
    for result in recent_results:
        emit('new_result', result)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('pi_analysis_result')
def handle_pi_analysis_result(data):
    """Handle analysis result from Raspberry Pi."""
    try:
        logger.info(f"Received pi_analysis_result from Pi: {data.get('capture_id', 'unknown')}")

        # Validate required fields
        if not data.get('capture_id') or not data.get('report'):
            emit('pi-analysis-received', {
                'success': False,
                'error': 'Missing required fields (capture_id/report)'
            })
            return

        capture_id = str(data['capture_id'])
        health_score = float(data.get('report', {}).get('health_score', 0))
        priority = data.get('report', {}).get('priority', 'NORMAL')
        timestamp = data.get('timestamp')
        if not timestamp or timestamp == 'None':
            timestamp = datetime.datetime.now().isoformat()

        timestamp_suffix = make_timestamp_suffix()
        safe_capture_id = sanitize_filename(capture_id)
        main_image_web_path = None

        # Save main frame image if provided
        if data.get('frame_b64'):
            try:
                capture_filename = f"capture_{safe_capture_id}_{timestamp_suffix}.jpg"
                capture_path = os.path.join(CAPTURES_DIR, capture_filename)
                with open(capture_path, 'wb') as f:
                    f.write(decode_base64_image(data['frame_b64']))
                main_image_web_path = f"/api/pi-images/captures/{capture_filename}"
                logger.info(f"Saved main image: {capture_path}")
            except Exception as e:
                logger.error(f"Failed to save main image: {e}")

        # Process panel crops
        panel_crops_input = data.get('panel_crops', [])
        panel_crops_for_clients = []

        for i, crop in enumerate(panel_crops_input):
            panel_number = crop.get('panel_number', f'P{i+1}')
            status = crop.get('status', 'UNKNOWN')
            has_dust = crop.get('has_dust', status == 'DUSTY')
            web_path = None

            # Save crop image if provided
            if crop.get('image_b64'):
                try:
                    crop_filename = f"panel_{sanitize_filename(panel_number)}_cap{safe_capture_id}_{timestamp_suffix}.jpg"
                    crop_path = os.path.join(PANEL_CROPS_DIR, crop_filename)
                    with open(crop_path, 'wb') as f:
                        f.write(decode_base64_image(crop['image_b64']))
                    web_path = f"/api/pi-images/panel_crops/{crop_filename}"
                    logger.info(f"Saved panel crop: {crop_path}")
                except Exception as e:
                    logger.error(f"Failed to save panel crop {panel_number}: {e}")

            panel_crops_for_clients.append({
                'panel_number': panel_number,
                'status': status,
                'has_dust': has_dust,
                'web_path': web_path
            })

        # Calculate stats
        rgb_stats = data.get('rgb_stats', {})
        dusty_count = rgb_stats.get('dusty', len([c for c in panel_crops_for_clients if c['status'] == 'DUSTY']))
        clean_count = rgb_stats.get('clean', len([c for c in panel_crops_for_clients if c['status'] == 'CLEAN']))
        total_panels = rgb_stats.get('total', len(panel_crops_for_clients))
        severity = get_severity_from_health_score(health_score)

        # Prepare result for clients
        result_for_clients = {
            'id': f"pi-{capture_id}",
            'capture_id': capture_id,
            'timestamp': timestamp,
            'received_at': datetime.datetime.now().isoformat(),
            'report': {
                'health_score': health_score,
                'priority': priority,
                'recommendation': data.get('report', {}).get('recommendation', ''),
                'timeframe': data.get('report', {}).get('timeframe', ''),
                'summary': data.get('report', {}).get('summary', ''),
                'root_cause': data.get('report', {}).get('root_cause', ''),
                'impact_assessment': data.get('report', {}).get('impact_assessment', '')
            },
            'rgb_stats': {
                'total': total_panels,
                'clean': clean_count,
                'dusty': dusty_count
            },
            'main_image_web': main_image_web_path,
            'panel_crops': panel_crops_for_clients
        }

        # Store in recent results
        recent_results.insert(0, result_for_clients)
        if len(recent_results) > MAX_RESULTS:
            recent_results.pop()

        # Broadcast to all connected clients
        emit('new_result', result_for_clients, broadcast=True)

        # Send confirmation to Pi
        emit('pi-analysis-received', {
            'success': True,
            'capture_id': capture_id,
            'message': 'Analysis result received and broadcasted'
        })

        logger.info(f"Successfully processed and broadcasted result for capture_id: {capture_id}")

    except Exception as e:
        logger.error(f"Error processing pi_analysis_result: {e}")
        emit('pi-analysis-received', {
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    logger.info(f"Starting Laptop Receiver on port {PORT}")
    logger.info(f"Image save directory: {SAVE_DIR}")
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)
