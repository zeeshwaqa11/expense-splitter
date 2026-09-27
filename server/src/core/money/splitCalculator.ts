import { ValidationError } from '../../utils/errors.js';
import { allocateByLargestRemainder } from './rounding.js';

export type SplitInput =
  | { splitType: 'EQUAL'; memberIds: string[] }
  | { splitType: 'EXACT'; amounts: Record<string, number> }
  | { splitType: 'PERCENTAGE'; percentages: Record<string, number> }
  | { splitType: 'SHARES'; shares: Record<string, number> };

export function calculateSplit(totalCents: number, input: SplitInput): Record<string, number> {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new ValidationError('Expense total must be a positive whole number of cents');
  }

  switch (input.splitType) {
    case 'EQUAL': {
      if (input.memberIds.length === 0) {
        throw new ValidationError('At least one member is required for an equal split');
      }
      const weights = Object.fromEntries(input.memberIds.map((id) => [id, 1]));
      return allocateByLargestRemainder(totalCents, weights);
    }

    case 'EXACT': {
      const ids = Object.keys(input.amounts);
      if (ids.length === 0) {
        throw new ValidationError('At least one split amount is required');
      }
      if (ids.some((id) => !Number.isInteger(input.amounts[id]) || input.amounts[id]! <= 0)) {
        throw new ValidationError('Exact split amounts must be positive whole cents');
      }
      const sum = ids.reduce((s, id) => s + input.amounts[id]!, 0);
      if (sum !== totalCents) {
        throw new ValidationError(
          `Exact split amounts (${sum}) must sum to the expense total (${totalCents})`,
        );
      }
      return { ...input.amounts };
    }

    case 'PERCENTAGE': {
      const ids = Object.keys(input.percentages);
      if (ids.length === 0) {
        throw new ValidationError('At least one percentage is required');
      }
      if (ids.some((id) => input.percentages[id]! <= 0)) {
        throw new ValidationError('Percentages must be positive');
      }
      const basisPoints: Record<string, number> = {};
      let sumBasisPoints = 0;
      for (const id of ids) {
        const bp = Math.round(input.percentages[id]! * 100);
        basisPoints[id] = bp;
        sumBasisPoints += bp;
      }
      if (sumBasisPoints !== 10000) {
        throw new ValidationError(`Percentages must sum to 100 (got ${sumBasisPoints / 100})`);
      }
      return allocateByLargestRemainder(totalCents, basisPoints);
    }

    case 'SHARES': {
      const ids = Object.keys(input.shares);
      if (ids.length === 0) {
        throw new ValidationError('At least one share is required');
      }
      if (ids.some((id) => !Number.isInteger(input.shares[id]) || input.shares[id]! <= 0)) {
        throw new ValidationError('Shares must be positive whole numbers');
      }
      return allocateByLargestRemainder(totalCents, input.shares);
    }
  }
}

export function validatePayers(totalCents: number, payerAmounts: Record<string, number>): void {
  const ids = Object.keys(payerAmounts);
  if (ids.length === 0) {
    throw new ValidationError('At least one payer is required');
  }
  if (ids.some((id) => !Number.isInteger(payerAmounts[id]) || payerAmounts[id]! <= 0)) {
    throw new ValidationError('Payer amounts must be positive whole cents');
  }
  const sum = ids.reduce((s, id) => s + payerAmounts[id]!, 0);
  if (sum !== totalCents) {
    throw new ValidationError(
      `Payer amounts (${sum}) must sum to the expense total (${totalCents})`,
    );
  }
}
