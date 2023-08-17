import { Icon, FootnoteText, Plate, BodyText, StatusMark, HelpText } from '@renderer/shared/ui';
import { useI18n, useMatrix } from '@renderer/app/providers';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MatrixModal } from '@renderer/components/modals';
import { cnTw } from '@renderer/shared/lib/utils';

export const MatrixAction = () => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();
  const [isModalOpen, toggleModalOpen] = useToggle();

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <FootnoteText className="text-text-tertiary">{t('settings.overview.smpLabel')}</FootnoteText>

        <Plate className="p-0">
          <button
            className={cnTw(
              'w-full grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md',
              'transition hover:shadow-card-shadow focus:shadow-card-shadow',
            )}
            onClick={toggleModalOpen}
          >
            <Icon className="row-span-2" name="matrix" size={32} />
            <BodyText>{t('settings.overview.matrixLabel')}</BodyText>
            <HelpText className="text-text-tertiary">{t('settings.overview.matrixDescription')}</HelpText>

            {isLoggedIn ? (
              <StatusMark
                className="row-span-2"
                variant="success"
                title={matrix.userId || ''}
                subtitle={
                  matrix.sessionIsVerified
                    ? t('settings.overview.matrixStatusVerified')
                    : t('settings.overview.matrixStatusNotVerified')
                }
              />
            ) : (
              <StatusMark className="row-span-2" title={t('settings.overview.matrixStatusLogin')} variant="waiting" />
            )}
          </button>
        </Plate>
      </div>

      <MatrixModal isOpen={isModalOpen} onClose={toggleModalOpen} />
    </>
  );
};
