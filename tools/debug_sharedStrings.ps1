param([string]$Path = 'LHCA_Cleaned_Data.xlsx')
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$ss = [xml]([System.IO.StreamReader]::new($entry.Open()).ReadToEnd())
$shared = @()
foreach ($si in $ss.sst.si) {
    $text = ($si.t | ForEach-Object { $_.InnerText }) -join ''
    if (-not $text) { $text = ($si.r.t | ForEach-Object { $_.InnerText }) -join '' }
    $shared += $text
}
Write-Output "shared count: $($shared.Count)"
for ($i = 0; $i -lt 15; $i++) { Write-Output "$i => '$($shared[$i])'" }
