import os
import re
import urllib.request
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Global cache for release notes
cached_notes = None

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    # Fetch feed with a browser user-agent to prevent any potential request blocking
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    with urllib.request.urlopen(req) as response:
        xml_content = response.read()
        
    feed = feedparser.parse(xml_content)
    parsed_items = []
    
    for entry in feed.entries:
        date_str = entry.get('title', 'Unknown Date')
        link = entry.get('link', '')
        # Fallback to id if link is not available
        entry_id = entry.get('id', date_str).replace(':', '_').replace('/', '_').replace('#', '_')
        
        # Get content HTML (feedparser maps atom:content to entry.content and atom:summary to entry.summary)
        content_html = ""
        if 'content' in entry and entry.content:
            content_html = entry.content[0].get('value', '')
        else:
            content_html = entry.get('summary', '')
            
        if not content_html.strip():
            continue
            
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_type = "Update"
        current_elements = []
        sub_item_index = 0
        
        # We split by h3 elements which signify the change type (e.g. Feature, Deprecation, Issue)
        for child in soup.contents:
            if child.name is None:
                text = child.string
                if text and text.strip():
                    current_elements.append(str(child))
                continue
                
            if child.name == 'h3':
                if current_elements:
                    html_content = "".join(current_elements).strip()
                    # Strip HTML to get plain text for Twitter/search
                    text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
                    # Clean up multiple whitespaces
                    text_content = re.sub(r'\s+', ' ', text_content)
                    
                    parsed_items.append({
                        "id": f"{entry_id}_{sub_item_index}",
                        "date": date_str,
                        "type": current_type,
                        "content_html": html_content,
                        "content_text": text_content,
                        "link": link
                    })
                    sub_item_index += 1
                
                current_type = child.get_text().strip()
                current_elements = []
            else:
                current_elements.append(str(child))
                
        # Append the last accumulated section
        if current_elements:
            html_content = "".join(current_elements).strip()
            text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            
            parsed_items.append({
                "id": f"{entry_id}_{sub_item_index}",
                "date": date_str,
                "type": current_type,
                "content_html": html_content,
                "content_text": text_content,
                "link": link
            })
            
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global cached_notes
    refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if cached_notes is None or refresh:
        try:
            cached_notes = fetch_and_parse_feed()
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch release notes: {str(e)}"
            }), 500
            
    return jsonify({
        "status": "success",
        "notes": cached_notes
    })

if __name__ == '__main__':
    # Run the app on 127.0.0.1:5001 (standard port, 5000 is occupied on macOS Monterey/later by AirPlay Receiver)
    app.run(host='127.0.0.1', port=5001, debug=True)
