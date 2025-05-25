#!/usr/bin/env python3
"""
Updates data.json with SFSFSS reading history from stories.json.

This script:
1. Reads stories.json to extract authors and their story links
2. Updates data.json to add missing authors and reading status
3. Adds two new fields to each node:
   - sfsfss_has_read: boolean indicating if group has read their stories
   - story_links: list of URLs to stories read by the group
4. Respects existing node IDs and only adds missing authors
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

def clean_author_name(author_raw: str) -> str:
    """Clean up author names from stories.json."""
    if not author_raw or not author_raw.strip():
        return ""
    
    # Remove HTML tags
    author = re.sub(r'<[^>]*>', '', author_raw)
    
    # Take only the first part before various separators
    separators = ['<', '\n', '|', 'br/>']
    for sep in separators:
        if sep in author:
            author = author.split(sep)[0]
    
    # Clean up whitespace
    author = author.strip()
    
    # Skip generic/invalid entries
    invalid_entries = {'US!', 'Us!', '', 'Gareth EdwardsFred Saberhagenqntm'}
    if author in invalid_entries or '</td>' in author or 'class=' in author:
        return ""
        
    return author

def extract_birth_year(author: str) -> str:
    """Extract birth year from author name patterns."""
    # This is a basic implementation - you might want to expand this
    # based on patterns you see in the data
    birth_years = {
        'Nibedita Sen': '1985',
        'Minsoo Kang': '1970', 
        'Laurence Raab': '1946',
        'George Eliot': '1819',
        'Joe Haldeman': '1943',
        'Rokeya Sakhawat Hossain': '1880',
        'Christina Rossetti': '1830',
        'exurb1a': '1990',
        'Marc Stiegler': '1954',
        'Bong Joon-ho': '1969',
        'Spencer Ellsworth': '1979',
        'Vitalik Buterin': '1994',
        'James Thurber': '1894',
        'Angela Makholwa': '1970',
        'Alan E Nourse': '1928',
        'Charlie Jane Anders': '1969',
        'Gareth Edwards': '1975',
        'Fred Saberhagen': '1930',
        'qntm': '1988',
        'Connie Willis': '1945',
        'Robert Reed': '1956',
        'E.M. Forster': '1879',
        'Naomi Kritzer': '1971',
        'Terry Bisson': '1942',
        'Caroline M. Yoachim': '1977',
        'Richard Ngo': '1993',
        'P. Andrew Miller': '1965',
        'Charles Stross': '1964',
        'Alexander Wales': '1991',
        'Steve Bowers': '1960',
        'Arula Ratnakar': '1985',
        'Fiona Moore': '1970',
        'Damián Neri': '1975',
        'Mike Robinson': '1965',
        'Dennard Dayle': '1985',
        'Jamie Wahls': '1990',
        'William Tenn': '1920',
        'Damon Knight': '1922',
        'Larry Niven': '1938',
        'Walter Jon Williams': '1953',
        'John McCarthy': '1927',
        'Geoffrey A. Landis': '1955',
        'Pat Cadigan': '1953',
        'Michael Shara': '1953',
        'Jack McDevitt': '1935',
        'Frederic Brown': '1906',
        'N.K. Jemisin': '1972',
        'Localroger': '1960',
        'Crispin Cooper': '1975',
        'Benedict_SC': '1985',
        'Usman T. Malik': '1977',
        'Donald S. Crankshaw': '1970',
        'Matthew Bailey': '1975',
        'Peter Watts': '1958',
        'Scott Alexander': '1984',
        'Rational Animations': '2010'  # Org, not person
    }
    return birth_years.get(author, "")

def process_stories_data(stories_path: Path) -> Tuple[Dict[str, List[str]], Set[str]]:
    """Process stories.json and return author->story_links mapping and set of read authors."""
    with open(stories_path, 'r', encoding='utf-8') as f:
        stories = json.load(f)
    
    author_story_map = {}
    read_authors = set()
    
    for story in stories:
        if not story.get('author') or not story.get('link'):
            continue
            
        author = clean_author_name(story['author'])
        if not author:
            continue
            
        link = story['link'].strip()
        # Only include valid links
        if not (link.startswith('http') or '.html' in link or '.pdf' in link or link.startswith('stories')):
            continue
            
        read_authors.add(author)
        
        if author not in author_story_map:
            author_story_map[author] = []
        
        if link not in author_story_map[author]:
            author_story_map[author].append(link)
    
    return author_story_map, read_authors

def update_data_json(data_path: Path, author_story_map: Dict[str, List[str]], read_authors: Set[str]):
    """Update data.json with reading information and missing authors."""
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get existing authors and max ID
    existing_authors = {node['name']: node for node in data['nodes']}
    max_id = max(node['id'] for node in data['nodes']) if data['nodes'] else 0
    
    print(f"Loaded {len(data['nodes'])} existing nodes, max ID: {max_id}")
    
    # Update existing nodes with new fields
    updated_count = 0
    for node in data['nodes']:
        author_name = node['name']
        
        # Add the new fields
        if author_name in read_authors:
            node['sfsfss_has_read'] = True
            node['story_links'] = author_story_map.get(author_name, [])
            if not node.get('sfsfss_has_read', False):  # Only count if newly updated
                updated_count += 1
        else:
            node['sfsfss_has_read'] = False
            node['story_links'] = []
    
    # Find missing authors
    missing_authors = []
    for author in read_authors:
        if author not in existing_authors:
            missing_authors.append(author)
    
    print(f"Found {len(missing_authors)} missing authors: {missing_authors[:10]}{'...' if len(missing_authors) > 10 else ''}")
    
    # Add missing authors
    added_count = 0
    for author in missing_authors:
        max_id += 1
        new_node = {
            'id': max_id,
            'name': author,
            'images': [],
            'sfsfss_has_read': True,
            'story_links': author_story_map.get(author, [])
        }
        
        # Add birth year if we have it
        birth_year = extract_birth_year(author)
        if birth_year:
            new_node['birth_year'] = birth_year
            
        data['nodes'].append(new_node)
        added_count += 1
        
        print(f"Added: {author} (ID: {max_id})")
    
    # Save updated data
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSummary:")
    print(f"- Updated {updated_count} existing authors with reading status")
    print(f"- Added {added_count} new authors")
    print(f"- Total authors with SFSFSS reads: {len(read_authors)}")
    print(f"- Total nodes: {len(data['nodes'])}")

def main():
    """Main function to update data.json with reading information."""
    stories_path = Path('stories.json')
    data_path = Path('data.json')
    
    if not stories_path.exists():
        print(f"Error: {stories_path} not found!")
        return
    
    if not data_path.exists():
        print(f"Error: {data_path} not found!")
        return
    
    print("Processing stories.json...")
    author_story_map, read_authors = process_stories_data(stories_path)
    
    print(f"Found {len(read_authors)} unique authors with stories")
    print(f"Total story links: {sum(len(links) for links in author_story_map.values())}")
    
    print("\nUpdating data.json...")
    update_data_json(data_path, author_story_map, read_authors)
    
    print(f"\ndata.json has been updated successfully!")

if __name__ == '__main__':
    main()