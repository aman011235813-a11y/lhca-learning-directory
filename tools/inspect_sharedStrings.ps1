param([string]$Path = 'LHCA_Cleaned_Data.xlsx')
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
if (-not $entry) { Write-Error "Missing sharedStrings.xml"; exit 1 }
$reader = [System.IO.StreamReader]::new($entry.Open())
for ($i = 0; $i -lt 120 -and -not $reader.EndOfStream; $i++) {
    Write-Output $reader.ReadLine()
}
