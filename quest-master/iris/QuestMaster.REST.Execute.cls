/// QuestMaster REST execution endpoint
Class QuestMaster.REST.Execute Extends %CSP.REST
{

Parameter CONTENTTYPE = "application/json";

Parameter HandleCorsRequest = 1;

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/health" Method="GET" Call="Health"/>
  <Route Url="/execute" Method="POST" Call="Execute"/>
  <Route Url="/compile" Method="POST" Call="Compile"/>
  <Route Url="/globals" Method="GET" Call="Globals"/>
</Routes>
}

/// Simple health check using modern JSON syntax.
ClassMethod Health() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Write {"status":"ok","namespace":($Namespace)}.%ToJSON()
  Quit $$$OK
}

/// Execute arbitrary ObjectScript code submitted as JSON {"code": "..."}.
ClassMethod Execute() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Set (tClassName, tFile) = "", tOldIO = $IO
  Try {
    Set tBody = {}.%FromJSON(%request.Content)
    Set tCode = tBody.code

    // 1. Build a unique temp class wrapping the user code
    Set tClassName = "QMTmp" _ $Job
    Set tSource = "Class " _ tClassName _ " {" _ $C(10) _
                  "ClassMethod Run() [ ProcedureBlock = 1 ] {" _ $C(10)
    
    Set tCode = $Translate(tCode, $C(13), "") // Normalize CRLF
    For i = 1:1:$Length(tCode, $C(10)) {
      Set tLine = $Piece(tCode, $C(10), i)
      Set tSource = tSource _ $Select(tLine'="":$C(9)_tLine, 1:"") _ $C(10)
    }
    Set tSource = tSource _ "}" _ $C(10) _ "}" _ $C(10)

    // 2. Compile class, capturing output
    Set tFile = ##class(%File).TempFilename("txt")
    Open tFile:"WNS":2
    Else  Do ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$FileCanNotOpen, tFile)).Throw()
    Use tFile
    
    Set tStream = ##class(%Stream.TmpCharacter).%New()
    Do tStream.Write(tSource)
    Set tSC = ##class(%SYSTEM.OBJ).LoadStream(tStream, tClassName _ ".cls", "ck-d")
    
    Close tFile
    Use tOldIO
    
    If $$$ISERR(tSC) {
      Set tErrResp = {"success": 0, "error": ($System.Status.GetErrorText(tSC))}
      Write tErrResp.%ToJSON()
      Do ..Cleanup(tClassName, tFile)
      Quit
    }

    // 3. Execute method with a 5-second timeout
    Open tFile:"WNS":2
    Else  Do ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$FileCanNotOpen, tFile)).Throw()
    Use tFile
    Try {
      Do $SYSTEM.Alarm.Set(5)
      Do $ClassMethod(tClassName, "Run")
      Do $SYSTEM.Alarm.Set(0)
    } Catch tInner {
      Do $SYSTEM.Alarm.Set(0)
      Write !,"RUNTIME ERROR: " _ tInner.DisplayString(), !
    }
    Close tFile
    Use tOldIO

    // 4. Read captured output
    Set tOutput = ""
    If ##class(%File).Exists(tFile) {
      Set tResStream = ##class(%Stream.FileCharacter).%New()
      Do tResStream.LinkToFile(tFile)
      Set tOutput = tResStream.Read()
    }
    
    Set tResp = {"success": 1, "output": (tOutput)}
    Write tResp.%ToJSON()
    Do ..Cleanup(tClassName, tFile)
  } Catch tEx {
    Try { Use tOldIO } Catch {}
    Do ..Cleanup($Get(tClassName), $Get(tFile))
    Set %response.Status = "500 Internal Server Error"
    Set tExResp = {"success": 0, "error": (tEx.DisplayString())}
    Write tExResp.%ToJSON()
  }
  Quit $$$OK
}

