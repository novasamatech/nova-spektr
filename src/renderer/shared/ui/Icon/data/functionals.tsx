/* eslint-disable import-x/max-dependencies */

import AddCircleIcon from '@/shared/assets/images/functionals/add-circle.svg?jsx';
import AddIcon from '@/shared/assets/images/functionals/add.svg?jsx';
import ApproveFellowshipVotingIcon from '@/shared/assets/images/functionals/approve-fellowship-voting.svg?jsx';
import CheckCutoutIcon from '@/shared/assets/images/functionals/checkmark-cutout.svg?jsx';
import CheckmarkOutlineIcon from '@/shared/assets/images/functionals/checkmark-outline.svg?jsx';
import CheckIcon from '@/shared/assets/images/functionals/checkmark.svg?jsx';
import CloseOutlineIcon from '@/shared/assets/images/functionals/close-outline.svg?jsx';
import CloseIcon from '@/shared/assets/images/functionals/close.svg?jsx';
import CopyIcon from '@/shared/assets/images/functionals/copy.svg?jsx';
import CurrencyIcon from '@/shared/assets/images/functionals/currency.svg?jsx';
import DeleteIcon from '@/shared/assets/images/functionals/delete.svg?jsx';
import DetailsIcon from '@/shared/assets/images/functionals/details.svg?jsx';
import EditKeysIcon from '@/shared/assets/images/functionals/edit-keys.svg?jsx';
import EditIcon from '@/shared/assets/images/functionals/edit.svg?jsx';
import EmptyIdenticonIcon from '@/shared/assets/images/functionals/empty-identicon.svg?jsx';
import ExportIcon from '@/shared/assets/images/functionals/export.svg?jsx';
import EyeSlashedIcon from '@/shared/assets/images/functionals/eye-slashed.svg?jsx';
import EyeIcon from '@/shared/assets/images/functionals/eye.svg?jsx';
import ForgetIcon from '@/shared/assets/images/functionals/forget.svg?jsx';
import ImportIcon from '@/shared/assets/images/functionals/import.svg?jsx';
import LinkIcon from '@/shared/assets/images/functionals/link.svg?jsx';
import LockIcon from '@/shared/assets/images/functionals/lock.svg?jsx';
import MagicIcon from '@/shared/assets/images/functionals/magic.svg?jsx';
import MinusCircleIcon from '@/shared/assets/images/functionals/minus-circle.svg?jsx';
import MoreIcon from '@/shared/assets/images/functionals/more.svg?jsx';
import MultisigOutlineIcon from '@/shared/assets/images/functionals/multisig-outline.svg?jsx';
import OpenGovDelegationsIcon from '@/shared/assets/images/functionals/opengov-delegations.svg?jsx';
import OpenGovLockIcon from '@/shared/assets/images/functionals/opengov-lock.svg?jsx';
import OpenGovVotingLockIcon from '@/shared/assets/images/functionals/opengov-voting-lock.svg?jsx';
import PromoteVotingIcon from '@/shared/assets/images/functionals/promote-voting.svg?jsx';
import QuestionIcon from '@/shared/assets/images/functionals/question.svg?jsx';
import ReferendumIcon from '@/shared/assets/images/functionals/referendum.svg?jsx';
import RefreshIcon from '@/shared/assets/images/functionals/refresh.svg?jsx';
import RenameIcon from '@/shared/assets/images/functionals/rename.svg?jsx';
import RetainVotingIcon from '@/shared/assets/images/functionals/retain-voting.svg?jsx';
import RFCVotingIcon from '@/shared/assets/images/functionals/rfc-voting.svg?jsx';
import SearchIcon from '@/shared/assets/images/functionals/search.svg?jsx';
import SettingsLiteIcon from '@/shared/assets/images/functionals/settings-lite.svg?jsx';
import ThumbDownIcon from '@/shared/assets/images/functionals/thumb-down.svg?jsx';
import ThumbUpIcon from '@/shared/assets/images/functionals/thumb-up.svg?jsx';
import UpdateIcon from '@/shared/assets/images/functionals/update.svg?jsx';
import UploadFileIcon from '@/shared/assets/images/functionals/upload-file.svg?jsx';
import ViewValidatorsIcon from '@/shared/assets/images/functionals/view-validators.svg?jsx';
import VotedIcon from '@/shared/assets/images/functionals/voted.svg?jsx';
import WarnCutoutIcon from '@/shared/assets/images/functionals/warning-cutout.svg?jsx';
import WhitelistVotingIcon from '@/shared/assets/images/functionals/whitelist-voting.svg?jsx';

const FunctionalImages = {
  copy: { svg: CopyIcon },
  close: { svg: CloseIcon },
  checkmarkCutout: { svg: CheckCutoutIcon },
  checkmark: { svg: CheckIcon },
  currency: { svg: CurrencyIcon },
  referendum: { svg: ReferendumIcon },
  warnCutout: { svg: WarnCutoutIcon },
  emptyIdenticon: { svg: EmptyIdenticonIcon },
  search: { svg: SearchIcon },
  add: { svg: AddIcon },
  addCircle: { svg: AddCircleIcon },
  edit: { svg: EditIcon },
  delete: { svg: DeleteIcon },
  multisigOutline: { svg: MultisigOutlineIcon },
  eyeSlashed: { svg: EyeSlashedIcon },
  eye: { svg: EyeIcon },
  checkmarkOutline: { svg: CheckmarkOutlineIcon },
  closeOutline: { svg: CloseOutlineIcon },
  refresh: { svg: RefreshIcon },
  settingsLite: { svg: SettingsLiteIcon },
  viewValidators: { svg: ViewValidatorsIcon },
  link: { svg: LinkIcon },
  lock: { svg: LockIcon },
  magic: { svg: MagicIcon },
  questionOutline: { svg: QuestionIcon },
  uploadFile: { svg: UploadFileIcon },
  import: { svg: ImportIcon },
  export: { svg: ExportIcon },
  editKeys: { svg: EditKeysIcon },
  more: { svg: MoreIcon },
  rename: { svg: RenameIcon },
  forget: { svg: ForgetIcon },
  update: { svg: UpdateIcon },
  opengovLock: { svg: OpenGovLockIcon },
  opengovVotingLock: { svg: OpenGovVotingLockIcon },
  opengovDelegations: { svg: OpenGovDelegationsIcon },
  voted: { svg: VotedIcon },
  thumbUp: { svg: ThumbUpIcon },
  thumbDown: { svg: ThumbDownIcon },
  minusCircle: { svg: MinusCircleIcon },
  details: { svg: DetailsIcon },
  whitelistVoting: { svg: WhitelistVotingIcon },
  rfcVoting: { svg: RFCVotingIcon },
  promoteVoting: { svg: PromoteVotingIcon },
  retainVoting: { svg: RetainVotingIcon },
  approveFellowshipVoting: { svg: ApproveFellowshipVotingIcon },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
