Q: why we make new auth guard , can't we use already built one
=>
That is a great question. You can absolutely use the existing one, but it requires a clever modification!

Why we usually create a new one: The existing jwtAuthGuard extends @nestjs/passport. By default, Passport is fundamentally designed for HTTP requests. When you use it, the JWT Strategy looks for a parsed cookie object (req.signedCookies.jwt) provided by the Express cookie-parser middleware.

However, in a WebSocket environment, you don't receive an Express HTTP request; you receive a raw Socket connection where cookies are simply provided as a raw string in client.handshake.headers.cookie. Therefore, out of the box, jwtAuthGuard fails because it doesn't know how to extract tokens from a WebSocket context.

How we fix it to reuse your existing Guard: We can "trick" Passport into supporting WebSockets by overriding the getRequest() method inside your jwtAuthGuard.
