Class User.HelloWorld Extends %RegisteredObject
{

ClassMethod Greet(name As %String) As %String
{
    Return "Hello, " _ name _ "!"
}

Method MoreGreet(name As %String) As %String
{
    Return "Hi, " _ name _ "!"
}

ClassMethod MyMain()
{
    // Setting variables
    Set name = "Stefan"
    Set age = 30
    Set pi = 3.14159
    Set isActive = 1  // no native boolean, use 1/0

    // String concatenation uses _
    Write "Name: " _ name _ ", Age: " _ age, !

    // The ! after Write is a newline
}

}
