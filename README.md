# Personal Cloud Storage & File Manager

A complete, self-hosted cloud storage web application built with a Python Flask backend and a vanilla JavaScript frontend. This application provides a secure, admin-controlled file management system that mimics the functionality of a desktop file explorer, accessible from any web browser.

![Project Screenshot](https://placehold.co/800x450/e9f2ff/007bff?text=Cloud%20Storage%20UI)

---

## ✨ Features

* **Secure Admin Panel:** All file operations are protected behind a secure login system.
* **Full CRUD Functionality:**
    * **Create:** Create new files and folders.
    * **Read:** List files and folders with metadata (size, last modified).
    * **Update:** Move files and folders using intuitive drag-and-drop or copy/paste.
    * **Delete:** Securely delete files and folders.
* **Drag-and-Drop Uploads:** Easily upload files by dragging them into the browser, powered by Dropzone.js.
* **File Downloads:** Double-click any file to download it directly.
* **Dynamic UI:** The file explorer interface is rendered dynamically based on backend data.
* **Secure Password Management:** Includes functionality for the admin to change their password.
* **Persistent Storage:** Uses a SQLite database for user credentials and the local filesystem for file storage.

---

## 🛠️ Tech Stack

* **Backend:**
    * **Python 3**
    * **Flask:** A lightweight WSGI web application framework.
    * **Werkzeug:** For password hashing and security.
    * **SQLite3:** For the user database.
* **Frontend:**
    * **HTML5**
    * **CSS3**
    * **Vanilla JavaScript:** For all client-side logic and API interaction.
    * **Dropzone.js:** For handling drag-and-drop file uploads.
    * **Font Awesome:** For icons.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Python 3 and `pip` installed on your system.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/cloud-storage-project.git](https://github.com/your-username/cloud-storage-project.git)
    cd cloud-storage-project
    ```

2.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

3.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

4.  **Install the required Python packages:**
    ```bash
    pip install Flask Werkzeug Flask-Cors
    ```

5.  **Run the Flask server:**
    ```bash
    python app.py
    ```
    The server will start, and it will automatically create the `database/users.db` file and the `storage/` directory with default folders.

6.  **Access the application:**
    Open your web browser and navigate to:
    **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔑 Admin Login

A default admin user is created the first time you run the server.

* **Username:** `cloudadmin`
* **Password:** `cloudpassword123`/ `abhik`

**Important:** It is highly recommended to change the password immediately after your first login using the "Change Password" feature in the UI.

---

## 📁 Project Structure


cloud_storage_project/
|
├── backend/
│   ├── app.py              # The main Flask application
│   ├── database/
│   │   └── users.db        # SQLite database for user credentials
│   └── storage/            # Directory where uploaded files are stored
│
└── frontend/
    ├── index.html          # Main file explorer page
    ├── login.html          # Admin login page
    └── static/
        ├── styles.css      # All CSS styles
        └── main.js         # All client-side JavaScript logic


---

## ☁️ Deployment

This project requires a hosting provider that can run a persistent Python backend.

* **Recommended Free Services:** [Render.com](https://render.com/) or [Railway.app](https://railway.app/). Both have free tiers that support Python applications, include persistent storage for your database and files, and allow you to connect a custom domain.
* **Easiest All-in-One Option:** [Replit.com](https://replit.com/). You can upload the entire project and run it in one environment. Note that connecting a custom domain on Replit is a paid feature.

**Before deploying to a live server, remember to:**
1.  Change `app.secret_key` in `app.py` to a new, random string.
2.  Change `app.run(debug=True)` to `app.run(debug=False)`.

---

## 🔮 Future Improvements

This project has a solid foundation. Here are some ideas for future enhancements:

* **File Previews:** Add in-browser previews for common file types like images, text, and PDFs.
* **Search Functionality:** Implement a search bar to find files by name.
* **Public Link Sharing:** Generate shareable public links for files, with optional password protection or expiration dates.
* **Multi-User Support:** Expand the application to support multiple users, each with their own private storage space.
* **Dark/Light Theme Toggle:** Add a UI toggle for user-preferred color schemes.
