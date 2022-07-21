import CurrencyImages, { Currency } from './currency';
import NavigationImages, { Navigation } from './navigation';
import ChevronImages, { Chevron } from './chevron';
import FunctionalImages, { Functional } from './functionals';

const AllIcons = {
  ...CurrencyImages,
  ...NavigationImages,
  ...ChevronImages,
  ...FunctionalImages,
};

export type IconNames = Currency | Navigation | Chevron | Functional;

export default AllIcons;
