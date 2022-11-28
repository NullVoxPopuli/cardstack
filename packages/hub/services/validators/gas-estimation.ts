import Web3 from 'web3';
import { GasEstimationResultsScenarioEnum } from '@prisma/client';
import { startCase } from 'lodash';
import { inject } from '@cardstack/di';
import { GasEstimationParams } from '../gas-estimation';
import { isSupportedChain } from '@cardstack/cardpay-sdk';
const { isAddress } = Web3.utils;

type GasEstimationAttribute = 'scenario' | 'chainId' | 'tokenAddress' | 'gasTokenAddress';

type GasEstimationErrors = Record<GasEstimationAttribute, string[]>;

export default class GasEstimationValidator {
  cardpay = inject('cardpay');

  async validate(gasEstimationParams: Partial<GasEstimationParams>): Promise<GasEstimationErrors> {
    let errors: GasEstimationErrors = {
      scenario: [],
      chainId: [],
      tokenAddress: [],
      gasTokenAddress: [],
    };

    let mandatoryAttributes: GasEstimationAttribute[] = ['scenario', 'chainId'];

    for (let attribute of mandatoryAttributes) {
      if (gasEstimationParams[attribute] == null) {
        errors[attribute].push(`${startCase(attribute).toLowerCase()} is required`);
      }
    }

    if (
      gasEstimationParams.scenario &&
      !Object.values(GasEstimationResultsScenarioEnum).includes(gasEstimationParams.scenario)
    ) {
      errors.scenario.push(
        `scenario must be one of these values: ${Object.values(GasEstimationResultsScenarioEnum).join(',')}`
      );
    }

    if (
      gasEstimationParams.scenario === GasEstimationResultsScenarioEnum.execute_one_time_payment ||
      gasEstimationParams.scenario === GasEstimationResultsScenarioEnum.execute_recurring_payment
    ) {
      let executionMandatoryAttributes: GasEstimationAttribute[] = ['tokenAddress', 'gasTokenAddress'];
      for (let attribute of executionMandatoryAttributes) {
        if (gasEstimationParams[attribute] == null) {
          errors[attribute].push(`${startCase(attribute).toLowerCase()} is required in this scenario`);
        }
      }

      let addressAttributes: GasEstimationAttribute[] = ['tokenAddress', 'gasTokenAddress'];
      for (let attribute of addressAttributes) {
        if (gasEstimationParams[attribute] && !isAddress(gasEstimationParams[attribute] as string)) {
          errors[attribute].push(`${startCase(attribute).toLowerCase()} is not a valid address`);
        }
      }
    }

    if (gasEstimationParams.chainId && !isSupportedChain(gasEstimationParams.chainId)) {
      errors.chainId.push(`chain is not supported`);
    }

    return errors;
  }
}

declare module '@cardstack/di' {
  interface KnownServices {
    'gas-estimation-validator': GasEstimationValidator;
  }
}
