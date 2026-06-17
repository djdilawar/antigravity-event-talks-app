# BigQuery Release Insights Dashboard

A modern, high-end web application built using **Python Flask**, **Vanilla HTML5**, **Vanilla JS**, and **Vanilla CSS**. It fetches the latest Google BigQuery Release Notes, structures the daily feeds into individual selectable updates (Features, Announcements, Issues, Deprecations), and lets you customize and share those updates directly on Twitter/X.

## Key Features

- **Automated XML Parsing**: Fetches the official Google Cloud BigQuery RSS/Atom feed and dynamically parses the HTML content.
- **Granular Updates Separation**: Automatically splits daily updates into individual, focused cards based on their category (e.g., separating an "Issue" from a "Feature" published on the same day).
- **Responsive Dark Theme**: A premium futuristic dashboard aesthetic with neon glow, glassmorphism, responsive grid layouts, and custom badges.
- **Search & Filter**: Real-time client-side search and category-based pill filtering (Features, Announcements, Issues, Deprecations).
- **Dynamic Refresh Button**: Features an animated sync spinner and fetches updates on demand with smart server-side caching.
- **Custom Tweet Composer**: Opens a modern glassmorphic compose modal populated with a pre-formatted draft, calculates remaining characters (280-character limit), and uses Twitter Web Intent to securely share the update.

## Project Structure

```text
bigquery_release_notes/
├── .venv/                  # Python virtual environment (managed by uv)
├── app.py                  # Flask backend (feed fetching, BeautifulSoup parsing, caching)
├── requirements.txt        # Python dependencies list
├── README.md               # Documentation
├── static/
│   ├── css/
│   │   └── style.css       # Custom modern dashboard styles
│   └── js/
│       └── main.js         # Core frontend application logic
└── templates/
    └── index.html          # Semantic HTML5 frontend layout
```

## How to Run

### Prerequisite

A Python 3.11+ environment.

### Step 1: Initialize environment and install dependencies

If you are using the pre-configured virtual environment:
```bash
# Activate virtual environment
source .venv/bin/activate

# (Optional) If you need to re-install dependencies:
pip install -r requirements.txt
```

### Step 2: Start the server

Run the Flask application:
```bash
python app.py
```

*Note: The app runs on port `5001` (to prevent conflict with macOS Monterey/later AirPlay services on port `5000`).*

### Step 3: Access the App

Open your browser and navigate to:
[http://127.0.0.1:5001](http://127.0.0.1:5001)
