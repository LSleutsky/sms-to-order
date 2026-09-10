# Out of scope

What I left out on purpose, and how each one lands in production.

**Auth.** Nothing is behind a login. In production the review page sits behind the branch's existing identity provider, and the inbound endpoint verifies the SMS provider's signature so nobody else can post into it.

**Multi-tenant.** Every catalog row already carries `hajoca_profit_center`, and that is the tenant key. Production adds it to messages and orders, scopes every query by it, and routes each inbound number to its branch. The data model does not change.

**Real deployment.** The Docker image is packaging, not deployment. Production splits it: the built client on a CDN, the API behind a load balancer, and the database moved off SQLite to Postgres once there is more than one writer. Nothing in the code prevents that.

**Real SMS provider.** The inbound endpoint has the shape of a provider webhook and the send box in the UI stands in for the provider. Production points Twilio or the carrier at the endpoint, checks the signature, and rate-limits per sender, since every inbound message spends money on an extraction call.

**Async extraction.** Extraction is a synchronous network call inside the inbound request so the demo is readable. Production stores the message, acknowledges the provider immediately, runs extraction from a queue, and the reviewer sees the message as processing until it lands.

**Observability.** There is no logging beyond the boot line and no metrics. Production wants extraction latency and failure rate, the share of lines auto-matched, and how often a reviewer changes an auto-matched line, since that last number is what re-derives the cutoff.

**Scaling.** A hundred-row catalog is a scan. A real branch catalog is orders of magnitude larger, so the text search moves to a full-text index and the matcher's candidate set gets narrowed by the part-number index and a token index before scoring. The part-number extraction is a heuristic built from a hundred descriptions and gets replaced by a real product-number field from the ERP where one exists.

**Span highlighting.** The raw text does not highlight which span each line came from. Each line row already shows its own raw text, so the reviewer can see the source. Highlighting is a nicety for long messages, not a change to whether the reviewer can do the job.

**Accessibility.** Beyond what the browser gives for free with buttons, labels, and inputs, I did not do accessibility work. The queue and the candidate choices are lists of buttons and are keyboard operable, but focus management, live regions for the async states, and a screen reader pass are all undone. That is a proper pass, not a half one.
