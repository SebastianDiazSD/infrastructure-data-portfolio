# clause_patterns.py
# Country-specific clause detection patterns.
# To add a new country: add an entry to CLAUSE_CONFIGS.
# The rest of the app reads from ACTIVE_CONFIG only.

CLAUSE_CONFIGS = {
    "DE_VOB": {
        "pattern": r'(§\s*\d+[a-zA-Z]?)\s*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": ["§ 4", "§ 5", "§ 8", "§ 13", "§ 16"],
        "language": "de",
        "standard": "VOB/B",
    },
    "US_AIA": {
        # Placeholder — AIA contracts use "Article X" not §
        "pattern": r'(Article\s+\d+)\s*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": ["Article 3", "Article 7", "Article 14"],
        "language": "en",
        "standard": "AIA A201",
    },
    "CO_CCO": {
        # Placeholder — Colombian civil code contracts
        "pattern": r'(Cláusula\s+\d+[a-zA-Z]?)[:\s]*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": [],
        "language": "es",
        "standard": "CCo",
    },
}

# Change this line to switch country context
ACTIVE_CONFIG = CLAUSE_CONFIGS["DE_VOB"]