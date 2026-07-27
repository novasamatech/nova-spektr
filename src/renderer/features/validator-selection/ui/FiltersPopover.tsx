import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAmount, nonNullable } from '@/shared/lib/utils';
import { Button, IconButton, Switch } from '@/shared/ui';
import { Field, Input, Popover } from '@/shared/ui-kit';
import { validatorSelectionModel } from '../model/validator-selection-model';

const { events } = validatorSelectionModel;

/**
 * Empty means "no bound", not zero - a filter the user cleared has to stop
 * narrowing rather than start demanding a minimum of nothing.
 */
function parseBound(value: string): number | null {
  if (value.trim().length === 0) return null;

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export const FiltersPopover = () => {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const filtersDiffer = useUnit(validatorSelectionModel.$filtersDiffer);

  return (
    <div className="relative flex shrink-0">
      <Popover dialog open={open} align="start" onToggle={setOpen}>
        <Popover.Trigger>
          <IconButton
            name="settingsLite"
            size={18}
            ariaLabel={t('staking.validatorSelection.filters.title')}
            className="border border-filter-border bg-input-background"
          />
        </Popover.Trigger>
        <Popover.Content>
          <FiltersForm onDone={() => setOpen(false)} />
        </Popover.Content>
      </Popover>

      {filtersDiffer ? (
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-icon-accent" />
      ) : null}
    </div>
  );
};

type FormProps = {
  onDone: () => void;
};

/**
 * Mounted only while the popover is open, so the text fields can hold what the
 * user is typing (`"0."` is a legal intermediate state no number can represent)
 * and still start from the stored filters every time it opens.
 */
const FiltersForm = ({ onDone }: FormProps) => {
  const { t } = useI18n();

  const { filters, asset } = useUnit({
    filters: validatorSelectionModel.$filters,
    asset: validatorSelectionModel.$asset,
  });

  const [minApy, setMinApy] = useState(() => (filters.minApy === null ? '' : String(filters.minApy)));
  const [maxCommission, setMaxCommission] = useState(() =>
    filters.maxCommission === null ? '' : String(filters.maxCommission),
  );
  const [minOwnStake, setMinOwnStake] = useState('');

  const anyPlaceholder = t('staking.validatorSelection.filters.anyPlaceholder');

  const handleMinApy = (value: string) => {
    setMinApy(value);
    events.filtersChanged({ minApy: parseBound(value) });
  };

  const handleMaxCommission = (value: string) => {
    setMaxCommission(value);
    events.filtersChanged({ maxCommission: parseBound(value) });
  };

  const handleMinOwnStake = (value: string) => {
    setMinOwnStake(value);

    if (value.trim().length === 0 || !nonNullable(asset)) {
      events.filtersChanged({ minOwnStake: null });

      return;
    }

    events.filtersChanged({ minOwnStake: formatAmount(value, asset.precision) });
  };

  return (
    <div className="flex w-72 flex-col gap-y-4 p-4">
      <Field text={t('staking.validatorSelection.filters.minApy')}>
        <Input width="full" inputMode="decimal" value={minApy} placeholder={anyPlaceholder} onChange={handleMinApy} />
      </Field>

      <Field text={t('staking.validatorSelection.filters.maxCommission')}>
        <Input
          width="full"
          inputMode="decimal"
          value={maxCommission}
          placeholder={anyPlaceholder}
          onChange={handleMaxCommission}
        />
      </Field>

      <Field text={t('staking.validatorSelection.filters.minOwnStake')}>
        <Input
          width="full"
          inputMode="decimal"
          value={minOwnStake}
          placeholder={anyPlaceholder}
          disabled={!nonNullable(asset)}
          suffixElement={
            nonNullable(asset) ? <span className="text-footnote text-text-tertiary">{asset.symbol}</span> : null
          }
          onChange={handleMinOwnStake}
        />
      </Field>

      <div className="flex flex-col gap-y-3">
        <Switch
          checked={filters.hideOversubscribed}
          onChange={(checked) => events.filtersChanged({ hideOversubscribed: checked })}
        >
          {t('staking.validatorSelection.filters.hideOversubscribed')}
        </Switch>
        <Switch checked={filters.hideIdle} onChange={(checked) => events.filtersChanged({ hideIdle: checked })}>
          {t('staking.validatorSelection.filters.hideIdle')}
        </Switch>
        <Switch checked={filters.hasIdentity} onChange={(checked) => events.filtersChanged({ hasIdentity: checked })}>
          {t('staking.validatorSelection.filters.hasIdentity')}
        </Switch>
        <Switch checked={filters.neverSlashed} onChange={(checked) => events.filtersChanged({ neverSlashed: checked })}>
          {t('staking.validatorSelection.filters.neverSlashed')}
        </Switch>
      </div>

      <Button className="w-full" size="sm" onClick={onDone}>
        {t('staking.validatorSelection.filters.done')}
      </Button>
    </div>
  );
};
