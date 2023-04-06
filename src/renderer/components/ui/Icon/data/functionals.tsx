import CopyImg, { ReactComponent as CopySvg } from '@images/functionals/copy.svg';
import QrImg, { ReactComponent as QrSvg } from '@images/functionals/qr.svg';
import QrLineImg, { ReactComponent as QrLineSvg } from '@images/functionals/qr-line.svg';
import QrSimpleImg, { ReactComponent as QrSimpleSvg } from '@images/functionals/qr-simple.svg';
import QrCutoutImg, { ReactComponent as QrCutoutSvg } from '@images/functionals/qr-cutout.svg';
import CloseCutoutImg, { ReactComponent as CloseCutoutSvg } from '@images/functionals/close-cutout.svg';
import CloseImg, { ReactComponent as CloseSvg } from '@images/functionals/close.svg';
import CheckCutoutImg, { ReactComponent as CheckCutoutSvg } from '@images/functionals/checkmark-cutout.svg';
import CheckImg, { ReactComponent as CheckSvg } from '@images/functionals/checkmark.svg';
import CheckLineImg, { ReactComponent as CheckLineSvg } from '@images/functionals/checkmark-line.svg';
import WarnCutoutImg, { ReactComponent as WarnCutoutSvg } from '@images/functionals/warning-cutout.svg';
import DisableCutoutImg, { ReactComponent as DisableCutoutSvg } from '@images/functionals/disable-cutout.svg';
import DisableImg, { ReactComponent as DisableSvg } from '@images/functionals/disable.svg';
import RemoveCutoutImg, { ReactComponent as RemoveCutoutSvg } from '@images/functionals/remove-cutout.svg';
import RemoveLineImg, { ReactComponent as RemoveLineSvg } from '@images/functionals/remove-line.svg';
import RemoveImg, { ReactComponent as RemoveSvg } from '@images/functionals/remove.svg';
import EmptyIdenticonImg, { ReactComponent as EmptyIdenticonSvg } from '@images/functionals/empty-identicon.svg';
import SearchImg, { ReactComponent as SearchSvg } from '@images/functionals/search.svg';
import NetworkDuotoneImg, { ReactComponent as NetworkDuotoneSvg } from '@images/functionals/network-duotone.svg';
import NetworkOnImg, { ReactComponent as NetworkOnSvg } from '@images/functionals/network-on.svg';
import NetworkOffImg, { ReactComponent as NetworkOffSvg } from '@images/functionals/network-off.svg';
import NetworkImg, { ReactComponent as NetworkSvg } from '@images/functionals/network.svg';
import AddImg, { ReactComponent as AddSvg } from '@images/functionals/add.svg';
import AddLineImg, { ReactComponent as AddLineSvg } from '@images/functionals/add-line.svg';
import AddCutoutImg, { ReactComponent as AddCutoutSvg } from '@images/functionals/add-cutout.svg';
import ClearOutlineImg, { ReactComponent as ClearOutlineSvg } from '@images/functionals/clear-outline.svg';
import EditOutlineImg, { ReactComponent as EditOutlineSvg } from '@images/functionals/edit-outline.svg';
import DeleteOutlineImg, { ReactComponent as DeleteOutlineSvg } from '@images/functionals/delete-outline.svg';
import OptionsImg, { ReactComponent as OptionsSvg } from '@images/functionals/options.svg';
import MultisigOutlineImg, { ReactComponent as MultisigOutlineSvg } from '@images/functionals/multisig-outline.svg';
import EyeSlashedImg, { ReactComponent as EyeSlashedSvg } from '@images/functionals/eye-slashed.svg';
import EyeImg, { ReactComponent as EyeSvg } from '@images/functionals/eye.svg';

const FunctionalImages = {
  copy: { svg: CopySvg, img: CopyImg },
  qr: { svg: QrSvg, img: QrImg },
  qrLine: { svg: QrLineSvg, img: QrLineImg },
  qrSimple: { svg: QrSimpleSvg, img: QrSimpleImg },
  qrCutout: { svg: QrCutoutSvg, img: QrCutoutImg },
  closeCutout: { svg: CloseCutoutSvg, img: CloseCutoutImg },
  close: { svg: CloseSvg, img: CloseImg },
  checkmarkCutout: { svg: CheckCutoutSvg, img: CheckCutoutImg },
  checkmark: { svg: CheckSvg, img: CheckImg },
  checkmarkLine: { svg: CheckLineSvg, img: CheckLineImg },
  warnCutout: { svg: WarnCutoutSvg, img: WarnCutoutImg },
  disableCutout: { svg: DisableCutoutSvg, img: DisableCutoutImg },
  disable: { svg: DisableSvg, img: DisableImg },
  removeCutout: { svg: RemoveCutoutSvg, img: RemoveCutoutImg },
  removeLine: { svg: RemoveLineSvg, img: RemoveLineImg },
  remove: { svg: RemoveSvg, img: RemoveImg },
  emptyIdenticon: { svg: EmptyIdenticonSvg, img: EmptyIdenticonImg },
  search: { svg: SearchSvg, img: SearchImg },
  networkDuotone: { svg: NetworkDuotoneSvg, img: NetworkDuotoneImg },
  networkOn: { svg: NetworkOnSvg, img: NetworkOnImg },
  networkOff: { svg: NetworkOffSvg, img: NetworkOffImg },
  network: { svg: NetworkSvg, img: NetworkImg },
  add: { svg: AddSvg, img: AddImg },
  addLine: { svg: AddLineSvg, img: AddLineImg },
  addCutout: { svg: AddCutoutSvg, img: AddCutoutImg },
  clearOutline: { svg: ClearOutlineSvg, img: ClearOutlineImg },
  editOutline: { svg: EditOutlineSvg, img: EditOutlineImg },
  deleteOutline: { svg: DeleteOutlineSvg, img: DeleteOutlineImg },
  options: { svg: OptionsSvg, img: OptionsImg },
  multisigOutline: { svg: MultisigOutlineSvg, img: MultisigOutlineImg },
  eyeSlashed: { svg: EyeSlashedSvg, img: EyeSlashedImg },
  eye: { svg: EyeSvg, img: EyeImg },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
