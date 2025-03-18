// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Filter eligible cart lines (product must have metafield data)
  const eligibleLines = input.cart.lines.filter(
    (line) => line.merchandise.product.metafield != null
  );

  if (!eligibleLines.length) {
    console.error("No cart lines qualify for volume discount.");
    return EMPTY_DISCOUNT;
  }

  const discounts = eligibleLines.map((line) => {
    const tiers = line.merchandise.product.metafield.jsonValue;

    if (!Array.isArray(tiers)) {
      console.warn(`Invalid metafield format for product ${line.merchandise.product.id}`);
      return null;
    }

    // Sort tiers by quantity in ascending order
    tiers.sort((a, b) => a.quantity - b.quantity);

    // Find the highest applicable discount
    const applicableTier = tiers.reverse().find(tier => line.quantity >= tier.quantity);

    if (!applicableTier) {
      console.warn(`No discount applicable for product ${line.merchandise.product.id}`);
      return null;
    }

    return {
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: applicableTier.discount.toString() } },
      message: applicableTier.message || `Discount applied: ${applicableTier.discount}%`
    };
  }).filter(Boolean);

  return {
    discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
