#!/usr/bin/env python3
"""Simple HTTP server with SPA support - serves index.html for all routes"""
import http.server
import socketserver
import os
from pathlib import Path

PORT = 5005

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that serves index.html for all non-file requests (SPA support)"""
    
    def do_GET(self):
        # Get the file path
        path = self.translate_path(self.path)
        
        # If path is a directory or file doesn't exist, serve index.html
        if os.path.isdir(path) or not os.path.exists(path):
            # Check if it looks like a file request (has extension)
            if '.' not in os.path.basename(self.path):
                # It's a route, serve index.html
                self.path = '/index.html'
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
        print(f"Serving SPA on http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
