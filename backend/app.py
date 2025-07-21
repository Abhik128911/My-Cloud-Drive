import os
import shutil
import sqlite3
import datetime # NEW: Import datetime for formatting timestamps
from flask import Flask, jsonify, request, session, abort, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

# --- APP SETUP & CONFIGURATION ---

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'), static_url_path='/static')

CORS(app, supports_credentials=True) 
app.secret_key = '6295434536'

# --- DIRECTORY DEFINITIONS ---
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BACKEND_DIR, 'storage')
DATABASE_DIR = os.path.join(BACKEND_DIR, 'database')
DATABASE_PATH = os.path.join(DATABASE_DIR, 'users.db')


# --- DATABASE & INITIAL DIRECTORY SETUP ---

def init_db():
    os.makedirs(DATABASE_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    new_username = 'cloudadmin'
    new_password = 'cloudpassword123'
    cursor.execute("SELECT * FROM users WHERE username = ?", (new_username,))
    if cursor.fetchone() is None:
        cursor.execute("DELETE FROM users WHERE username = ?", ('admin',))
        admin_password_hash = generate_password_hash(new_password)
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (new_username, admin_password_hash))
        print(f"Default user '{new_username}' created with password '{new_password}'.")
    conn.commit()
    conn.close()

def create_initial_directories():
    default_dirs = ['Home', 'Desktop', 'Documents', 'Pictures', 'Music', 'Videos']
    for dir_name in default_dirs:
        path = os.path.join(STORAGE_DIR, dir_name)
        os.makedirs(path, exist_ok=True)

# --- HELPER FUNCTIONS ---

def get_full_path(path):
    safe_path = os.path.normpath(path).lstrip('./\\')
    full_path = os.path.join(STORAGE_DIR, safe_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(STORAGE_DIR)):
        abort(400, "Invalid path specified.")
    return full_path

# NEW: Helper function to format file sizes
def sizeof_fmt(num, suffix="B"):
    """
    Converts a number of bytes to a human-readable format.
    """
    for unit in ["", "K", "M", "G", "T", "P", "E", "Z"]:
        if abs(num) < 1024.0:
            return f"{num:3.1f} {unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f}Y{suffix}"


# --- STATIC FILE SERVING ---

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_frontend_files(filename):
    if filename.startswith('api/'):
        abort(404)
    return send_from_directory(FRONTEND_DIR, filename)

# --- AUTHENTICATION API ROUTES ---

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    user_record = cursor.fetchone()
    conn.close()
    if user_record and check_password_hash(user_record[0], password):
        session['is_admin'] = True
        session['username'] = username
        return jsonify({"message": "Login successful."}), 200
    return jsonify({"message": "Invalid username or password."}), 401

@app.route('/api/logout')
def logout():
    session.clear()
    return jsonify({"message": "Logged out."}), 200

@app.route('/api/verify')
def verify_session():
    if session.get('is_admin'):
        return jsonify({"is_admin": True}), 200
    return jsonify({"is_admin": False}), 401

@app.route('/api/change_password', methods=['POST'])
def change_password():
    if not session.get('is_admin'): abort(403)
    data = request.get_json()
    current_password, new_password = data.get('current_password'), data.get('new_password')
    if not all([current_password, new_password]):
        return jsonify({"error": "All fields are required."}), 400
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    username = session.get('username', 'cloudadmin')
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    user_record = cursor.fetchone()
    if not user_record or not check_password_hash(user_record[0], current_password):
        conn.close()
        return jsonify({"error": "Current password is not correct."}), 401
    new_password_hash = generate_password_hash(new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (new_password_hash, username))
    conn.commit()
    conn.close()
    return jsonify({"message": "Password updated successfully."}), 200


# --- FILE MANAGEMENT API ROUTES ---

