#!/usr/bin/env python3
"""
Update data.json with SFSFSS reading history from schedule.json
Adds missing authors and updates reading status/story links

Features:
- Extracts authors from HTML tags (e.g., <a href="">u/solguard</a> -> u/solguard)
- Filters out non-author entries like "unknown", "the internet", "US"
- Case-insensitive matching for existing authors
- Preserves all existing node data
"""

import json
import os
import re
from typing import Dict, List, Set, Tuple


def load_json_file(filename: str) -> dict:
    """Load and parse a JSON file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: {filename} not found")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing {filename}: {e}")
        return None


def save_json_file(filename: str, data: dict) -> bool:
    """Save data to JSON file with pretty printing"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving {filename}: {e}")
        return False


def clean_author_name(author: str) -> str:
    """
    Clean author name by removing HTML tags and extracting text content
    Returns cleaned name or empty string if invalid
    """
    if not author:
        return ""
    
    # Remove HTML tags and extract text content
    # Handle <a href="...">text</a> pattern
    author = re.sub(r'<a\s+[^>]*>([^<]+)</a>', r'\1', author)
    
    # Handle <span class="...">text</span> pattern
    author = re.sub(r'<span\s+[^>]*>([^<]+)</span>', r'\1', author)
    
    # Remove any remaining HTML tags
    author = re.sub(r'<[^>]+>', '', author)
    
    # Clean up whitespace
    author = author.strip()
    
    # List of non-author entries to skip (case-insensitive)
    skip_list = [
        "unknown",
        "the internet",
        "us",
        "how well can you predict the scientific and technological future?",
        # Add more as needed
    ]
    
    # Check if this is a real author
    if author.lower() in skip_list:
        return ""
    
    # Additional check for very short "authors" that are likely not real
    if len(author) <= 2 and author.upper() == author:  # e.g., "US", "UK"
        return ""
    
    return author


def extract_authors_from_stories(stories_data: List[dict]) -> Dict[str, Set[str]]:
    """
    Extract unique authors and their story URLs from schedule.json
    Returns: dict mapping author name -> set of story URLs
    """
    author_stories = {}
    total_stories = 0
    stories_with_urls = 0
    skipped_authors = []
    
    print("\nAnalyzing schedule.json structure...")
    
    # Handle both possible formats: array of weeks or array of stories
    for item in stories_data:
        # Check if this is a week object with stories array
        if 'stories' in item:
            print(f"  Week {item.get('number', '?')}: {len(item['stories'])} stories")
            for story in item['stories']:
                total_stories += 1
                raw_author = story.get('author', '').strip()
                author = clean_author_name(raw_author)
                
                if not author:
                    if raw_author and raw_author not in skipped_authors:
                        skipped_authors.append(raw_author)
                        print(f"    Skipped non-author: '{raw_author}'")
                    continue
                    
                if author not in author_stories:
                    author_stories[author] = set()
                
                # Extract URLs from links
                links = story.get('links', [])
                for link in links:
                    url = link.get('url', '').strip()
                    if url:  # Only add non-empty URLs
                        author_stories[author].add(url)
                        stories_with_urls += 1
        
        # Check if this is a flat story format (legacy)
        elif 'author' in item:
            total_stories += 1
            raw_author = item.get('author', '').strip()
            author = clean_author_name(raw_author)
            
            if not author:
                if raw_author and raw_author not in skipped_authors:
                    skipped_authors.append(raw_author)
                    print(f"  Skipped non-author: '{raw_author}'")
                continue
                
            if author not in author_stories:
                author_stories[author] = set()
            
            # Check for direct link field
            url = item.get('link', '').strip()
            if url:
                author_stories[author].add(url)
                stories_with_urls += 1
    
    print(f"\nStories analysis complete:")
    print(f"  Total stories found: {total_stories}")
    print(f"  Stories with URLs: {stories_with_urls}")
    print(f"  Unique valid authors: {len(author_stories)}")
    print(f"  Skipped non-authors: {len(skipped_authors)}")
    
    # List authors with their story counts
    print("\nAuthors found in reading history:")
    for author, urls in sorted(author_stories.items()):
        print(f"  - {author}: {len(urls)} story URL(s)")
    
    return author_stories


def find_author_in_nodes(author_name: str, nodes: List[dict]) -> dict:
    """
    Find an author node by name (case-insensitive)
    Returns the node dict if found, None otherwise
    """
    author_lower = author_name.lower()
    for node in nodes:
        if node.get('name', '').lower() == author_lower:
            return node
    return None


def get_next_node_id(nodes: List[dict]) -> int:
    """Get the next available node ID"""
    if not nodes:
        return 1
    max_id = max(node.get('id', 0) for node in nodes)
    return max_id + 1


