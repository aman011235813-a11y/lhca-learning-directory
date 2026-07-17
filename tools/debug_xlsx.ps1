param([string]$Path = 'LHCA_Cleaned_Data.xlsx')
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
$sheet = [xml]([System.IO.StreamReader]::new($entry.Open()).ReadToEnd())
$row = $sheet.worksheet.sheetData.row[0]
Write-Output "rownode: $($row.Name)"
Write-Output "cell count: $($row.c.Count)"
for ($i = 0; $i -lt [math]::Min(5, $row.c.Count); $i++) {
    $c = $row.c[$i]
    Write-Output "cell $i ref=$($c.r) type=$($c.t) innerxml=$($c.InnerXml) innertext='$($c.InnerText)'"
}
