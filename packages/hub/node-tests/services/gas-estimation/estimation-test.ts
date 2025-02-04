import { GasEstimationResultsScenarioEnum } from '@prisma/client';
import { BigNumber } from 'ethers';
import { ContractOptions } from 'web3-eth-contract';
import GasEstimationService, { GasEstimationParams } from '../../../services/gas-estimation';
import { registry, setupHub } from '../../helpers/server';

let createSafeGas = 0;
let executionGas = 0;
let isReturnUndefinedSpModule = false;

class StubCardpaySDK {
  getSDK(sdk: string) {
    switch (sdk) {
      case 'ScheduledPaymentModule':
        return Promise.resolve({
          estimateExecutionGasWithNoAmount: async (
            _moduleAddress: string,
            _tokenAddress: string,
            _payeeAddress: string,
            _gasTokenAddress: string,
            _salt: string,
            _gasPrice: string,
            _payAt?: number | null,
            _recurringDayOfMonth?: number | null,
            _recurringUntil?: number | null
          ) => {
            return Promise.resolve(executionGas);
          },
          createSafeWithModuleAndGuardEstimation: async (_contractOptions?: ContractOptions) => {
            return Promise.resolve(BigNumber.from(createSafeGas));
          },
        });
      default:
        throw new Error(`unsupported mock cardpay sdk: ${sdk}`);
    }
  }

  async getSpModuleAddressBySafeAddress(_chainId: number, _safeAddress: string) {
    if (isReturnUndefinedSpModule) return undefined;
    return '0xC4A8d85a2cc87d3537a4c19EA175472a2C226D10';
  }
}

describe('estimate gas', function () {
  let subject: GasEstimationService;

  this.beforeEach(async function () {
    registry(this).register('cardpay', StubCardpaySDK);
  });

  let { getPrisma, getContainer } = setupHub(this);

  this.beforeEach(async function () {
    subject = (await getContainer().lookup('gas-estimation-service')) as GasEstimationService;
  });

  it('estimates gas for create a new safe scenario', async function () {
    createSafeGas = 7000000;
    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.create_safe_with_module,
      chainId: 5,
    };
    let gasEstimationResult = await subject.estimate(gasEstimationParams);

    expect(gasEstimationResult.scenario).to.equal(gasEstimationParams.scenario);
    expect(gasEstimationResult.chainId).to.equal(gasEstimationParams.chainId);
    expect(gasEstimationResult.gas).to.equal(createSafeGas);
    expect(gasEstimationResult.tokenAddress).to.equal('');
    expect(gasEstimationResult.gasTokenAddress).to.equal('');
  });

  it('estimates gas for execute scheduled one-time payment scenario', async function () {
    executionGas = 1000000;
    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_one_time_payment,
      chainId: 5,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      gasTokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    };
    let gasEstimationResult = await subject.estimate(gasEstimationParams);

    expect(gasEstimationResult.scenario).to.equal(gasEstimationParams.scenario);
    expect(gasEstimationResult.chainId).to.equal(gasEstimationParams.chainId);
    expect(gasEstimationResult.gas).to.equal(executionGas + 10000);
  });

  it('estimates gas for execute scheduled recurring payment scenario', async function () {
    executionGas = 1000000;
    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_recurring_payment,
      chainId: 5,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      gasTokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    };
    let gasEstimationResult = await subject.estimate(gasEstimationParams);

    expect(gasEstimationResult.scenario).to.equal(gasEstimationParams.scenario);
    expect(gasEstimationResult.chainId).to.equal(gasEstimationParams.chainId);
    expect(gasEstimationResult.gas).to.equal(executionGas + 10000);
  });

  it('retrieves gas from DB if gas exist in DB and still in valid TTL', async function () {
    createSafeGas = 8000000;
    executionGas = 1000000;
    let gasInDB = 5000000;

    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.create_safe_with_module,
      chainId: 5,
    };
    let prisma = await getPrisma();
    await prisma.gasEstimationResult.create({
      data: {
        scenario: gasEstimationParams.scenario,
        chainId: gasEstimationParams.chainId,
        gas: gasInDB,
      },
    });
    let gasEstimationResult = await subject.estimate(gasEstimationParams);

    expect(gasEstimationResult.gas).to.equal(gasInDB);
    expect(gasEstimationResult.gas).not.to.equal(createSafeGas);
    expect(gasEstimationResult.gas).not.to.equal(executionGas);
  });

  it('throws error if chain id is not supported', async function () {
    executionGas = 1000000;

    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_recurring_payment,
      chainId: 3,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    };
    await expect(subject.estimate(gasEstimationParams)).to.be.rejectedWith('Unsupported network: 3');
  });

  it('throws error if safe address is not exist in execution scenario', async function () {
    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_recurring_payment,
      chainId: 5,
      safeAddress: undefined,
    };
    await expect(subject.estimate(gasEstimationParams)).to.be.rejectedWith(
      `safeAddress is required in ${GasEstimationResultsScenarioEnum.execute_recurring_payment}`
    );
  });

  it('throws error if safe have not enabled sp module', async function () {
    isReturnUndefinedSpModule = true;

    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_recurring_payment,
      chainId: 5,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      gasTokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    };
    await expect(subject.estimate(gasEstimationParams)).to.be.rejectedWith(`cannot find SP module in this safe`);
  });

  it('throws error if tokenAddress and gasTokenAddress are undefined in execution scenario', async function () {
    executionGas = 1000000;

    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_one_time_payment,
      chainId: 5,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    };
    await expect(subject.estimate(gasEstimationParams)).to.be.rejectedWith(
      'tokenAddress and gasTokenAddress is required in execute_one_time_payment'
    );
  });

  it('throws error if tokenAddress and gasTokenAddress are blank string in execution scenario', async function () {
    executionGas = 1000000;

    let gasEstimationParams: GasEstimationParams = {
      scenario: GasEstimationResultsScenarioEnum.execute_recurring_payment,
      chainId: 5,
      safeAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenAddress: '',
      gasTokenAddress: '',
    };
    await expect(subject.estimate(gasEstimationParams)).to.be.rejectedWith(
      'tokenAddress and gasTokenAddress is required in execute_recurring_payment'
    );
  });
});
