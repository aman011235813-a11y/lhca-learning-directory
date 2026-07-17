import sys, zipfile, xml.etree.ElementTree as ET, os, csv

path = r"c:\Aman's Folder\05 - Coding\test-vc-website\LHCA_Cleaned_Data.xlsx"
if not os.path.exists(path):
    print('MISSING_FILE:', path)
    sys.exit(1)

with zipfile.ZipFile(path) as z:
    names = z.namelist()

    # Parse shared strings
    ss = []
    if 'xl/sharedStrings.xml' in names:
        s = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in s.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            texts = []
            for t in si.iter():
                if t.tag.endswith('}t') or t.tag == 't':
                    texts.append(t.text or '')
            ss.append(''.join(texts))

    # Find first worksheet
    sheet_name = None
    for name in names:
        if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
            sheet_name = name
            break

    if not sheet_name:
        print('NO_SHEET_FOUND')
        sys.exit(1)

    sheet = ET.fromstring(z.read(sheet_name))
    ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

    rows = []
    for row in sheet.findall(ns + 'row'):
        row_vals = []
        for c in row.findall(ns + 'c'):
            t = c.get('t')
            v = c.find(ns + 'v')
            if v is None:
                row_vals.append('')
            else:
                val = v.text
                if t == 's':
                    idx = int(val)
                    row_vals.append(ss[idx] if idx < len(ss) else '')
                else:
                    row_vals.append(val)
        rows.append(row_vals)

    if not rows:
        print('NO_ROWS')
        sys.exit(0)

    maxcols = max(len(r) for r in rows)
    for r in rows:
        while len(r) < maxcols:
            r.append('')

    writer = csv.writer(sys.stdout)
    for i, r in enumerate(rows[:11]):
        writer.writerow(r)
