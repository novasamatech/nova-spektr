export const addDelegationUtils = {
  isDefaultImage,
};

function isDefaultImage(image: string | undefined) {
  return !image || image.includes('default');
}
