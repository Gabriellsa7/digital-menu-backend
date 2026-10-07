import { BusinessRuleError } from '../errors/business-rule.error';

export function assertCompleteOrder(
  orderedIds: string[],
  currentIds: string[],
): void {
  const ordered = new Set(orderedIds);
  const isComplete =
    ordered.size === orderedIds.length &&
    ordered.size === currentIds.length &&
    currentIds.every((id) => ordered.has(id));
  if (!isComplete) {
    throw new BusinessRuleError(
      'The new order must list every item exactly once',
      'INVALID_ORDER',
    );
  }
}
