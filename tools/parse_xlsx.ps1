param([string]$Path = "LHCA_Cleaned_Data.xlsx")
if (-not (Test-Path $Path)) { Write-Error "FILE_NOT_FOUND: $Path"; exit 1 }
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$sheets = $zip.Entries | Where-Object { $_.FullName -like 'xl/worksheets/sheet*.xml' }
if (-not $ssEntry) { Write-Error 'NO_SHARED_STRINGS'; exit 1 }
$ss = [xml]([System.IO.StreamReader]::new($ssEntry.Open()).ReadToEnd())
$shared = @()
foreach ($si in $ss.sst.si) {
    $text = ($si.t | ForEach-Object { $_.'#text' }) -join ''
    if (-not $text) { $text = ($si.r.t | ForEach-Object { $_.'#text' }) -join '' }
    $shared += $text
}
$sheetEntry = $sheets | Select-Object -First 1
$sheet = [xml]([System.IO.StreamReader]::new($sheetEntry.Open()).ReadToEnd())
$rows = $sheet.worksheet.sheetData.row
$count = 0
foreach ($row in $rows) {
    $vals = @()
    foreach ($c in $row.c) {
        $text = ''
        $type = $c.t
        if ($type -eq 's') {
            $index = [int]$c.v.InnerText
            $text = $shared[$index]
        } elseif ($type -eq 'inlineStr' -or $c.is) {
            $text = ($c.is.t | ForEach-Object { $_.InnerText }) -join ''
        } elseif ($c.v) {
            $text = $c.v.InnerText
        }
        $text = $text -replace '\r|\n', ' '
        $vals += $text
    }
    Write-Output ($vals -join '|')
    $count++
    if ($count -ge 12) { break }
}