/// Compile a class submitted as JSON {"source": "..."}.
ClassMethod Compile() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Set (tSrcFile, tDiagFile) = "", tOldIO = $IO
  Try {
    Set tBody = {}.%FromJSON(%request.Content), tSource = tBody.source

    // 1. Strip leading comments/whitespace for UDL detection
    Set tStripped = "", tFoundClass = 0, tInBlockComment = 0, tCode = $Translate(tSource, $C(13), "")
    For i = 1:1:$Length(tCode, $C(10)) {
      Set tLine = $Piece(tCode, $C(10), i)
      If 'tFoundClass {
        Set tTrim = $ZStrip(tLine, "<W")
        If tInBlockComment {
          If tTrim [ "*/" { 
            Set tInBlockComment = 0 
            Set tAfter = $Piece(tTrim, "*/", 2)
            If $ZStrip(tAfter, "<W") = "" { Continue }
            // If there is code after */ on the same line, fall through to check it
            Set tTrim = $ZStrip(tAfter, "<W")
          } Else { Continue }
        }
        If tTrim = "" { Continue }
        If $Extract(tTrim, 1, 2) = "//" { Continue }
        If $Extract(tTrim, 1, 2) = "/*" {
          Set tInBlockComment = 1
          If tTrim [ "*/" { 
            Set tInBlockComment = 0 
            Set tAfter = $Piece(tTrim, "*/", 2, *)
            If $ZStrip(tAfter, "<W") = "" { Continue }
            Set tTrim = $ZStrip(tAfter, "<W")
          } Else { Continue }
        }
        // Double check after possibly ending a block comment on this line
        If (tTrim = "") || ($Extract(tTrim, 1, 2) = "//") || ($Extract(tTrim, 1, 2) = "/*") { 
          // Re-evaluate if we started a new comment on the same line (unlikely but possible)
          If $Extract(tTrim, 1, 2) = "/*" { Set tInBlockComment = 1 }
          Continue 
        }
        Set tFoundClass = 1
      }
      Set tStripped = tStripped _ tLine _ $C(10)
    }

    // 2. Write to temp .cls file
    Set tSrcFile = ##class(%File).TempFilename("cls")
    Set tFileStream = ##class(%Stream.FileCharacter).%New()
    Set tFileStream.Filename = tSrcFile
    Do tFileStream.Write(tStripped)
    Set sc = tFileStream.%Save()
    If $$$ISERR(sc) { Throw ##class(%Exception.StatusException).CreateFromStatus(sc) }

    // 3. Compile
    Set tDiagFile = ##class(%File).TempFilename("txt")
    Open tDiagFile:"WNS":2
    Else  Do ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$FileCanNotOpen, tDiagFile)).Throw()
    Use tDiagFile
    Set sc = ##class(%SYSTEM.OBJ).Load(tSrcFile, "ck-d")
    Close tDiagFile
    Use tOldIO

    Set tResp = {"success": ($$$ISOK(sc))}
    If $$$ISERR(sc) { Set tResp.error = $System.Status.GetErrorText(sc) }
    Write tResp.%ToJSON()
  } Catch tEx {
    Try { Use tOldIO } Catch {}
    Set tExResp = {"success": 0, "error": (tEx.DisplayString())}
    Write tExResp.%ToJSON()
  }
  Do:($Get(tSrcFile)'="") ##class(%File).Delete(tSrcFile)
  Do:($Get(tDiagFile)'="") ##class(%File).Delete(tDiagFile)
  Quit $$$OK
}

/// Return a depth-limited (max 3 levels) JSON tree of user globals in the USER namespace.
/// Includes only globals whose names match [A-Za-z][A-Za-z0-9]* (excludes ^%, ^IRIS*, etc.).
/// Node cap: max 50 children per level (3 levels); no total-node cap (frontend filter handles visual complexity).
ClassMethod Globals() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Set tResult = {"globals": []}

  // ^$GLOBAL returns names WITH the leading ^ (e.g. "^Test", "^%cspSession")
  // Match only plain user globals: ^[UpperOrLower][AlphaNum.]* (dots allowed for package globals like ^Learning.AdventurerD)
  Set tGName = $Order(^$GLOBAL(""))
  While tGName '= "" {
    If $Match(tGName, "^\^[A-Za-z][A-Za-z0-9.]*$") {
      Set tGRef = tGName
      Set tGNode = {"name": (tGRef), "children": []}
      Set tD0 = $Data(@tGRef)
      If (tD0 = 1) || (tD0 = 11) { Set tGNode.value = $Get(@tGRef) }

      // Level 1
      Set tL1Count = 0, tL1Trunc = 0
      Set tSub1 = $Order(@tGRef@(""))
      While tSub1 '= "" {
        If tL1Count >= 50 { Set tL1Trunc = 1  Quit }
        Set tL1Count = tL1Count + 1
        Set tNode1 = {"key": (tSub1), "children": []}
        Set tD1 = $Data(@tGRef@(tSub1))
        If (tD1 = 1) || (tD1 = 11) { Set tNode1.value = $Get(@tGRef@(tSub1)) }

        // Level 2
        Set tL2Count = 0, tL2Trunc = 0
        Set tSub2 = $Order(@tGRef@(tSub1, ""))
        While tSub2 '= "" {
          If tL2Count >= 50 { Set tL2Trunc = 1  Quit }
          Set tL2Count = tL2Count + 1
          Set tNode2 = {"key": (tSub2), "children": []}
          Set tD2 = $Data(@tGRef@(tSub1, tSub2))
          If (tD2 = 1) || (tD2 = 11) { Set tNode2.value = $Get(@tGRef@(tSub1, tSub2)) }

          // Level 3
          Set tL3Count = 0, tL3Trunc = 0
          Set tSub3 = $Order(@tGRef@(tSub1, tSub2, ""))
          While tSub3 '= "" {
            If tL3Count >= 50 { Set tL3Trunc = 1  Quit }
            Set tL3Count = tL3Count + 1
            Set tNode3 = {"key": (tSub3), "children": []}
            Set tD3 = $Data(@tGRef@(tSub1, tSub2, tSub3))
            If (tD3 = 1) || (tD3 = 11) { Set tNode3.value = $Get(@tGRef@(tSub1, tSub2, tSub3)) }
            Do tNode2.children.%Push(tNode3)
            Set tSub3 = $Order(@tGRef@(tSub1, tSub2, tSub3))
          }
          If tL3Trunc { Do tNode2.children.%Push({"key": "…", "truncated": (1), "children": []}) }

          Do tNode1.children.%Push(tNode2)
          Set tSub2 = $Order(@tGRef@(tSub1, tSub2))
        }
        If tL2Trunc { Do tNode1.children.%Push({"key": "…", "truncated": (1), "children": []}) }

        Do tGNode.children.%Push(tNode1)
        Set tSub1 = $Order(@tGRef@(tSub1))
      }
      If tL1Trunc { Do tGNode.children.%Push({"key": "…", "truncated": (1), "children": []}) }

      Do tResult.globals.%Push(tGNode)
    }
    Set tGName = $Order(^$GLOBAL(tGName))
  }

  Set tStream = ##class(%Stream.TmpCharacter).%New()
  Do tResult.%ToJSON(tStream)
  Do tStream.Rewind()
  While 'tStream.AtEnd { Write tStream.Read(32000) }
  Quit $$$OK
}

ClassMethod Cleanup(pClassName As %String = "", pFile As %String = "") [ Private ]
{
  If pClassName '= "" { Do ##class(%SYSTEM.OBJ).Delete(pClassName, "-d") }
  If pFile '= "" { Try { Close pFile } Catch {} Do ##class(%File).Delete(pFile) }
}

}
