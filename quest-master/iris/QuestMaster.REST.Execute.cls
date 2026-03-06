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

ClassMethod Execute() As %Status
{
  Do %response.SetHeader("Content-Type","application/json")
  Try {
    Set tBody = ##class(%DynamicObject).%FromJSON(%request.Content)
    Set tCode = tBody.code
    Set tOldIO = $IO
    Set tFile = ##class(%File).TempFilename("txt")
    Set tOutput = ""
    Open tFile:"WNS":5
    If '$Test {
      Set tErr = ##class(%DynamicObject).%New()
      Do tErr.%Set("success", 0)
      Do tErr.%Set("error", "Could not open temp file")
      Do tErr.%ToJSON()
      Quit
    }
    Set tLines = $Length(tCode, $C(10))
    For i = 1:1:tLines {
      Set tLine = $Translate($Piece(tCode, $C(10), i), $C(13), "")
      Continue:(tLine = "")
      Use tFile
      Try {
        XECUTE tLine
      } Catch tInner {
        Write "ERROR (line " _ i _ "): " _ tInner.DisplayString(), !
      }
    }
    Close tFile
    Use tOldIO
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
    Set tResp = ##class(%DynamicObject).%New()
    Do tResp.%Set("success", 1)
    Do tResp.%Set("output", tOutput)
    Do tResp.%ToJSON()
  } Catch tEx {
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
  Try {
    Set tBody = ##class(%DynamicObject).%FromJSON(%request.Content)
    Set tClass = tBody.className
    Set tSource = tBody.source
    Set tStream = ##class(%Stream.TmpCharacter).%New()
    Do tStream.Write(tSource)
    Set sc = ##class(%SYSTEM.OBJ).LoadStream(tStream, tClass_".cls", "ck-d")
    Set tResp = ##class(%DynamicObject).%New()
    If $$$ISOK(sc) {
      Do tResp.%Set("success", 1)
    } Else {
      Do tResp.%Set("success", 0)
      Do tResp.%Set("error", $System.Status.GetErrorText(sc))
    }
    Do tResp.%ToJSON()
  } Catch tEx {
    Set tErr = ##class(%DynamicObject).%New()
    Do tErr.%Set("success", 0)
    Do tErr.%Set("error", tEx.DisplayString())
    Do tErr.%ToJSON()
  }
  Quit $$$OK
}

}
