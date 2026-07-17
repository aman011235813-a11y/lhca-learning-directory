param([string]$Path = 'LHCA_Cleaned_Data.xlsx')
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
if (-not $ssEntry -or -not $sheetEntry) { Write-Error 'Missing workbook files'; exit 1 }
$ssXml = [xml]([System.IO.StreamReader]::new($ssEntry.Open()).ReadToEnd())
$sheetXml = [xml]([System.IO.StreamReader]::new($sheetEntry.Open()).ReadToEnd())
$ns = New-Object System.Xml.XmlNamespaceManager($ssXml.NameTable)
$ns.AddNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
$shared = @()
foreach ($si in $ssXml.SelectNodes('//s:si', $ns)) {
    $t = $si.SelectSingleNode('.//s:t', $ns)
    if ($t) { $shared += $t.InnerText; continue }
    $parts = $si.SelectNodes('.//s:t', $ns) | ForEach-Object { $_.InnerText }
    $shared += ($parts -join '')
}
$rows = $sheetXml.SelectNodes('//s:sheetData/s:row', $ns)
$count = 0
foreach ($row in $rows) {
    $cells = @()
    foreach ($c in $row.SelectNodes('s:c', $ns)) {
        $value = ''
        $type = $c.GetAttribute('t')
        if ($type -eq 's') {
            $index = [int]($c.SelectSingleNode('s:v', $ns).InnerText)
            $value = $shared[$index]
        } elseif ($type -eq 'inlineStr') {
            $value = ($c.SelectNodes('s:is/s:t', $ns) | ForEach-Object { $_.InnerText }) -join ''
        } else {
            $v = $c.SelectSingleNode('s:v', $ns)
            if ($v) { $value = $v.InnerText }
        }
        $cells += $value
    }
    Write-Output ($cells -join '|')
    $count++
    if ($count -ge 12) { break }
}
