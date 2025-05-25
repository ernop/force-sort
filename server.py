import json
import os
import hashlib
import datetime
from http.server import SimpleHTTPRequestHandler, HTTPServer
import cgi

import os

# Use absolute paths to ensure consistency
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'data.json')
IMAGE_DIR = os.path.join(BASE_DIR, 'images')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
PORT = 8007

class UploadHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ('/upload', '/delete_image', '/save_data'):
            self.send_response(404)
            self.end_headers()
            return

        if self.path == '/upload':
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
            node_id = int(form['node_id'].value)
            if not file_item.file:
                self.send_response(400)
                self.end_headers()
                return

            file_data = file_item.file.read()
            file_hash = hashlib.md5(file_data).hexdigest()

            os.makedirs(IMAGE_DIR, exist_ok=True)

            with open(DATA_FILE, 'r') as f:
                data = json.load(f)

            node = None
            for n in data.get('nodes', []):
                if n.get('id') == node_id:
                    node = n
                    break
            if node is None:
                self.send_response(400)
                self.end_headers()
                return

            images = node.get('images')
            if images is None:
                images = []
                node['images'] = images

            # check for duplicates by hash
            for img_path in images:
                try:
                    with open(img_path, 'rb') as f:
                        if hashlib.md5(f.read()).hexdigest() == file_hash:
                            self.send_response(200)
                            self.end_headers()
                            self.wfile.write(b'DUPLICATE')
                            return
                except FileNotFoundError:
                    pass

            filename = f"{node_id}_{len(images)}.png"
            path = os.path.join(IMAGE_DIR, filename)
            with open(path, 'wb') as f:
                f.write(file_data)

            # Store relative path for web access
            images.append(f"images/{filename}")
            node['images'] = images

            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2)

            self.send_response(200)
            self.end_headers()
            self.wfile.write(filename.encode())

        elif self.path == '/delete_image':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                payload = json.loads(body)
                node_id = int(payload.get('node_id'))
                image_path = payload.get('image')
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

            with open(DATA_FILE, 'r') as f:
                data = json.load(f)

            for n in data.get('nodes', []):
                if n.get('id') == node_id:
                    imgs = n.get('images') or []
                    if image_path in imgs:
                        imgs.remove(image_path)
                    n['images'] = imgs
                    break

            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2)

            try:
                os.remove(image_path)
            except FileNotFoundError:
                pass

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')

        elif self.path == '/save_data':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                new_data = json.loads(body)
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

            # ensure backup directory exists
            os.makedirs(BACKUP_DIR, exist_ok=True)
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            if os.path.exists(DATA_FILE):
                backup_path = os.path.join(BACKUP_DIR, f'data_{timestamp}.json')
                with open(DATA_FILE, 'r') as f:
                    with open(backup_path, 'w') as b:
                        b.write(f.read())

            with open(DATA_FILE, 'w') as f:
                json.dump(new_data, f, indent=2)

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')

def run():
    server = HTTPServer(('', PORT), UploadHandler)
    print(f"Serving on http://localhost:{PORT}")
    server.serve_forever()

if __name__ == '__main__':
    run()
