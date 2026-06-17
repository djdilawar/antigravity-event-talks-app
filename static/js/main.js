// BigQuery Release Insights Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let allNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedNote = null;

    // DOM Elements
    const notesGrid = document.getElementById('notes-grid');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterPillsContainer = document.getElementById('filter-pills');
    const refreshBtn = document.getElementById('refresh-btn');
    const retryBtn = document.getElementById('retry-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    // Modal Elements
    const tweetDialog = document.getElementById('tweet-dialog');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charWarning = document.getElementById('char-warning');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');

    // Fetch release notes from Flask API
    async function fetchReleaseNotes(forceRefresh = false) {
        // Show loading state
        notesGrid.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        loadingState.style.display = 'flex';
        
        if (forceRefresh) {
            refreshBtn.classList.add('loading');
        }

        try {
            const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                allNotes = data.notes;
                renderNotes();
            } else {
                showError(data.message || 'Failed to fetch release notes.');
            }
        } catch (error) {
            showError('Network error. Please check if the backend server is running.');
            console.error('Fetch error:', error);
        } finally {
            loadingState.style.display = 'none';
            refreshBtn.classList.remove('loading');
        }
    }

    // Display Error Message
    function showError(msg) {
        errorMessage.textContent = msg;
        loadingState.style.display = 'none';
        notesGrid.style.display = 'none';
        emptyState.style.display = 'none';
        errorState.style.display = 'flex';
    }

    // Get filtered release notes based on search query and category
    function getFilteredNotes() {
        return allNotes.filter(note => {
            const matchesCategory = currentFilter === 'all' || note.type.toLowerCase() === currentFilter.toLowerCase();
            
            const q = searchQuery.toLowerCase();
            const matchesSearch = q === '' || 
                note.date.toLowerCase().includes(q) || 
                note.type.toLowerCase().includes(q) || 
                note.content_text.toLowerCase().includes(q);
                
            return matchesCategory && matchesSearch;
        });
    }

    // Render cards to grid
    function renderNotes() {
        notesGrid.innerHTML = '';
        
        const filteredNotes = getFilteredNotes();

        // Toggle Export CSV button visibility based on note presence
        if (exportCsvBtn) {
            exportCsvBtn.style.display = filteredNotes.length > 0 ? 'inline-flex' : 'none';
        }

        // Toggle Empty State
        if (filteredNotes.length === 0) {
            notesGrid.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.style.display = 'grid';

        // Build HTML for each card
        filteredNotes.forEach((note, index) => {
            const card = document.createElement('article');
            card.className = 'note-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            // Map types to corresponding badge classes
            let badgeClass = 'badge-update';
            const noteTypeLower = note.type.toLowerCase();
            if (noteTypeLower.includes('feature')) badgeClass = 'badge-feature';
            else if (noteTypeLower.includes('announcement')) badgeClass = 'badge-announcement';
            else if (noteTypeLower.includes('issue')) badgeClass = 'badge-issue';
            else if (noteTypeLower.includes('deprecation')) badgeClass = 'badge-deprecation';

            card.innerHTML = `
                <div>
                    <div class="note-card-header">
                        <span class="note-date">${escapeHTML(note.date)}</span>
                        <span class="badge ${badgeClass}">${escapeHTML(note.type)}</span>
                    </div>
                    <div class="note-card-body">
                        ${note.content_html}
                    </div>
                </div>
                <div class="note-card-footer">
                    <button class="btn-card-copy" aria-label="Copy update to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="btn-card-tweet" aria-label="Tweet this update">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;

            // Copy button handler
            const copyBtn = card.querySelector('.btn-card-copy');
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(note.content_text);
                    
                    // Visual feedback
                    const span = copyBtn.querySelector('span');
                    const origText = span.textContent;
                    copyBtn.classList.add('copied');
                    span.textContent = 'Copied!';
                    
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        span.textContent = origText;
                    }, 1500);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                    alert('Failed to copy to clipboard.');
                }
            });

            // Tweet button handler
            const tweetBtn = card.querySelector('.btn-card-tweet');
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(note);
            });

            notesGrid.appendChild(card);
        });
    }

    // Modal compose logic
    function openTweetComposer(note) {
        selectedNote = note;
        
        // Compose a smart draft
        const prefix = `BigQuery ${note.type} (${note.date}): `;
        const tags = ` #BigQuery #GCP`;
        const link = note.link ? ` ${note.link}` : '';
        
        // Calculate remaining room for the snippet
        const reservedLen = prefix.length + tags.length + link.length;
        const availableContentLen = 280 - reservedLen;
        
        let snippet = note.content_text;
        
        if (snippet.length > availableContentLen) {
            // Cut text neatly to fit inside 280 characters limit
            snippet = snippet.substring(0, availableContentLen - 3).trim() + '...';
        }
        
        const fullDraft = `${prefix}"${snippet}"${tags}${link}`;
        
        // Pre-fill text area
        tweetTextarea.value = fullDraft;
        updateCharCount();
        
        // Show dialog modal
        tweetDialog.showModal();
    }

    // Character Counter
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCount.textContent = len;
        
        if (len > 280) {
            charCount.parentElement.classList.add('warning');
            charWarning.style.display = 'block';
        } else {
            charCount.parentElement.classList.remove('warning');
            charWarning.style.display = 'none';
        }
    }

    // Close Dialog Modal
    function closeTweetModal() {
        tweetDialog.close();
        selectedNote = null;
    }

    // Submit Tweet Action (Opens Twitter Web Intent)
    function submitTweet() {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // HTML Escaper for security
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Event Listeners
    
    // Refresh action
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes());

    // Export CSV action
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const notesToExport = getFilteredNotes();
            if (notesToExport.length === 0) return;
            
            const headers = ["Date", "Type", "Content", "Link"];
            const csvRows = [];
            
            const escapeCSV = (str) => {
                if (str === null || str === undefined) return '';
                const stringVal = String(str);
                return `"${stringVal.replace(/"/g, '""')}"`;
            };
            
            // Add UTF-8 BOM so Excel opens it with correct encoding
            csvRows.push(headers.map(escapeCSV).join(","));
            
            for (const note of notesToExport) {
                const row = [
                    note.date,
                    note.type,
                    note.content_text,
                    note.link
                ];
                csvRows.push(row.map(escapeCSV).join(","));
            }
            
            const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Search query input handling
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        renderNotes();
    });

    // Clear search action
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderNotes();
        searchInput.focus();
    });

    // Pill filters
    filterPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;

        // Toggle active style
        filterPillsContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        // Apply filter and render
        currentFilter = pill.dataset.type;
        renderNotes();
    });

    // Modal Events
    tweetTextarea.addEventListener('input', updateCharCount);
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    submitTweetBtn.addEventListener('click', submitTweet);

    // Close on clicking backdrop
    tweetDialog.addEventListener('click', (e) => {
        if (e.target === tweetDialog) {
            closeTweetModal();
        }
    });

    // Trigger Initial Load
    fetchReleaseNotes();
});
