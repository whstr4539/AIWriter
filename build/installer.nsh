; NSIS Installer Script for AI Writer
; Custom installation logic

!macro customInit
  ; Check if application is already running
  ; Note: nsProcess plugin is not available, skipping process check
!macroend

!macro customInstall
  ; Create file associations (optional)
  ; WriteRegStr HKCR ".aiwriter" "" "AIWriter.Document"
  ; WriteRegStr HKCR "AIWriter.Document" "" "AI Writer Document"
  ; WriteRegStr HKCR "AIWriter.Document\shell\open\command" "" '"$INSTDIR\AI Writer.exe" "%1"'
!macroend

!macro customUnInstall
  ; Remove file associations
  ; DeleteRegKey HKCR ".aiwriter"
  ; DeleteRegKey HKCR "AIWriter.Document"
  
  ; Clean up user data (optional - ask user)
  MessageBox MB_YESNO "Do you want to remove all user data and settings?" IDNO SkipDataRemoval
    RMDir /r "$APPDATA\AI Writer"
  SkipDataRemoval:
!macroend
