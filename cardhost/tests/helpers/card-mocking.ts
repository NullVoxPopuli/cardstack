import { Server } from 'miragejs/server';
import { CompiledCard, RawCard } from '@cardstack/core/src/interfaces';
import type { TestContext } from 'ember-test-helpers';
import { RAW_BASE_CARDS } from '@cardstack/core/src/raw-base-cards';
import { encodeCardURL } from '@cardstack/core/src/utils';
declare module 'ember-test-helpers' {
  interface TestContext {
    server: Server;
    createCard: typeof createCard;
    lookupCard: typeof lookupCard;
  }
}

// NOTE: Mirage must be setup before this. ie:
//    setupMirage(hooks);
//    setupCardMocking(hooks);
export default function setupCardMocking(hooks: NestedHooks): void {
  hooks.beforeEach(function () {
    this.createCard = createCard.bind(this);
    this.lookupCard = lookupCard.bind(this);

    RAW_BASE_CARDS.forEach((card) => this.createCard(card));
  });

  hooks.afterEach(function () {});
}

function createCard(this: TestContext, card: RawCard): unknown {
  return this.server.create('card', { id: encodeCardURL(card.url), raw: card });
}

function lookupCard(this: TestContext, id: string): Promise<CompiledCard> {
  let { schema } = this.server as any;
  let response = schema.cards.find(id);
  if (!response) {
    throw Error(`Could not find card '${id}'. Did you make it?`);
  }
  return response.attrs.raw;
}
