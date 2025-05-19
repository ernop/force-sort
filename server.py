import json
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
import cgi

DATA_FILE = 'data.json'
IMAGE_DIR = 'images'
PORT = 8007

class UploadHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/upload':
            self.send_response(404)
            self.end_headers()
            return
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST',
                     'CONTENT_TYPE': self.headers.get('Content-Type')})
        if 'image' not in form or 'node_id' not in form:
            self.send_response(400)
            self.end_headers()
            return
        file_item = form['image']
        node_id = form['node_id'].value
        if not file_item.file:
            self.send_response(400)
            self.end_headers()
            return
        os.makedirs(IMAGE_DIR, exist_ok=True)
        filename = f"{node_id}.png"
        path = os.path.join(IMAGE_DIR, filename)
        with open(path, 'wb') as f:
            f.write(file_item.file.read())

        # update data.json
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        for n in data.get('nodes', []):
            if n.get('id') == int(node_id):
                n['image'] = f"{IMAGE_DIR}/{filename}"
                break
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')

def run():
    server = HTTPServer(('', PORT), UploadHandler)
    print(f"Serving on http://localhost:{PORT}")
    server.serve_forever()

if __name__ == '__main__':
    run()
