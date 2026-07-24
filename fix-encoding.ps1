$repair = {
  param([string]$Path)
  $full = (Resolve-Path -LiteralPath $Path).Path
  $b    = [System.IO.File]::ReadAllBytes($full)
  $cp   = [System.Text.Encoding]::GetEncoding(1252)
  $sb   = New-Object System.Text.StringBuilder
  $i = 0; $fixed = 0
  while ($i -lt $b.Length) {
    $c = $b[$i]
    if     ($c -lt 0x80)                  { $len = 1 }
    elseif ($c -ge 0xC2 -and $c -le 0xDF) { $len = 2 }
    elseif ($c -ge 0xE0 -and $c -le 0xEF) { $len = 3 }
    elseif ($c -ge 0xF0 -and $c -le 0xF4) { $len = 4 }
    else                                  { $len = 0 }
    $ok = ($len -gt 0) -and (($i + $len) -le $b.Length)
    if ($ok) { for ($k=1; $k -lt $len; $k++) { if (($b[$i+$k] -band 0xC0) -ne 0x80) { $ok=$false; break } } }
    if ($ok) { [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($b,$i,$len)); $i += $len }
    else     { [void]$sb.Append($cp.GetString($b,$i,1)); $i++; $fixed++ }
  }
  if ($fixed -gt 0) {
    [System.IO.File]::WriteAllText($full, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
    "FIXED $fixed byte(s): $Path"
  }
}

try { [System.Text.Encoding]::GetEncoding(1252) | Out-Null }
catch { [System.Text.Encoding]::RegisterProvider([System.Text.CodePagesEncodingProvider]::Instance) }

$files = git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.css' '*.md'
foreach ($f in $files) {
  if (Test-Path -LiteralPath $f) { & $repair $f }
}
"DONE"
