block4_pymupdf.md

# App 2 — Tender Document Risk Analyzer

## Concept 1 — Opening a PDF

import fitz # pymupdf

doc=fitz.open("contract.pdf")
print(len(doc)) # number of pages

## Concept 2 — Extracting text

page=doc[0]

### Mode 1 — plain string, entire page

text=page.get_text("text")

### Mode 2 — blocks: list of (x0, y0, x1, y1, text, block_no, block_type)

blocks=page.get_text("blocks")

### Mode 3 — structured dict with spans, fonts, sizes

data=page.get_text("dict")

### Extracting full document text with page numbers

page_text=[]

for page_num,page in enumerate(doc,start=1):
    text=page.get_text("text")
    pages_text.append({
                        "page":page_num,
                        "text": text
                        }
                        )

Page numbers are necessary to tell the user where a specific clause was found.

## Concept 3 — Detecting scanned PDFs

def is_scanned_pdf(doc: fitz.Document) -> bool:
    total_chars = sum(len(page.get_text("text").strip()) for page in doc)
    return total_chars < 100
    
If is_scanned_pdf() returns True, return a 422 error to the user: "Scanned PDFs are not supported in V1. Please upload a text-based PDF." That's it. No OCR in the MVP.

## Concept 4 — What a VOB/B clause looks like in raw text

Regex only works if you know what you're matching.

Key observations:

- The § symbol may have a space after it (§ 4) or not (§4) depending on the PDF
- The clause number is followed by a title
- Subsections are (1), (2), etc.
- Real contracts often have custom clauses added by the client that follow the same § X pattern

Regex needs to handle both §4 and § 4:

CLAUSE_PATTERN = re.compile(
    r'(§\s*\d+[a-zA-Z]?)\s+([^\n]{3,80}\n',
    re.UNICODE
    )
    
This matches § 4 Ausführung\n and §13 Mängelansprüche\n and § 16a Stundenlohnarbeiten\n.

## Concept 5 — The extraction function

def extract_clauses(full_text: str, pages_text: list[dict]) -> list[dict]:
    """
    Returns list of:
    {
        "number": "§ 4",
        "title": "Ausführung",
        "text": "...",  # full clause text until next §
        "page": 2
    }
    """
    # 1. Find all clause positions in full_text
    # 2. Slice text between positions
    # 3. Look up page number from pages_text
    # 4. Return structured list
    
## Personal notes

1. How to open a PDF from bytes (the FastAPI upload pattern)
    - PyMuPDF can open files other than just PDF. Supported files types: PDF,XPS,EPUB,MOBI,FB2,SVG,TXT,JPG,PNG,BMP,GIF...(Pro version can open office files:DOC/DOCX,XLS,PPT,HWP)
    - To create a Document class/open a file, do the following: import pymupdf doc = pymupdf.open("a.pdf") - modern standard recommended approach, import fitz still works but can cause conflict risk
2. The difference between get_text("text") and get_text("blocks") — one line each
    - get_text("text"): returns the whole/full text of a document (return all characters)
    - get_text("blocks"): returns a list of text blocks. Each item of this list contains position information for its text.
3. The scanned PDF detection check
    - function that counts the number of character of a page. If this number is below 100, the function return True, meaning it is highly possible it is a scanned PDF. V1 does not support this.
4. The regex pattern for § X Title and why the \s* is needed
    - regex patter is needed to identify clauses. Normally, clauses in Germany start with §. The \s* is needed to identify if there is a whitespace after the § (clause could be §X or § X)
5. The shape of the extract_clauses() function output
    - The function works first by identifying the positions of all the clauses in text (§X or § X). Then slices the text between clauses and look up the page number where the §X heading appears. Finally, it returns a structures list.
    
### Security

In-memory processing only — PDF bytes never written to disk on server. TLS provided by Render.com. No additional transport encryption needed in V1.
    
## Next Steps

- VOB/B clause structure -> which clause types carry highest contractor risk? What language signals risk? 
- Contracts from German, especially DB Contracts, are going to be analyzed for the first development of the app. However, the goal of the app is to be scalable (hit markets in the Us and Colombia) so a strategy for the regex pattern must be defined. One solution could be to have a file only for "clause/text pattern" so when the app is going to be needed in another country, only this file is going to be modified and the rest of the app remains untouched.
- Security is a top topic for the app. Contracts handle sensitive information that cannot be disclosed. Encryption methods must be implemented to protect data from interception, eavesdropping, and man-in-the-middle attacks. Suggestions: implement a TLS (Transport Layer Security)
- Checking the VOB teil B (link:) the "clause" part has different "styles". It can be "§ 1 Art und Umfang der Leistung", "§1 Art und Umfang der Leistung","§ 1
Art und Umfang der Leistung" or "§1
Art und Umfang der Leistung"(after the §X or § X comes a new line (\n) and not a space.
- Regex documentation and exercises: I understand overall how regex works. However, I am not familiar creating the regex patterns and this part is crucial so I can adjust the app accordingly to the country in which is used. I need a guide to learn the theory and also exercises to become a master of this. the app should begin for a beginner that does not have any knowledge (even thou I do) and go through everything so that person gets a pro creating regex patterns(practical exercises are crucial here! going from simple thing as extracting phone numbers or emails, to much complex tasks as extracting tables.)