# UPDATED: The /api/list route now includes size and modification date
@app.route('/api/list')
def list_files():
    """Lists files and folders, now including metadata."""
    req_path = request.args.get('path', '.')
    full_path = get_full_path(req_path)
    if not os.path.exists(full_path) or not os.path.isdir(full_path):
        return jsonify({"error": "Directory not found."}), 404
    
    items = []
    for name in sorted(os.listdir(full_path)):
        item_path = os.path.join(full_path, name)
        is_dir = os.path.isdir(item_path)
        
        try:
            size_bytes = os.path.getsize(item_path) if not is_dir else 0
            mtime = os.path.getmtime(item_path)
            modified_date = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        except OSError:
            # Skip file if it's deleted between listing and getting stats
            continue

        item_info = {
            "name": name, 
            "path": os.path.join(req_path, name), 
            "type": "folder" if is_dir else "file",
            "size": sizeof_fmt(size_bytes) if not is_dir else "",
            "modified": modified_date
        }
        items.append(item_info)
        
    return jsonify(items)

@app.route('/api/download')
def download_file():
    req_path = request.args.get('path')
    if not req_path: return jsonify({"error": "File path is required."}), 400
    full_path = get_full_path(req_path)
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        return jsonify({"error": "File not found or is a directory."}), 404
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    return send_from_directory(directory, filename, as_attachment=True)


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not session.get('is_admin'): abort(403)
    if 'file' not in request.files: return jsonify({"error": "No file part in the request."}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No file selected."}), 400
    destination_path = request.form.get('path', '.')
    full_path = get_full_path(destination_path)
    if file:
        file.save(os.path.join(full_path, file.filename))
        return jsonify({"message": "File uploaded successfully."}), 201
    return jsonify({"error": "File upload failed."}), 500

@app.route('/api/create_file', methods=['POST'])
def create_file():
    if not session.get('is_admin'): abort(403)
    data = request.get_json()
    file_name = data.get('name')
    if not file_name: return jsonify({"error": "File name is required."}), 400
    full_path = get_full_path(os.path.join(data.get('path', '.'), file_name))
    try:
        if not os.path.exists(full_path):
            with open(full_path, 'w') as f: pass
            return jsonify({"message": f"File '{file_name}' created."}), 201
        else:
            return jsonify({"error": "File with this name already exists."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/create_folder', methods=['POST'])
def create_folder():
    if not session.get('is_admin'): abort(403)
    data = request.get_json()
    folder_name = data.get('name')
    if not folder_name: return jsonify({"error": "Folder name is required."}), 400
    full_path = get_full_path(os.path.join(data.get('path', '.'), folder_name))
    try:
        os.makedirs(full_path)
        return jsonify({"message": f"Folder '{folder_name}' created."}), 201
    except FileExistsError:
        return jsonify({"error": "Folder with this name already exists."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete_item():
    if not session.get('is_admin'): abort(403)
    path_to_delete = request.get_json().get('path')
    if not path_to_delete: return jsonify({"error": "Path is required."}), 400
    full_path = get_full_path(path_to_delete)
    if not os.path.exists(full_path): return jsonify({"error": "Item not found."}), 404
    try:
        if os.path.isdir(full_path): shutil.rmtree(full_path)
        else: os.remove(full_path)
        return jsonify({"message": f"Successfully deleted '{path_to_delete}'."}), 200
    except Exception as e:
        return jsonify({"error": f"Error deleting item: {str(e)}"}), 500

@app.route('/api/move', methods=['POST'])
def move_item():
    if not session.get('is_admin'): abort(403)
    data = request.get_json()
    source, destination, action = data.get('source'), data.get('destination'), data.get('action')
    if not all([source, destination, action]):
        return jsonify({"error": "Missing source, destination, or action."}), 400
    source_full_path = get_full_path(source)
    dest_full_path = get_full_path(os.path.join(destination, os.path.basename(source)))
    if not os.path.exists(source_full_path): return jsonify({"error": "Source item does not exist."}), 404
    try:
        if action == 'copy':
            if os.path.isdir(source_full_path): shutil.copytree(source_full_path, dest_full_path)
            else: shutil.copy2(source_full_path, dest_full_path)
        elif action == 'move':
            shutil.move(source_full_path, dest_full_path)
        else:
            return jsonify({"error": "Invalid action."}), 400
        return jsonify({"message": "Operation successful."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    os.makedirs(STORAGE_DIR, exist_ok=True)
    init_db()
    create_initial_directories()
    app.run(debug=False, port=5000)
