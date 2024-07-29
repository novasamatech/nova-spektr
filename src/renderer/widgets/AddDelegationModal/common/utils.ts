export const addDelegationUtils = {
  isDefaultImage,
};

function isDefaultImage(image: string) {
  return image.includes('default');
}
