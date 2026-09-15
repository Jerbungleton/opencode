export * as IdentityPlugin from "./identity.js"

import { SystemPart } from "@opencode/ai"
import { define } from "@opencode/plugin/effect/plugin"
import type { SessionHooks } from "@opencode/plugin/effect/session"
import { Model } from "@opencode/schema/model"
import { Effect } from "effect"

// Display name for humans, catalog ref for the exact route.
export function identity(model: { readonly name: string; readonly ref: Model.Ref }) {
  return `You are powered by ${model.name} (${model.ref.providerID}/${model.ref.id}).`
}

export const Plugin = define({
  id: "opencode.prompt.identity",
  effect: Effect.fn("IdentityPlugin")(function* (ctx) {
    const hook = (event: SessionHooks["context"] | SessionHooks["title"]) =>
      Effect.gen(function* () {
        const model =
          (yield* ctx.model.list()).data.find(
            (model) => model.providerID === event.model.providerID && model.id === event.model.id,
          ) ?? Model.Info.default(event.model.providerID, event.model.id)
        // Insert after the agent prompt so family-prompt overrides of the first part preserve it.
        event.system.splice(1, 0, SystemPart.make(identity({ name: model.name, ref: event.model })))
      }).pipe(Effect.catch(() => Effect.void))
    yield* ctx.session.hook("context", hook)
    yield* ctx.session.hook("compaction", hook)
    yield* ctx.session.hook("generate", hook)
    yield* ctx.session.hook("title", hook)
  }),
})
