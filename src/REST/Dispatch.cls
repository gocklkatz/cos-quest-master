/// REST endpoint that executes arbitrary ObjectScript code and returns output.
/// 
/// Setup: In Management Portal, create a Web Application:
///   Path:       /api/execute
///   Namespace:  USER
///   DispatchClass: REST.Dispatch
Class REST.Dispatch Extends %CSP.REST
{

Parameter CONTENTTYPE = "application/json";

/// Allow CORS so tools like Postman and browsers can call freely
Parameter HandleCorsRequest = 1;

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/execute" Method="POST" Call="Execute"/>
  <Route Url="/ping"    Method="GET"  Call="Ping"/>
</Routes>
}

/// GET /ping  — smoke test
ClassMethod Ping() As %Status
{
    Do %response.SetHeader("Content-Type","application/json")
    Write "{""status"":""ok""}"
    Quit $$$OK
}

/// POST /execute
/// Body: { "code": "<ObjectScript statements>" }
/// Response: { "output": "<captured WRITE output>", "error": "<if any>" }
ClassMethod Execute() As %Status
{
    Set tSC = $$$OK
    Do %response.SetHeader("Content-Type","application/json")

    Try {
        // --- parse request body ---
        Set tBody = ##class(%DynamicObject).%FromJSON(%request.Content)
        Set tCode = tBody.code

        If (tCode = "") {
            Set tErr = ##class(%DynamicObject).%New()
            Do tErr.%Set("error","No code provided")
            Do tErr.%ToJSON()
            Quit
        }

        // --- capture WRITE output via temp file ---
        Set tOldIO   = $IO
        Set tTmpFile = ##class(%File).TempFilename("txt")
        Set tOutput  = ""

        Open tTmpFile:"WNS":5
        If '$Test {
            Set tErr = ##class(%DynamicObject).%New()
            Do tErr.%Set("error","Could not open temp file: " _ tTmpFile)
            Do tErr.%ToJSON()
            Quit
        }

        // XECUTE only accepts single-line strings; split on newlines and execute
        // each line separately. Variables persist across calls in the same process.
        Set tNumLines = $Length(tCode, $C(10))
        For i = 1:1:tNumLines {
            Set tLine = $Translate($Piece(tCode, $C(10), i), $C(13), "")
            Continue:(tLine = "")
            Use tTmpFile
            Try {
                XECUTE tLine
            } Catch tInner {
                Write "ERROR (line " _ i _ "): " _ tInner.DisplayString(), !
            }
        }

        Close tTmpFile
        Use tOldIO

        // --- read output back (catch <ENDOFFILE> = normal EOF for file devices) ---
        Open tTmpFile:"RS":5
        If $Test {
            Use tTmpFile
            Try {
                For { Read tLine  Set tOutput = tOutput _ tLine _ $C(10) }
            } Catch eofErr {}
            Close tTmpFile
            Use tOldIO
        }
        Do ##class(%File).Delete(tTmpFile)

        // --- build JSON response ---
        Set tResp = ##class(%DynamicObject).%New()
        Do tResp.%Set("output", tOutput)
        Do tResp.%ToJSON()

    } Catch tEx {
        Set %response.Status = "500 Internal Server Error"
        Set tResp = ##class(%DynamicObject).%New()
        Do tResp.%Set("error", tEx.DisplayString())
        Do tResp.%ToJSON()
    }

    Quit tSC
}

}
