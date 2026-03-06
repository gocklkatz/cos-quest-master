/// Unit tests for REST.Dispatch
/// Run with: Do ##class(%UnitTest.Manager).RunTest("Test.RESTDispatch","/nodelete")
Class Test.RESTDispatch Extends %UnitTest.TestCase
{

/// Shared helper: POST /execute and return parsed response object
ClassMethod Post(pCode As %String) As %DynamicObject
{
    Set req = ##class(%Net.HttpRequest).%New()
    Set req.Server   = "localhost"
    Set req.Port     = 52773
    Set req.Username = "_SYSTEM"
    Set req.Password = "password"
    Set req.ContentType = "application/json"
    Set body = ##class(%DynamicObject).%New()
    Do body.%Set("code", pCode)
    Do req.EntityBody.Write(body.%ToJSON())
    Do req.Post("/api/execute/execute")
    Quit ##class(%DynamicObject).%FromJSON(req.HttpResponse.Data)
}

/// GET /ping should return {"status":"ok"}
Method TestPing()
{
    Set req = ##class(%Net.HttpRequest).%New()
    Set req.Server   = "localhost"
    Set req.Port     = 52773
    Set req.Username = "_SYSTEM"
    Set req.Password = "password"
    Do req.Get("/api/execute/ping")
    Set resp = ##class(%DynamicObject).%FromJSON(req.HttpResponse.Data)
    Do $$$AssertEquals(resp.status, "ok", "Ping returns ok")
}

/// Single-line Write
Method TestSingleLineWrite()
{
    Set resp = ..Post("Write ""hello""")
    Do $$$AssertEquals(resp.output, "hello", "Single Write without newline")
}

/// Write with ! newline
Method TestWriteWithNewline()
{
    Set resp = ..Post("Write ""hello"", !")
    Do $$$AssertEquals(resp.output, "hello" _ $C(10), "Write with ! captures newline")
}

/// Multi-line: variable set on line 1 visible on line 2
Method TestMultiLineVariableScope()
{
    Set code = "Set x = 6 * 7" _ $C(10) _ "Write x"
    Set resp = ..Post(code)
    Do $$$AssertEquals(resp.output, "42", "Variable set on line 1 is visible on line 2")
}

/// Multi-line: for loop
Method TestForLoop()
{
    Set code = "For i=1:1:3 { Write i, "" "" }"
    Set resp = ..Post(code)
    Do $$$AssertEquals(resp.output, "1 2 3 ", "For loop writes expected sequence")
}

/// Runtime error is caught and returned in output, not as HTTP 500
Method TestRuntimeError()
{
    Set resp = ..Post("Write 1/0")
    Do $$$AssertTrue($Find(resp.output, "ERROR") > 0, "Division by zero surfaces as ERROR in output")
}

/// Empty code returns error field
Method TestEmptyCode()
{
    Set resp = ..Post("")
    Do $$$AssertTrue(resp.error '= "", "Empty code returns error field")
}

}
