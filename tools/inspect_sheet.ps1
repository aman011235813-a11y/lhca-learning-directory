param([string]$Path = 'LHCA_Cleaned_Data.xlsx')
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
if (-not $entry) { Write-Error "Missing sheet1.xml"; exit 1 }
$reader = [System.IO.StreamReader]::new($entry.Open())
for ($i = 0; $i -lt 80 -and -not $reader.EndOfStream; $i++) {
    Write-Output $reader.ReadLine()
}
