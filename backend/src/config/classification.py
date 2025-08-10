"""
Classification Configuration for Goods Category Mapping
This file contains configurable mappings for automatic goods classification
based on declared content descriptions.
"""

# Category keyword mappings for automatic classification
# Add new keywords to existing categories or create new categories as needed
CATEGORY_MAPPINGS = {
    'Documents': [
        'document', 'paper', 'letter', 'bill', 'invoice', 'contract', 
        'certificate', 'passport', 'visa', 'form', 'report', 'manual',
        'brochure', 'leaflet', 'catalog', 'catalogue', 'magazine'
    ],
    'Electronics': [
        'electronic', 'phone', 'computer', 'laptop', 'tablet', 'gadget',
        'mobile', 'cellphone', 'smartphone', 'iphone', 'android', 'pc',
        'camera', 'headphone', 'earphone', 'speaker', 'charger', 'cable',
        'battery', 'chip', 'circuit', 'motherboard', 'processor', 'memory',
        'hard drive', 'ssd', 'usb', 'bluetooth', 'wifi', 'router'
    ],
    'Clothing & Textiles': [
        'clothing', 'shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat',
        'shoes', 'boot', 'sandal', 'sock', 'underwear', 'bra', 'tie',
        'hat', 'cap', 'glove', 'scarf', 'fabric', 'textile', 'cotton',
        'wool', 'silk', 'polyester', 'leather', 'denim'
    ],
    'Personal Care & Cosmetics': [
        'cosmetic', 'makeup', 'lipstick', 'foundation', 'mascara', 'perfume',
        'cologne', 'shampoo', 'conditioner', 'soap', 'lotion', 'cream',
        'skincare', 'moisturizer', 'sunscreen', 'toothpaste', 'deodorant'
    ],
    'Pharmaceuticals': [
        'medicine', 'pharmaceutical', 'drug', 'medical', 'pill', 'tablet',
        'capsule', 'syrup', 'injection', 'vaccine', 'antibiotic', 'vitamin',
        'supplement', 'prescription', 'otc', 'over the counter'
    ],
    'Food & Beverages': [
        'food', 'snack', 'chocolate', 'candy', 'cookie', 'biscuit', 'tea',
        'coffee', 'drink', 'beverage', 'juice', 'wine', 'alcohol', 'spice',
        'sauce', 'oil', 'honey', 'jam', 'cereal', 'rice', 'noodle'
    ],
    'Books & Media': [
        'book', 'magazine', 'newspaper', 'journal', 'novel', 'textbook',
        'cd', 'dvd', 'blu-ray', 'music', 'movie', 'film', 'video', 'game'
    ],
    'Toys & Games': [
        'toy', 'doll', 'puzzle', 'game', 'board game', 'card game', 'lego',
        'action figure', 'stuffed animal', 'teddy bear', 'ball', 'bike'
    ],
    'Jewelry & Accessories': [
        'jewelry', 'jewellery', 'necklace', 'bracelet', 'ring', 'earring',
        'watch', 'chain', 'pendant', 'diamond', 'gold', 'silver', 'pearl'
    ],
    'Home & Garden': [
        'furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'mirror',
        'vase', 'plant', 'seed', 'tool', 'hammer', 'screwdriver', 'paint'
    ],
    'Sports & Fitness': [
        'sport', 'fitness', 'exercise', 'gym', 'ball', 'racket', 'golf',
        'tennis', 'basketball', 'football', 'soccer', 'running', 'yoga'
    ]
}

# Postal service detection patterns
# Add new patterns for different postal services
SERVICE_PATTERNS = {
    'EMS': [
        # EMS patterns
        lambda t: t.startswith('E') and 'CN' in t,
        lambda t: 'EMS' in t,
        lambda t: t.startswith('EE') or t.startswith('EP'),
        lambda t: t.startswith('CX') and len(t) == 13,  # China EMS format
    ],
    'Registered Mail': [
        # Registered mail patterns
        lambda t: t.startswith('R') and 'CN' in t,
        lambda t: t.startswith('L') and 'CN' in t,
        lambda t: 'REG' in t,
        lambda t: t.startswith('RR') or t.startswith('RL'),
    ],
    'Air Mail': [
        # Air mail patterns
        lambda t: t.startswith('C') and 'CN' in t,
        lambda t: 'AIR' in t,
        lambda t: t.startswith('CP') or t.startswith('CA'),
    ],
    'E-packet': [
        # E-packet patterns
        lambda t: t.startswith('L') and len(t) == 13,
        lambda t: 'PACKET' in t,
        lambda t: t.startswith('LP') or t.startswith('LK'),
    ],
    'Surface Mail': [
        # Surface mail patterns  
        lambda t: t.startswith('N') and 'CN' in t,
        lambda t: 'SURFACE' in t or 'SEA' in t,
        lambda t: t.startswith('NS') or t.startswith('NM'),
    ]
}


def add_category_keyword(category: str, keyword: str):
    """Add a keyword to an existing category"""
    if category not in CATEGORY_MAPPINGS:
        CATEGORY_MAPPINGS[category] = []
    if keyword not in CATEGORY_MAPPINGS[category]:
        CATEGORY_MAPPINGS[category].append(keyword.lower())

def remove_category_keyword(category: str, keyword: str):
    """Remove a keyword from a category"""
    if category in CATEGORY_MAPPINGS and keyword in CATEGORY_MAPPINGS[category]:
        CATEGORY_MAPPINGS[category].remove(keyword.lower())

def add_new_category(category: str, keywords: list):
    """Add a new category with keywords"""
    CATEGORY_MAPPINGS[category] = [kw.lower() for kw in keywords]

def remove_category(category: str):
    """Remove an entire category"""
    if category in CATEGORY_MAPPINGS:
        del CATEGORY_MAPPINGS[category]

def get_category_mappings():
    """Get current category mappings for runtime use, including custom mappings from database"""
    try:
        # Try to get custom mappings from database
        from models.database import SystemConfig
        import json
        
        custom_config = SystemConfig.get_config('custom_category_mappings', None, 'string')
        if custom_config:
            custom_mappings = json.loads(custom_config)
            # Merge with default mappings, giving priority to custom ones
            merged_mappings = CATEGORY_MAPPINGS.copy()
            for category, keywords in custom_mappings.items():
                if category in merged_mappings:
                    # Merge keywords, avoiding duplicates
                    merged_keywords = list(set(merged_mappings[category] + keywords))
                    merged_mappings[category] = merged_keywords
                else:
                    # New category from custom config
                    merged_mappings[category] = keywords
            return merged_mappings
    except Exception as e:
        # Fall back to default mappings if database access fails
        print(f"Warning: Could not load custom category mappings: {e}")
    
    return CATEGORY_MAPPINGS

def get_service_patterns():
    """Get current service patterns for runtime use"""
    return SERVICE_PATTERNS