param(
    [string]$Path = 'LHCA_Cleaned_Data.xlsx',
    [string]$Output = 'LHCA_Cleaned_Data_clean.csv'
)
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
if (-not $ssEntry -or -not $sheetEntry) { Write-Error 'Missing workbook files'; exit 1 }
$ssXml = [xml]([System.IO.StreamReader]::new($ssEntry.Open()).ReadToEnd())
$sheetXml = [xml]([System.IO.StreamReader]::new($sheetEntry.Open()).ReadToEnd())
$ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
$ns.AddNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

function Get-Shared-Strings {
    param($xml, $ns)
    $list = @()
    foreach ($si in $xml.SelectNodes('//s:si', $ns)) {
        $tNode = $si.SelectSingleNode('.//s:t', $ns)
        if ($tNode) {
            $list += $tNode.InnerText
        } else {
            $parts = $si.SelectNodes('.//s:t', $ns) | ForEach-Object { $_.InnerText }
            $list += ($parts -join '')
        }
    }
    return $list
}

function Clean-Value {
    param([string]$value)
    if ($null -eq $value) { return '' }
    $text = $value.Trim()
    if ($text -match '^(?i:NA|N/A)$') { return '' }
    return $text
}

function Fix-Category {
    param([string]$text)
    $map = @{
        'Adult  obesety' = 'Adult obesity'
        'Adverse chlidhood experience' = 'Adverse childhood experience'
        'childhood obesety' = 'childhood obesity'
        'Antimicrobial resistance' = 'Antimicrobial resistance'
    }
    if ($map.ContainsKey($text)) { return $map[$text] }
    return $text
}

function Clean-List {
    param([string]$value)
    if (-not $value) { return '' }
    $parts = $value -split '[,;/\\|]+'
    $cleaned = @()
    foreach ($part in $parts) {
        $item = $part.Trim()
        if ($item) {
            $item = Fix-Category -text $item
            $cleaned += $item
        }
    }
    return ($cleaned -join ', ')
}

function Get-CellValue {
    param($cell, $shared)
    if (-not $cell) { return '' }
    $t = $cell.GetAttribute('t')
    if ($t -eq 's') {
        $idx = [int]($cell.SelectSingleNode('s:v', $ns).InnerText)
        return $shared[$idx]
    }
    if ($t -eq 'inlineStr') {
        $parts = $cell.SelectNodes('s:is/s:t', $ns) | ForEach-Object { $_.InnerText }
        return ($parts -join '')
    }
    $vNode = $cell.SelectSingleNode('s:v', $ns)
    if ($vNode) { return $vNode.InnerText }
    return ''
}

$sharedStrings = Get-Shared-Strings -xml $ssXml -ns $ns
$rows = $sheetXml.SelectNodes('//s:sheetData/s:row', $ns)
if ($rows.Count -eq 0) { Write-Error 'No rows found'; exit 1 }

$headerRow = $rows[0]
$headers = @()
foreach ($c in $headerRow.SelectNodes('s:c', $ns)) {
    $value = Get-CellValue -cell $c -shared $sharedStrings
    $value = Clean-Value -value $value
    if ($value -eq 'education_level') { $value = 'education_outcome' }
    $headers += $value
}

$required = @('id','title','description','provider','delivery_mode','cost_gbp','cost_details','duration','access','education_outcome','target_audience','category','sub_theme','url')
if ($headers.Count -ne $required.Count) {
    Write-Output "Detected header count $($headers.Count), expected $($required.Count)."
}

$outr = New-Object System.IO.StreamWriter($Output, $false, [System.Text.Encoding]::UTF8)
function Quote-CSV {
    param([string]$text)
    if ($null -eq $text) { $text = '' }
    $escaped = $text.Replace('"', '""')
    return '"' + $escaped + '"'
}
$outr.WriteLine(($required | ForEach-Object { Quote-CSV $_ }) -join ',')

for ($i = 1; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $values = @()
    $cells = $row.SelectNodes('s:c', $ns)
    $cellMap = @{}
    foreach ($cell in $cells) {
        $ref = $cell.GetAttribute('r')
        $cellMap[$ref] = $cell
    }
    for ($col = 0; $col -lt $required.Count; $col++) {
        $columnLetter = [char](65 + $col)
        $ref = "${columnLetter}$($row.GetAttribute('r'))"
        if (-not $cellMap.ContainsKey($ref)) {
            $values += ''
            continue
        }
        $raw = Get-CellValue -cell $cellMap[$ref] -shared $sharedStrings
        $clean = Clean-Value -value $raw
        switch ($required[$col]) {
            'cost_gbp' {
                if ($clean -eq '' -or $clean -match '^(?i:NA|N/A)$') { $clean = '' }
                else { $clean = $clean.Replace('£', '').Trim() }
            }
            'category' { $clean = Clean-List -value $clean }
            'sub_theme' { $clean = Clean-List -value $clean }
            default {
                if ($clean -match '^(?i:NA|N/A)$') { $clean = '' }
            }
        }
        $values += $clean
    }
    $outr.WriteLine(($values | ForEach-Object { Quote-CSV $_ }) -join ',')
}
$outr.Close()
Write-Output "Created cleaned CSV: $Output"
