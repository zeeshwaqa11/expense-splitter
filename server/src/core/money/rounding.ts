export function allocateByLargestRemainder(
  totalCents: number,
  weights: Record<string, number>,
): Record<string, number> {
  const ids = Object.keys(weights);
  const sumWeights = ids.reduce((sum, id) => sum + weights[id]!, 0);

  if (sumWeights <= 0) {
    throw new Error('Sum of weights must be positive');
  }

  const amounts: Record<string, number> = {};
  const remainders: { id: string; remainder: number }[] = [];
  let allocated = 0;

  for (const id of ids) {
    const exact = (totalCents * weights[id]!) / sumWeights;
    const floor = Math.floor(exact);
    amounts[id] = floor;
    allocated += floor;
    remainders.push({ id, remainder: exact - floor });
  }

  let remaining = totalCents - allocated;

  remainders.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (let i = 0; i < remainders.length && remaining > 0; i++) {
    const id = remainders[i]!.id;
    amounts[id]! += 1;
    remaining -= 1;
  }

  return amounts;
}
