$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
function Dump { & $adb shell uiautomator dump /sdcard/ui.xml | Out-Null; (& $adb exec-out cat /sdcard/ui.xml) -join "`n" }
function Bounds($xml, $text) {
  $m = [regex]::Match($xml, 'text="' + [regex]::Escape($text) + '"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
  if ($m.Success) { @([int](([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2), [int](([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)) }
}
foreach ($f in 'bill1.jpeg', 'bill2.jpeg', 'bill3.jpeg', 'bill4.jpeg', 'bill5.jpeg', 'bill6.jpeg', 'mungi.pdf') {
  & $adb shell am force-stop in.gov.telangana.billudu
  & $adb shell am start -n in.gov.telangana.billudu/.MainActivity | Out-Null
  Start-Sleep 6
  & $adb shell input tap 540 523
  Start-Sleep 4
  $x = Dump
  $p = Bounds $x $f
  if (-not $p) { $d = Bounds $x 'Downloads'; if ($d) { & $adb shell input tap $d[0] $d[1]; Start-Sleep 2; $x = Dump; $p = Bounds $x $f } }
  for ($i = 0; $i -lt 4 -and -not $p; $i++) { & $adb shell input swipe 540 1900 540 900 300; Start-Sleep 1; $x = Dump; $p = Bounds $x $f }
  if (-not $p) { Write-Output "$f : file not found in picker"; & $adb shell input keyevent 4; continue }
  & $adb shell input tap $p[0] $p[1]
  Start-Sleep 14
  $x = Dump
  $status = [regex]::Match($x, 'text="((Bill read|Some numbers|Could not)[^"]*)"').Groups[1].Value
  $nums = [regex]::Matches($x, 'class="android.widget.EditText"[^>]*text="([^"]*)"') | ForEach-Object { $_.Groups[1].Value }
  Write-Output "$f : $status | fields: $($nums -join ',')"
}
