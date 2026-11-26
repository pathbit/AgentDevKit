export const stableVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function versionLessThan(left, right) {
  const leftParts = left.split('.').map(BigInt);
  const rightParts = right.split('.').map(BigInt);
  const firstDifference = leftParts.findIndex((part, index) => part !== rightParts[index]);
  return firstDifference !== -1 && leftParts[firstDifference] < rightParts[firstDifference];
}
