import {useI18n} from "@renderer/context/I18nContext";

const History = () => {
  const { t } = useI18n();

  return <div>{t("history.title")}</div>;
};

export default History;
