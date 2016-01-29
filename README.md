# flist-api
Simple wrapper for the [F-List API v1](https://wiki.f-list.net/Json_endpoints#API_Version_1).

For simple example usage, please see the test folder and the source, it's fully documented :).

## constructor(username: string, password: string)

##Promise.&lt;Object&gt; FListAPI.request(endpoint: string, options: Object)
Does whatever the endpoint does.

##boolean FListAPI.isAuthenticated()
Returns whether the client is authed.

##Promise.&lt;Object&gt; FListAPI.authenticate()
Authenticates the client, calling this is not needed unless you need the data from this endpoint.
the request call automatically authenticates.
