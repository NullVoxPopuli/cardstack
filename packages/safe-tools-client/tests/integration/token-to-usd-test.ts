/* eslint-disable @typescript-eslint/no-empty-function */
import { ChainAddress } from '@cardstack/cardpay-sdk';
import TokenToUsdService from '@cardstack/safe-tools-client/services/token-to-usd';
import { render, TestContext, waitUntil } from '@ember/test-helpers';
import { addMilliseconds } from 'date-fns';
import { task } from 'ember-concurrency';
import { setupRenderingTest } from 'ember-qunit';
import { FixedNumber } from 'ethers';
import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

let returnUndefinedConversionRate = false;

class TokenToUsdServiceStub extends TokenToUsdService {
  // eslint-disable-next-line require-yield
  @task({ maxConcurrency: 1, enqueue: true }) *updateUsdcRate(
    tokenAddress: ChainAddress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    if (returnUndefinedConversionRate) {
      this.usdcTokenRates.delete(tokenAddress);
    } else {
      this.usdcTokenRates.set(tokenAddress, FixedNumber.from(1000));
    }
  }
}

module('Integration | Component | token-to-usd', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: TestContext) {
    this.owner.register('service:token-to-usd', TokenToUsdServiceStub);
  });

  hooks.afterEach(function () {
    returnUndefinedConversionRate = false;
  });

  test('It converts token amount to usd', async function (assert) {
    await render(hbs`
      <TokenToUsd @tokenAddress='0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' @tokenAmount='2000000000000000000' @tokenDecimals=18 />
    `);
    await waitUntil(
      () => {
        return (
          this.element.textContent &&
          this.element.textContent?.trim() !== '' &&
          !this.element.textContent?.trim().includes('Converting')
        );
      },
      { timeout: 5000 }
    );
    assert.strictEqual(this.element.textContent?.trim(), '$ 2000 USD');
  });

  test('It returns blank string if usd converter is undefined', async function (assert) {
    returnUndefinedConversionRate = true;
    await render(hbs`
      <TokenToUsd @tokenAddress='0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' @tokenAmount='2000000000000000000' @tokenDecimals=18 />
    `);
    const now = new Date();
    await waitUntil(
      () => {
        return (
          (this.element.textContent &&
            this.element.textContent?.trim() !== '' &&
            !this.element.textContent?.trim().includes('Converting')) ||
          addMilliseconds(now, 4500) < new Date() // Return true if almost timeout
        );
      },
      { timeout: 5000 }
    );
    assert.strictEqual(
      this.element.textContent?.trim(),
      'Converting to USD...'
    );
  });
});
