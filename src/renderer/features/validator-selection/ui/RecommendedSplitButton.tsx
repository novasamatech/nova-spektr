import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon, Switch } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { MAX_PER_CLUSTER } from '@/domains/staking';
import { validatorSelectionModel } from '../model/validator-selection-model';

const { events } = validatorSelectionModel;

/**
 * The main half applies the recommendation as it stands; the caret opens the
 * criteria behind it. They are one control because the criteria are only ever
 * interesting to someone about to accept - or reject - what they produced.
 */
export const RecommendedSplitButton = () => {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const signingMode = useUnit(validatorSelectionModel.$signingMode);

  const disabled = signingMode === 'watchOnly';

  return (
    <div className="flex shrink-0 items-center">
      <Button size="sm" className="rounded-e-none" disabled={disabled} onClick={() => events.fillWithRecommended()}>
        {t('staking.validatorSelection.criteria.fillWithRecommended')}
      </Button>

      <Popover dialog open={open} align="end" onToggle={setOpen}>
        <Popover.Trigger>
          <Button size="sm" className="rounded-s-none border-s border-white/20 px-2" disabled={disabled}>
            <Icon name="down" size={16} className="text-button-text" />
            <span className="visually-hidden">{t('staking.validatorSelection.criteria.title')}</span>
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <CriteriaForm onClose={() => setOpen(false)} />
        </Popover.Content>
      </Popover>
    </div>
  );
};

type FormProps = {
  onClose: () => void;
};

const CriteriaForm = ({ onClose }: FormProps) => {
  const { t } = useI18n();

  const { criteria, recommendedCount, maxNominations } = useUnit({
    criteria: validatorSelectionModel.$criteria,
    recommendedCount: validatorSelectionModel.$recommendedCount,
    maxNominations: validatorSelectionModel.$maxNominations,
  });

  return (
    <div className="flex w-80 flex-col gap-y-4 p-4">
      <FootnoteText className="text-text-tertiary">{t('staking.validatorSelection.criteria.scoredOn')}</FootnoteText>

      <div className="flex flex-col gap-y-3">
        <Switch
          checked={criteria.excludeSlashed}
          onChange={(checked) => events.criteriaChanged({ excludeSlashed: checked })}
        >
          {t('staking.validatorSelection.criteria.excludeSlashed')}
        </Switch>
        <Switch
          checked={criteria.requireIdentity}
          onChange={(checked) => events.criteriaChanged({ requireIdentity: checked })}
        >
          {t('staking.validatorSelection.criteria.requireIdentity')}
        </Switch>
        <Switch
          checked={criteria.limitClusters}
          onChange={(checked) => events.criteriaChanged({ limitClusters: checked })}
        >
          {t('staking.validatorSelection.criteria.limitClusters', { count: MAX_PER_CLUSTER })}
        </Switch>
      </div>

      <FootnoteText className="text-text-tertiary">
        {t('staking.validatorSelection.criteria.slotsNote', { count: recommendedCount, max: maxNominations })}
      </FootnoteText>

      <div className="flex gap-x-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            events.fillWithRecommended();
            onClose();
          }}
        >
          {t('staking.validatorSelection.criteria.fillWithThese')}
        </Button>
        <Button size="sm" variant="text" onClick={onClose}>
          {t('staking.validatorSelection.criteria.close')}
        </Button>
      </div>
    </div>
  );
};
