# Template provenance

Source: https://github.com/vstorm-co/full-stack-ai-agent-template
Commit: 3428d9a6214619d3514312886d59a36400747b7d
Generator: fastapi-fullstack 0.2.19

Generated with:

```sh
fastapi-fullstack create stayora_agent --output /private/tmp/stayora-generated --frontend none --ai-framework pydantic_ai --no-logfire --no-docker --no-env --ci none --auth-mode delegated --shared-secret-jwt
```

The generated assistant is preserved as `generated-assistant.py.txt` for provenance.
`app/agents/itinerary.py` specializes its Agent, OpenAIResponsesModel, RunContext,
dependency injection, and ask-user patterns. `utils.py` and `ask_user_tool.py` are
copied from the generated service and used by the live agent. The generated
PostgreSQL/auth/websocket application was intentionally reduced to a private
planning API: the existing Express application owns JWT auth, Mongo persistence,
trip approval and Stripe. No second database or user system is necessary.

This is a generated-and-adapted integration, not an unmodified full template deployment.
The upstream MIT notice is preserved in VSTORM-LICENSE.