def update_data_with_stories(data_file: str, stories_file: str) -> None:
    """
    Main function to update data.json with SFSFSS reading history
    """
    print(f"Loading {data_file}...")
    data = load_json_file(data_file)
    if data is None:
        return
    
    print(f"Loading {stories_file}...")
    stories = load_json_file(stories_file)
    if stories is None:
        return
    
    # Ensure data has the required structure
    if 'nodes' not in data:
        data['nodes'] = []
    if 'links' not in data:
        data['links'] = []
    
    print(f"\nCurrent graph statistics:")
    print(f"  Nodes (authors): {len(data['nodes'])}")
    print(f"  Links (relationships): {len(data['links'])}")
    
    # List current authors
    current_authors = {node.get('name', '').lower(): node.get('name', '') 
                      for node in data['nodes']}
    print(f"\nCurrent authors in graph: {len(current_authors)}")
    
    # Extract authors and their stories
    author_stories = extract_authors_from_stories(stories)
    
    # Track statistics
    authors_added = 0
    authors_updated = 0
    authors_already_marked = 0
    
    print("\nProcessing authors...")
    
    # Process each author from stories
    for author_name, story_urls in author_stories.items():
        existing_node = find_author_in_nodes(author_name, data['nodes'])
        
        if existing_node:
            # Update existing author
            changed = False
            
            # Check if already marked as read
            if existing_node.get('sfsfss_has_read', False):
                authors_already_marked += 1
            else:
                existing_node['sfsfss_has_read'] = True
                changed = True
            
            # Update story_links
            existing_links = set(existing_node.get('story_links', []))
            new_links = story_urls - existing_links
            
            if new_links:
                existing_node['story_links'] = sorted(list(existing_links | story_urls))
                changed = True
                print(f"  Updated: {author_name} (+{len(new_links)} new links)")
            elif changed:
                print(f"  Marked as read: {author_name}")
            
            if changed:
                authors_updated += 1
        else:
            # Add new author
            new_node = {
                'id': get_next_node_id(data['nodes']),
                'name': author_name,
                'sfsfss_has_read': True,
                'story_links': sorted(list(story_urls)) if story_urls else []
            }
            data['nodes'].append(new_node)
            authors_added += 1
            print(f"  Added new: {author_name} (ID: {new_node['id']}) with {len(story_urls)} links")
    
    # Ensure all existing nodes have the required fields
    nodes_needing_defaults = 0
    for node in data['nodes']:
        if 'sfsfss_has_read' not in node:
            node['sfsfss_has_read'] = False
            nodes_needing_defaults += 1
        if 'story_links' not in node:
            node['story_links'] = []
    
    if nodes_needing_defaults > 0:
        print(f"\nAdded default fields to {nodes_needing_defaults} existing nodes")
    
    # Save updated data
    print(f"\nSaving updates to {data_file}...")
    if save_json_file(data_file, data):
        print("\nSuccess! Summary:")
        print(f"  Authors added: {authors_added}")
        print(f"  Authors updated: {authors_updated}")
        print(f"  Authors already marked: {authors_already_marked}")
        print(f"  Total authors in graph: {len(data['nodes'])}")
        print(f"  Total SFSFSS authors read: {len(author_stories)}")
        
        # List authors not in graph
        missing_from_graph = []
        for author in author_stories:
            if author.lower() not in current_authors:
                if not find_author_in_nodes(author, data['nodes']):
                    missing_from_graph.append(author)
        
        if missing_from_graph:
            print(f"\nNote: The following authors from stories were not found in the original graph:")
            for author in missing_from_graph:
                print(f"  - {author}")
    else:
        print("Failed to save updates")


def analyze_data_files(data_file: str, stories_file: str) -> None:
    """
    Analyze both files to understand the data structure and potential issues
    """
    print("\n=== Data File Analysis ===")
    
    # Analyze data.json
    if os.path.exists(data_file):
        data = load_json_file(data_file)
        if data:
            print(f"\ndata.json structure:")
            print(f"  Top-level keys: {list(data.keys())}")
            if 'nodes' in data and data['nodes']:
                print(f"  Sample node: {json.dumps(data['nodes'][0], indent=2)}")
            if 'links' in data and data['links']:
                print(f"  Sample link: {json.dumps(data['links'][0], indent=2)}")
    
    # Analyze schedule.json
    if os.path.exists(stories_file):
        stories = load_json_file(stories_file)
        if stories and len(stories) > 0:
            print(f"\nschedule.json structure:")
            print(f"  Type: {type(stories)}")
            print(f"  Length: {len(stories)}")
            print(f"  First item keys: {list(stories[0].keys()) if isinstance(stories, list) else 'Not a list'}")
            if isinstance(stories, list) and len(stories) > 0:
                print(f"  Sample item: {json.dumps(stories[0], indent=2)}")


def main():
    """Entry point"""
    data_file = 'data/data.json'
    stories_file = 'data/schedule.json'
    
    # Check if files exist
    if not os.path.exists(stories_file):
        print(f"Error: {stories_file} not found!")
        print("Please ensure your SFSFSS reading history is saved as 'data/schedule.json'")
        return
    
    if not os.path.exists(data_file):
        print(f"Warning: {data_file} not found, creating new file...")
        save_json_file(data_file, {'nodes': [], 'links': []})
    
    # First analyze the files to understand structure
    analyze_data_files(data_file, stories_file)
    
    # Run the update
    print("\n=== Starting Update Process ===")
    update_data_with_stories(data_file, stories_file)


if __name__ == '__main__':
    main()