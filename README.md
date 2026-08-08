# AI property research with the Apify MCP server

This repository accompanies the article **How I turned two Apify Actors into an AI property research tool**. It demonstrates a real workflow in which an AI client uses the Apify MCP server to run one Actor for current property listings and another for recorded transactions, then retrieves only the fields needed for a cautious comparison.

The workflow is a research aid, not an automated property valuation. It explicitly checks for weak comparables, duplicate transactions, and missing fields before drawing conclusions.

- `ARTICLE.md` — article draft
- `SUBMISSION.md` — Discord pitch and remaining owner-provided assets
- `EVIDENCE.md` — reproducibility record from live MCP calls
- `mcp-client.mjs` — runnable Streamable HTTP verification client
- `images/` — four original figures used in the article

## Verify MCP tool discovery

```bash
export APIFY_TOKEN='replace-with-your-token'
node mcp-client.mjs tools/list
```

## Call an Actor through MCP

```bash
export APIFY_TOKEN='replace-with-your-token'
node mcp-client.mjs tools/call swerve--yad2-scraper \
  '{"city":"Raanana","dealType":"buy","maxItems":3,"enrichListings":false,"waitSecs":20}'
```

Never commit an Apify token. The client requires it at runtime.
