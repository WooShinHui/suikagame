@echo off
echo Running remove unnecessary files.
START /wait /b cmd /c remove_fla.bat
START /wait /b cmd /c remove_html.bat
START /wait /b cmd /c remove_slash.bat
DEL /S /Q *.map
ECHO Deleted all .map files.