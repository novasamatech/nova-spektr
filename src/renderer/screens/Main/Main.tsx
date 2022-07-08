import { useI18n } from '@context/I18Context';

const Main = () => {
  const { t, onLocaleChange } = useI18n();

  return (
    <div className="flex gap-3">
      <span>Change language</span>
      <span data-testid="trans">Text - {t('header.test')}</span>
      <button className="bg-red-400 px-2" onClick={() => onLocaleChange('ru')}>
        RU
      </button>
      <button className="bg-red-400 px-2" onClick={() => onLocaleChange('en')}>
        EN
      </button>
    </div>
  );
};

export default Main;
