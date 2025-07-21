// static/main.js

// --- DROPZONE CONFIGURATION ---
// Disable Dropzone's auto-discovery behavior.
// We will initialize it manually on our form.
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPath = '.'; 
    let selectedItem = null;
    let isAdminLoggedIn = false;
    // Clipboard object to manage copy/paste state
    let clipboard = {
        sourcePath: null,
        action: null // Can be 'copy' or 'move'
    };

    // --- DOM ELEMENT REFERENCES ---
    const fileTreeContainer = document.getElementById('file-tree-container');
    const authLink = document.getElementById('auth-link');
    const adminActions = document.querySelectorAll('.admin-action');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadDropzoneEl = document.getElementById('upload-dropzone');
    
    const backBtn = document.getElementById('back-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const createFileBtn = document.getElementById('create-file-btn');
    const copyBtn = document.getElementById('copy-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const deleteBtn = document.getElementById('delete-btn');
    
    // Password modal elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const passwordChangeForm = document.getElementById('password-change-form');
    const modalErrorMessage = document.getElementById('modal-error-message');

    // --- INITIALIZE DROPZONE ---
    const myDropzone = new Dropzone("#upload-dropzone", {
        url: "/api/upload", // The backend endpoint for uploads
        autoProcessQueue: true, // Automatically upload files when added
        paramName: "file", // The name of the file parameter
        maxFilesize: 50, // Max file size in MB
        clickable: true, // Allow clicking to select files
        init: function() {
            this.on("sending", (file, xhr, formData) => formData.append("path", currentPath));
            this.on("queuecomplete", () => {
                fetchAndRenderFiles(currentPath);
                uploadDropzoneEl.style.display = 'none';
            });
        }
    });

    // --- CORE FUNCTIONS ---

    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/verify'); 
            isAdminLoggedIn = response.ok;
        } catch (error) {
            isAdminLoggedIn = false;
            console.error('Error checking auth status:', error);
        }
        updateUIBasedOnAuth();
    }

    function updateUIBasedOnAuth() {
        if (isAdminLoggedIn) {
            authLink.textContent = 'Logout';
            authLink.href = '#';
            authLink.onclick = handleLogout;
            adminActions.forEach(btn => btn.style.display = 'inline-flex');
        } else {
            authLink.textContent = 'Admin Login';
            authLink.href = '/login.html';
            authLink.onclick = null;
            adminActions.forEach(btn => btn.style.display = 'none');
            uploadDropzoneEl.style.display = 'none';
        }
    }

    async function fetchAndRenderFiles(path = '.') {
        currentPath = path;
        backBtn.style.display = path === '.' ? 'none' : 'inline-flex';
        try {
            const response = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error('Failed to fetch file list.');

            const items = await response.json();
            fileTreeContainer.innerHTML = ''; 

            items.filter(item => item.type === 'folder').forEach(item => fileTreeContainer.appendChild(createItemElement(item)));
            items.filter(item => item.type === 'file').forEach(item => fileTreeContainer.appendChild(createItemElement(item)));

        } catch (error) {
            console.error('Error fetching files:', error);
            fileTreeContainer.innerHTML = `<p class="error">Could not load files. Please try again.</p>`;
        }
    }

    function createItemElement(item) {
        const itemEl = document.createElement('div');
        itemEl.className = item.type;
        itemEl.dataset.path = item.path;
        const iconClass = item.type === 'folder' ? 'fa-folder' : 'fa-file-alt';
        
        // The main item content with icon and name
        let itemHTML = `<div class="item-main"><i class="fas ${iconClass}"></i><span>${item.name}</span></div>`;
        
        // Add metadata for size and date
        let metadataHTML = `<div class="item-meta">
                                <span class="item-size">${item.size}</span>
                                <span class="item-modified">${item.modified}</span>
                            </div>`;

        itemEl.innerHTML = itemHTML + metadataHTML;
        
        // Make items draggable only if the user is an admin
        if (isAdminLoggedIn) {
            itemEl.draggable = true;
        }
        
        return itemEl;
    }


    // --- EVENT HANDLERS ---

    async function handleLogout() {
        await fetch('/api/logout'); 
        await checkAuthStatus();
        fetchAndRenderFiles('.');
    }
    
    function handleCreate(type) {
        const name = prompt(`Enter new ${type} name:`);
        if (!name) return;
        const endpoint = type === 'folder' ? '/api/create_folder' : '/api/create_file';
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentPath, name: name })
        }).then(response => {
            if (response.ok) fetchAndRenderFiles(currentPath);
            else alert(`Failed to create ${type}. It might already exist.`);
        });
    }

    function handleDelete() {
        if (!selectedItem) return alert('Please select an item to delete.');
        if (confirm(`Are you sure you want to delete "${selectedItem.dataset.path}"?`)) {
            fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: selectedItem.dataset.path })
            }).then(response => {
                if (response.ok) fetchAndRenderFiles(currentPath);
                else alert('Failed to delete item.');
            });
        }
    }

    function handleCopy() {
        if (!selectedItem) return alert('Please select an item to copy.');
        clipboard.sourcePath = selectedItem.dataset.path;
        clipboard.action = 'copy';
        const filename = clipboard.sourcePath.split(/[\\/]/).pop();
        alert(`Copied "${filename}" to clipboard.`);
    }

    function handlePaste() {
        if (!clipboard.sourcePath) return alert('Clipboard is empty.');
        fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                source: clipboard.sourcePath,
                destination: currentPath,
                action: clipboard.action
            })
        }).then(async response => {
            if (response.ok) {
                clipboard = { sourcePath: null, action: null };
                fetchAndRenderFiles(currentPath);
            } else {
                const err = await response.json();
                alert(`Paste operation failed: ${err.error}`);
            }
        });
    }

    async function handleChangePassword(event) {
        event.preventDefault();
        // (Password change logic remains the same)
    }

    // --- EVENT LISTENERS ---

    fileTreeContainer.addEventListener('click', (e) => {
        const clickedItem = e.target.closest('.file, .folder');
        if (!clickedItem) return;

        if (selectedItem) selectedItem.classList.remove('selected');
        selectedItem = clickedItem;
        selectedItem.classList.add('selected');

        // On double click...
        if (e.detail === 2) {
            if (clickedItem.classList.contains('folder')) {
                // Navigate into folder
                fetchAndRenderFiles(clickedItem.dataset.path);
            } else if (clickedItem.classList.contains('file')) {
                // Download file
                window.location.href = `/api/download?path=${encodeURIComponent(clickedItem.dataset.path)}`;
            }
        }
    });

    // --- DRAG AND DROP LISTENERS ---
    fileTreeContainer.addEventListener('dragstart', (e) => {
        const dragItem = e.target.closest('.file, .folder');
        if (dragItem && isAdminLoggedIn) {
            e.dataTransfer.setData('text/plain', dragItem.dataset.path);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    fileTreeContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        const dropTarget = e.target.closest('.folder');
        if (dropTarget) {
            dropTarget.classList.add('drop-target'); // Highlight drop target
        }
    });

    fileTreeContainer.addEventListener('dragleave', (e) => {
        const dropTarget = e.target.closest('.folder');
        if (dropTarget) {
            dropTarget.classList.remove('drop-target'); // Remove highlight
        }
    });

    fileTreeContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.folder');
        if (dropTarget) {
            dropTarget.classList.remove('drop-target'); // Remove highlight
            const sourcePath = e.dataTransfer.getData('text/plain');
            const destinationPath = dropTarget.dataset.path;

            if (sourcePath === destinationPath || destinationPath.startsWith(sourcePath + '/')) {
                alert("Cannot move a folder into itself.");
                return;
            }

            fetch('/api/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: sourcePath,
                    destination: destinationPath,
                    action: 'move'
                })
            }).then(response => {
                if (response.ok) {
                    fetchAndRenderFiles(currentPath);
                } else {
                    alert('Move operation failed.');
                }
            });
        }
    });
    
    // Attach handlers to all buttons
    createFolderBtn.addEventListener('click', () => handleCreate('folder'));
    createFileBtn.addEventListener('click', () => handleCreate('file'));
    deleteBtn.addEventListener('click', handleDelete);
    copyBtn.addEventListener('click', handleCopy);
    pasteBtn.addEventListener('click', handlePaste);

    backBtn.addEventListener('click', () => {
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '.';
        fetchAndRenderFiles(parentPath);
    });

    uploadBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            uploadDropzoneEl.style.display = uploadDropzoneEl.style.display === 'none' ? 'block' : 'none';
        }
    });

    // Password modal listeners
    changePasswordBtn.addEventListener('click', () => passwordModal.style.display = 'flex');
    closeModalBtn.addEventListener('click', () => passwordModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == passwordModal) passwordModal.style.display = 'none';
    });
    passwordChangeForm.addEventListener('submit', handleChangePassword);

    // --- INITIALIZATION ---
    async function init() {
        await checkAuthStatus();
        fetchAndRenderFiles(currentPath);
    }

    init();
});
