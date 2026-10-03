!macro customInstall
  IfFileExists "$INSTDIR\WindowsHello.exe" 0 +2
    nsExec::ExecToLog '"$INSTDIR\WindowsHello.exe" --migrate'
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "windowshello"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WindowsHello"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.WindowsHello"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.Nikhil.windowshello"
  
  IfFileExists "$INSTDIR\WindowsHello.exe" 0 +2
    nsExec::ExecToLog '"$INSTDIR\WindowsHello.exe" --migrate'
!macroend
