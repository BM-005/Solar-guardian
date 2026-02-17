#!/usr/bin/env python3
"""
Test script to simulate Raspberry Pi sending analysis results to laptop_receiver.py
"""

import socketio
import time
import json
from datetime import datetime

def send_test_data():
    """Send test analysis result to laptop receiver"""

    # Connect to laptop receiver (running on port 5001)
    sio = socketio.Client()
    sio.connect('http://localhost:5001')

    print("🔌 Connected to laptop receiver")

    # Test data matching PiAnalysisResult interface
    test_data = {
        'capture_id': 'test-001',
        'timestamp': datetime.now().isoformat(),
        'report': {
            'health_score': 75.5,
            'priority': 'MEDIUM',
            'recommendation': 'Schedule cleaning',
            'timeframe': 'within 1 week',
            'summary': 'Test analysis result',
            'root_cause': 'dust accumulation',
            'impact_assessment': 'minor efficiency loss'
        },
        'rgb_stats': {
            'total': 10,
            'clean': 7,
            'dusty': 3
        },
        'frame_b64': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z',  # Small test image
        'panel_crops': [
            {
                'panel_number': 'P1',
                'status': 'CLEAN',
                'has_dust': False,
                'image_b64': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z'
            },
            {
                'panel_number': 'P2',
                'status': 'DUSTY',
                'has_dust': True,
                'image_b64': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z'
            }
        ]
    }

    print("📤 Sending test analysis result...")
    sio.emit('pi_analysis_result', test_data)

    # Wait for response
    @sio.on('pi-analysis-received')
    def on_response(data):
        print(f"📥 Response from laptop receiver: {data}")

    # Wait a bit
    time.sleep(2)

    sio.disconnect()
    print("🔌 Disconnected")

if __name__ == '__main__':
    send_test_data()
