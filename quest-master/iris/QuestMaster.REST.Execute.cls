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
</Routes>
}

ClassMethod Health() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Write "{""status"":""ok"",""namespace"":""" _ $Namespace _ """}"
  Quit $$$OK
}

/// Execute arbitrary ObjectScript code submitted as JSON {"code": "..."}.
/// 
/// The code is wrapped in a temporary class method (ProcedureBlock = 1 by default),
/// compiled, and executed. This supports the full ObjectScript block syntax:
///   FOR { ... }  WHILE { ... }  IF { } ELSE { }  TRY { } CATCH { }
/// The temp class is deleted after execution regardless of outcome.
ClassMethod Execute() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Set tClassName = ""
  Try {
    Set tBody = ##class(%DynamicObject).%FromJSON(%request.Content)
    Set tCode = tBody.code

    // ── 1. Build a unique temp class wrapping the user code ───────────────
    //
    // Each job gets a unique class name so concurrent requests don't collide.
    Set tClassName = "QMTmp" _ $Job

    // Wrapping in a ClassMethod gives us ProcedureBlock = 1 automatically,
    // which enables FOR { }, WHILE { }, IF { } ELSE { }, TRY { } CATCH { }.
    //
    // Every non-empty user code line is prefixed with a tab.  In UDL (.cls)
    // format, column-0 lines are treated as labels — not statements — so
    // indentation is required to place code in the method body context.
    Set tSource = "Class " _ tClassName _ " {" _ $C(10)
    Set tSource = tSource _ "ClassMethod Run() {" _ $C(10)
    Set tLines = $Length(tCode, $C(10))
    For i = 1:1:tLines {
      Set tLine = $Translate($Piece(tCode, $C(10), i), $C(13), "")
      If tLine '= "" {
        Set tSource = tSource _ $C(9) _ tLine _ $C(10)
      } Else {
        Set tSource = tSource _ $C(10)
      }
    }
    Set tSource = tSource _ "}" _ $C(10)
    Set tSource = tSource _ "}" _ $C(10)

    // ── 2. Redirect IO, then compile ──────────────────────────────────────
    //
    // LoadStream emits "Load started …" diagnostics to the current device
    // even with the -d qualifier.  Redirect to a temp file first so those
    // messages never reach the HTTP response body.
    Set tOldIO = $IO
    Set tFile = ##class(%File).TempFilename("txt")
    Open tFile:"WNS":5
    If '$Test {
      Set tErr = ##class(%DynamicObject).%New()
      Do tErr.%Set("success", 0)
      Do tErr.%Set("error", "Could not open temp file for IO capture")
      Do tErr.%ToJSON()
      Quit
    }
    Use tFile

    Set tStream = ##class(%Stream.TmpCharacter).%New()
    Do tStream.Write(tSource)
    Set tSC = ##class(%SYSTEM.OBJ).LoadStream(tStream, tClassName _ ".cls", "ck-d")

    Close tFile
    Use tOldIO

    If $$$ISERR(tSC) {
      Do ##class(%File).Delete(tFile)
      Set tFile = ""
      Do ##class(%SYSTEM.OBJ).Delete(tClassName, "-d")
      Set tClassName = ""
      Set tErr = ##class(%DynamicObject).%New()
      Do tErr.%Set("success", 0)
      Do tErr.%Set("error", $System.Status.GetErrorText(tSC))
      Do tErr.%ToJSON()
      Quit
    }

    // ── 3. Reopen the file (truncate) and capture execution output ────────
    //
    // Reopening with "WNS" discards the compile diagnostics captured above,
    // so only the user code's WRITE output appears in the response.
    Open tFile:"WNS":5
    If '$Test {
      Do ##class(%File).Delete(tFile)
      Set tFile = ""
      Do ##class(%SYSTEM.OBJ).Delete(tClassName, "-d")
      Set tClassName = ""
      Set tErr = ##class(%DynamicObject).%New()
      Do tErr.%Set("success", 0)
      Do tErr.%Set("error", "Could not reopen temp file for execution output")
      Do tErr.%ToJSON()
      Quit
    }
    Use tFile

    Try {
      Do $ClassMethod(tClassName, "Run")
    } Catch tInner {
      Write "ERROR: " _ tInner.DisplayString(), !
    }

    Close tFile
    Use tOldIO

    // ── 4. Read captured output ───────────────────────────────────────────
    Set tOutput = ""
    Open tFile:"RS":5
    If $Test {
      Use tFile
      Try {
        For { Read tLine  Set tOutput = tOutput _ tLine _ $C(10) }
      } Catch {}
      Close tFile
      Use tOldIO
    }
    Do ##class(%File).Delete(tFile)

    // ── 5. Clean up temp class and respond ────────────────────────────────
    Do ##class(%SYSTEM.OBJ).Delete(tClassName, "-d")
    Set tClassName = ""

    Set tResp = ##class(%DynamicObject).%New()
    Do tResp.%Set("success", 1)
    Do tResp.%Set("output", tOutput)
    Do tResp.%ToJSON()

  } Catch tEx {
    If tClassName '= "" { Do ##class(%SYSTEM.OBJ).Delete(tClassName, "-d") }
    If $Get(tFile) '= "" { Do ##class(%File).Delete(tFile) }
    Try { Use tOldIO } Catch {}
    Set %response.Status = "500 Internal Server Error"
    Set tErr = ##class(%DynamicObject).%New()
    Do tErr.%Set("success", 0)
    Do tErr.%Set("error", tEx.DisplayString())
    Do tErr.%ToJSON()
  }
  Quit $$$OK
}

ClassMethod Compile() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Set tSrcFile = ""
  Set tDiagFile = ""
  Set tOldIO = $IO
  Try {
    Set tBody = ##class(%DynamicObject).%FromJSON(%request.Content)
    Set tClass = tBody.className
    Set tSource = tBody.source

    // ── 1. Strip leading // comment lines ─────────────────────────────────
    //
    // %SYSTEM.OBJ.Load() uses the first non-whitespace bytes to detect the
    // file format.  When the file starts with "//" it cannot detect UDL and
    // returns error #5840 "not a supported type".  Strip leading comment-only
    // lines so the file always starts with the "Class …" declaration.
    Set tStripped = ""
    Set tFoundClass = 0
    Set tLines = $Length(tSource, $C(10))
    For i = 1:1:tLines {
      Set tLine = $Translate($Piece(tSource, $C(10), i), $C(13), "")
      If 'tFoundClass {
        If $Extract($ZStrip(tLine, "<W"), 1, 2) = "//" { Continue }
        Set tFoundClass = 1
      }
      Set tStripped = tStripped _ tLine _ $C(10)
    }

    // ── 2. Write UDL source to a temp .cls file ───────────────────────────
    //
    // %SYSTEM.OBJ.Load() handles UDL .cls files correctly once the leading
    // comments are removed.  %Stream.FileCharacter writes the content verbatim.
    Set tSrcFile = ##class(%File).TempFilename("cls")
    Set tFileStream = ##class(%Stream.FileCharacter).%New()
    Set tFileStream.Filename = tSrcFile
    Do tFileStream.Write(tStripped)
    Set sc = tFileStream.%Save()
    If $$$ISERR(sc) {
      Set tResp = ##class(%DynamicObject).%New()
      Do tResp.%Set("success", 0)
      Do tResp.%Set("error", "Could not write source file: " _ $System.Status.GetErrorText(sc))
      Do tResp.%ToJSON()
      Quit
    }

    // ── 3. Load and compile, suppressing diagnostic output ─────────────────
    Set tDiagFile = ##class(%File).TempFilename("txt")
    Open tDiagFile:"WNS":5
    If '$Test {
      Do ##class(%File).Delete(tSrcFile)  Set tSrcFile = ""
      Set tResp = ##class(%DynamicObject).%New()
      Do tResp.%Set("success", 0)
      Do tResp.%Set("error", "Could not open temp file for IO capture")
      Do tResp.%ToJSON()
      Quit
    }
    Use tDiagFile
    Set sc = ##class(%SYSTEM.OBJ).Load(tSrcFile, "ck-d")
    Close tDiagFile
    Use tOldIO
    Do ##class(%File).Delete(tDiagFile)  Set tDiagFile = ""
    Do ##class(%File).Delete(tSrcFile)   Set tSrcFile = ""

    Set tResp = ##class(%DynamicObject).%New()
    If $$$ISOK(sc) {
      Do tResp.%Set("success", 1)
    } Else {
      Do tResp.%Set("success", 0)
      Do tResp.%Set("error", $System.Status.GetErrorText(sc))
    }
    Do tResp.%ToJSON()
  } Catch tEx {
    Try { Close tDiagFile } Catch {}
    Try { Use tOldIO } Catch {}
    If tSrcFile '= "" { Do ##class(%File).Delete(tSrcFile) }
    Set tErr = ##class(%DynamicObject).%New()
    Do tErr.%Set("success", 0)
    Do tErr.%Set("error", tEx.DisplayString())
    Do tErr.%ToJSON()
  }
  Quit $$$OK
}

}
